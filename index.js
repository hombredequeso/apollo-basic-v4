import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { RESTDataSource } from '@apollo/datasource-rest';

import DataLoader from 'dataloader';

import {parse, visit, print} from 'graphql';
import {exec} from 'node:child_process';
import fs from 'node:fs';




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
    biblioEntry(fmt: String): BiblioEntry
  }

  type BiblioEntry {
    id: String!
    entry: String
  }

  type Author {
    id: String!
    name: String!
  }

  type Candidate {
    bk: Book!
    au: Author!
  }

  interface Experiment {
    id: String
    # json: JSON
  }

  type ExperimentWithNumberParameter implements Experiment {
    id: String
    # json: JSON
    numberParam: Int
  }

  type ExperimentWithNumberParameter implements Experiment {
    id: String
    # json: JSON
    booleanParam: Boolean
  }


  type ExperimentWithStandardParameters implements Experiment {
    id: String
    # json: JSON

    knownParamName: String
    # others here.
  }

  interface Entity {
    id: String
    displayName: String
  }

  type Thing1 implements Entity {
    id: String
    displayName: String
    thing1Name: String
  }
  type Thing2 implements Entity {
    id: String
    displayName: String
    thing2Name: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    version: String
    books(ids: [String!]!): [Book!]!
    book(id: String): Book
    book2(id: String, other: String): Book
    book3(other: String): Book
    author(id: String): Author
    viewer: Candidate
    entities: [Entity]
    experiments(context: String): [Experiment]
    aa: String
    bb: String!

    b1: Book!
    b2: Book!
  }

  type Mutation {
    createBook(id: ID!): Book!
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

const entities = [
  {
    id: '111',
    displayName: 'thing1:111',
    thing1Name: 'thing1Name'
  },
  {
    id: '222',
    displayName: 'thing2:222',
    thing2Name: 'thing2Name'
  }
]

const experiments = [
  {
    id: 'exp1',
    numberParam: 123,
    __typeName: 'ExperimentWithNumberParameter',
    context: 'Android'
  },
  {
    id: 'expx',
    knownParamName: 'anotherValue',
    __typeName: 'ExperimentWithStandardParameters',
    context: 'Android'
  },
  {
    id: 'exp2',
    knownParamName: 'somevalue',
    __typeName: 'ExperimentWithStandardParameters',
    context: 'FunkyTown'
  }
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
  Mutation: {
    createBook: (parent, {id}, {dataSources}) => {
      return {
        id: id,
        title: "created book",
        authorName: "createAuthorName",
        authorId: "createAuthorId"
      };
    }
  },
  Query: {
    version: () => '0.1.2.3',
    b1: async (_parent,_params,{dataSources}) => {
      var booksResolverResult =  await dataSources.booksAPI.getBook('123');
      return (booksResolverResult === undefined)? null: {id:'123'};
    },
    b2: async (_parent,_params,{dataSources}) => {
      return null;
      // var booksResolverResult =  await dataSources.booksAPI.getBook('456');
      // return (booksResolverResult === undefined)? null: {id: '456'};
    },
    aa: () => "aaa",
    bb: () => { throw "something went wrong"; },
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
    book2: async (parent, {id, other}, {dataSources}) => {
      var booksResolverResult =  await dataSources.booksAPI.getBook(id);
      return (booksResolverResult === undefined)? null: {id};
    },
    book3: async (parent, {other}, {dataSources}) => {
      var booksResolverResult =  await dataSources.booksAPI.getBook('123');
      return (booksResolverResult === undefined)? null: {id: '123'};
    },
    viewer: () => {
      console.log(`> query.viewer`)
      return {};
    },
    entities: () => entities,
    experiments: (parent, {context}) =>  {
      if (context) return experiments.filter(x => x.context === context);
      return experiments;

      const allLDresult = ldService.getExperiments(context);

    }
  },
  Entity: {
    __resolveType(entity, context, info) {
      if (entity.thing1Name !== undefined) {
        return 'Thing1';
      }
      if (entity.thing2Name !== undefined) {
        return 'Thing2';
      }
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
    },
    biblioEntry: async({id}, {fmt}, cxt, info) => {
      console.log(`> book.biblioEntry: ${id}`)
      const book = await cxt.dataSources.booksAPI.getBook(id);
      console.log(`< book.biblioEntry: ${fmt}`)
      return {id: id, entry: `Formatted as ${fmt}`}
    },
  },
  Experiment: {
    __resolveType: (obj, context, info) => {

      let standardParams = getStandardParams(obj);

      if (standardParams) {

      }


      return obj.__typeName;
    }
  }
};

const visitor =   {
    Field: {
      enter(node) {
        if (node?.name?.kind === 'Name') {
          console.log(`enter: ${node.name.value}`);
        }
      },
      leave(node) {
        if (node?.name?.kind === 'Name') {
          console.log(`leave: ${node.name.value}`);
        }
      }
    }
  };

const getPaths = (result, paths) => ({
    Field: {
      enter(node) {
        if (node?.name?.kind === 'Name') {
          paths.push(node.name.value);
          // console.log(`enter: ${node.name.value}`);
        }
      },
      leave(node) {
        if (node?.name?.kind === 'Name') {
          const elems = paths.slice(-2);
          result.push(elems);
          console.log(`${elems[0]} -> ${elems[1]}`);
          paths.pop();
          // console.log(`leave: ${node.name.value}`);
        }
      }
    }
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    // {
    //     async requestDidStart(x) {
    //       if (x?.request?.operationName === 'IntrospectionQuery') return;

    //       const query = x.request?.query;
    //       if (!query) return;
    //       const parsedQuery = parse(query);
    //       console.log(JSON.stringify(parsedQuery, null, 2));

    //       console.log('---');
    //       const s = print(parsedQuery)
    //       console.log(s);
    //       console.log('---');


    //       visit(parsedQuery, visitor);


    //       const result = []
    //       visit(parsedQuery, getPaths(result, ['query']));

    //       const graphPaths = result.map(x => `  "${x[0]}" -> "${x[1]}"`).join('\n');
    //       const graphContent = `digraph testGraph {\n${graphPaths}\n}`;
    //       fs.writeFile('./.query-graph.txt', graphContent, err => {
    //         if (err) {
    //           console.error(err);
    //         } else {
    //           console.log(`wrote .query-graph.txt file containing digraph of the query`)
    //           // file written successfully
    //         }
    //       });

    //       exec(`cat ./.query-graph.txt | dot -Tpng > ./.query-graph.png| open ./.query-graph.png`);
    //     }
    //   }, 
    {
        async willSendResponse(x) {
          console.log('---willSendResponse');
          console.log(`willSendResponse: ${JSON.stringify(x)}`);
          console.log('---willSendResponse');
        }
      }
  ]
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
