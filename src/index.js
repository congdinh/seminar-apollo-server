require("dotenv").config();
import http from "http";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";

import { ApolloServer, gql, withFilter } from "apollo-server-express";
import pubsub from "./pubsub";

const PORT = parseInt(process.env.PORT, 10) || 9005;
const playground = (process.env.APOLLO_PLAYGROUND === "true" && true) || false;
const introspection =
  (process.env.APOLLO_INTROSPECTION === "true" && true) || false;
const debug = (process.env.APOLLO_DEBUG === "true" && true) || false;

const whitelist = process.env.SERVER_REQUEST_WHITE_LIST;
const corsEnabled = process.env.SERVER_CORS_ENABLED;
const path = process.env.APOLLO_PATH || "/graphql";

const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
  }
  type Subscription {
    timePublish: String
  }
`;

const books = [
  {
    title: "Harry Potter and the Chamber of Secrets",
    author: "J.K. Rowling"
  },
  {
    title: "Jurassic Park",
    author: "Michael Crichton"
  }
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    books: (_, input, ctx) => books
  },
   Subscription: {
    timePublish: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => {
        return pubsub.asyncIterator("TIME_PUBLISH")
      },
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection,
  playground,
  debug,
   subscriptions: {
    path
   }
});

let app = express();

let corsOptions = {
  origin: function(origin, callback) {
    console.log("whitelist: ", whitelist);
    if (!origin) console.log("origin: ", origin);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed access!"));
    }
  }
};

if (corsEnabled !== "true") {
  corsOptions = {};
}

app.use(cors(corsOptions));

// error handler
app.use((err, req, res, next) => {
  // render the error page
  res.status(err.status || 500);
  res.json({ message: "Not allowed access!" });
});

server.applyMiddleware({ app, path, cors: false });

// The `listen` method launches a web server.
// app.listen(PORT, () => {
//   console.log(`🚀  Server ready at ${PORT}`);
// });


  const httpServer = http.createServer(app);
  server.installSubscriptionHandlers(httpServer);

  // The `listen` method launches a web server.
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`
    );
  });