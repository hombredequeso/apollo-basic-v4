Getting started with apollo server v4.
Initially created following [Getting started with Apollo Server](https://www.apollographql.com/docs/apollo-server/getting-started/)

# Getting Started (with Getting Started :-) )

```
npm install
npm start
```

Requires a book api to be running. See mock-crud-api.

```
yarn start ./.data/books.json
```


Making a request to the graph:

```
curl --request POST \
    --header 'content-type: application/json' \
    --url http://localhost:4000/ \
    --data '{"query":"query ExampleQuery {\n  books(ids: [\"123\", \"999\", \"456\"]) {\n    id\n    title\n    author\n  }\n  book(id: \"999\") {\n    id\n    title\n  }\n  book2:  book(id: \"456\") {\n    id\n    title\n  }\n}"}'
```
