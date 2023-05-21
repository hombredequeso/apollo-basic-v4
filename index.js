import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { RESTDataSource } from '@apollo/datasource-rest';

import DataLoader from 'dataloader';


// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    id: String
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book!]!
    book(id: String): Book
  }
`;

const books = [
  {
    id: '123',
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    id: '456',
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];


class BooksAPI extends RESTDataSource {
  baseURL = 'http://localhost:3000/';

  // Create a data loader, which can aggregate requests for multiple id's and perform a single query.
  loader = new DataLoader(async (ids) => {
    // pretend that we send the id's here as a parameter, ?ids=123,456 (but my fake api doens't work)
    // But this is where the actual request(s) are made:
    const bookList = await this.get('bookIds');     
    var result = ids.map((id) => bookList.find((book) => book.id === id));
    // console.log(JSON.stringify(result));
    return result;
  });

  async getBook(id) {
    console.log(`getBook(${id})`);
    // Go via the loader...
    return this.loader.load(id);
  }

  async getAllBooks(ids) {
    // Go via the loader...
    return this.loader.loadMany(ids);
  }

  // async getBooks() {
  //   return this.get('books');
  // }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const resolvers = {
  Query: {
    // books: (parent, args, {dataSources}) => dataSources.booksAPI.getBooks(),
    books: (parent, args, {dataSources}) => {
      console.log(`> query.books`)
      var allBooksIds = ['123', '456'];
      var result =  dataSources.booksAPI.getAllBooks(allBooksIds).then(books => [books[0]]);
      console.log(`< query.books`)
      return result;
      // [{id: '123'}, {id: '456'}],
    },
    book: (parent, {id}, {dataSources}) => {id},
  },
  Book: {
    title: async ({id}, args, {dataSources}, info) => {
      console.log(`> book.title: ${id}`)
      // const book = await sleep((id === '123')? 1000: 100).then(() => dataSources.booksAPI.getBook(id));
      const book = await dataSources.booksAPI.getBook(id);
      console.log(`< book.title: ${id}`)


      // console.log({book});
      return book.title;
      // dataSources.booksAPI.getBook(id).title;
    },
    author: async ({id}, args, {dataSources}, info) => {
      console.log(`> book.author: ${id}`)
      const book = await dataSources.booksAPI.getBook(id);
      // const book = await sleep((id === '123')? 1000: 100).then(() => dataSources.booksAPI.getBook(id));
      // const book = await sleep(1000).then(() => dataSources.booksAPI.getBook(id));
      console.log(`< book.author: ${id}`)
      return book.author;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async () => {
     const { cache } = server;
    return {
      dataSources: {
        booksAPI: new BooksAPI({ cache }),
      },
    };
  },
});

console.log(`🚀  Server ready at ${url}`);
