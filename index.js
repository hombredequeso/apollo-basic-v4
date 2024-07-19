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
    id: String!
    title: String
    authorName: String
    authorId: String!
    authorDetails: Author
  }

  type Author {
    id: String!
    name: String!
  }

  type Candidate {
    bk: Book!
    au: Author!
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books(ids: [String!]!): [Book!]!
    book(id: String): Book
    author(id: String): Author
    viewer: Candidate
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
    // Where the actual request(s) are made:
    const url = `book?ids=${ids.join(',')}`;
    const bookList = await this.get(url);     
    var result = ids.map((id) => bookList.find((book) => book?.id === id));
    // result MUST be in same order and indexes as ids.
    return result;
  });

  async getBook(id) {
    console.log(`getBook(${id})`);
    // Go via the loader...
    return this.loader.load(id);
  }

  async getBooks(ids) {
    console.log(`getBooks(${ids})`);
    // Go via the loader...
    return this.loader.loadMany(ids);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const resolvers = {
  Query: {
    author: async (parent, {id}, {dataSources}) => {
      // if author does not exist return null, otherwise return something else.
      console.log(`> query.author`);
      // hit the api here and find out if the author exists...
      return {id: id};
      // return null;
    },
    books: async (parent, {ids}, {dataSources}) => {
      console.log(`> query.books`)
      var booksFromApi =  await dataSources.booksAPI.getBooks(ids);
      var bookIds = booksFromApi.filter(x => x !== undefined ).map(x => ({id: x.id}));
      return bookIds;
    },
    book: async (parent, {id}, {dataSources}) => {
      // book is nullable, because the book with id may not exist. So getBook, to determine if it exists:
      // var booksResolverResult =  await sleep(1000).then(() => dataSources.booksAPI.getBook(id));
      var booksResolverResult =  await dataSources.booksAPI.getBook(id);
      return (booksResolverResult === undefined)? null: {id};
    },
    viewer: () => {
      console.log(`> query.viewer`)
      return {};
    }

  },
  Candidate: {
    bk: (parent, args, {dataSources}, info) => {
      console.log(`> bk`)
      return books[0];
      // return null;
    },
    au: (parent, args, {dataSources}, info) => {
      console.log(`> au`)
      return null;
      // return {
      //   id: 'hacked-123',
      //   name: 'Mark woz here'
      // };
    },
  },
  Author: {
    id: (parent, args, {dataSources}, info) => {
      console.log(`> author.id`)
      // pretend to do api requests
      // ?????
      return parent.id;

      // const authorIdToGet = parent.authorIdFromQuery
      // return `author-id-999`
    },
    name: (parent, args, {dataSources}, info) => {
      console.log(`> author.name`)
      // const authorIdToGet = parent.authorIdFromQuery
      // pretend to do api requests
      //


      if (parent.id === 'author-2') {
        throw {error: "something went wrong"};
      }

      return `Name, Author # ${parent.id}`
    },
  },
  Book: {
    title: async ({id}, args, {dataSources}, info) => {
      console.log(`> book.title: ${id}`)
      // const book = await sleep((id === '123')? 1000: 100).then(() => dataSources.booksAPI.getBook(id));
      const book = await dataSources.booksAPI.getBook(id);
      console.log(`< book.title: ${id}`)
      return book.title;
    },
    authorName: async ({id}, args, {dataSources}, info) => {
      console.log(`> book.author: ${id}`)
      const book = await dataSources.booksAPI.getBook(id);
      // const book = await sleep(5000).then(() => dataSources.booksAPI.getBook(id));
      console.log(`< book.author: ${id}`)
      return book.author;
    },
    authorId: async ({id}, args, {dataSources}, info) => {
      console.log(`> book.authorId: ${id}`)
      const book = await dataSources.booksAPI.getBook(id);
      // const book = await sleep(5000).then(() => dataSources.booksAPI.getBook(id));
      console.log(`< book.authorId: ${id}`)
      return book.authorId;
    },
    authorDetails: async({id}, args, cxt, info) => {
      console.log(`> book.authorDetails: ${id}`)
      const book = await cxt.dataSources.booksAPI.getBook(id);
      console.log(`< book.authorDetails: ${id}`)
      return {id: book.authorId};
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
