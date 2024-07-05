Getting started with apollo server v4.
Initially created following [Getting started with Apollo Server](https://www.apollographql.com/docs/apollo-server/getting-started/)

# Getting Started (with Getting Started :-) )

To run up the api and have it restart whenever files are edited:
```
npm install
npm run start:dev
```



Requires a book api to be running. See mock-crud-api.

```
yarn start ./.data/books.json
```

```
docker run --rm -t -i -p 3000:3000 -v ./data:/data mock-crud-api:latest '/data/books.json'
```

Test with:
```
curl http://localhost:3000/book/123
```



Making a request to the graph:

```
curl --request POST \
 --header 'content-type: application/json' \
 --url http://localhost:4000/ \
 --data '{"query":"query ExampleQuery { books(ids: [\"123\", \"999\", \"456\"]) { id title author } book(id: \"999\") { id title } book2: book(id: \"456\") { id title }}"}'
```
