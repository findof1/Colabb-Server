import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import cors from "cors";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
} from "graphql";
import dotenv from "dotenv";
import mondodb, { ObjectId } from "mongodb";
import UserType from "./Types/UserType.js";
import CompanyType from "./Types/CompanyType.js";
dotenv.config();
const app = express();
app.use(cors());

const client = new mondodb.MongoClient(process.env.COLABB_DB_URI);

await client.connect();
let connectionWithUser = await client
  .db(process.env.COLABB_NS)
  .collection(process.env.COLLECTION);
let connectionWithCompanies = await client
  .db(process.env.COLABB_NS)
  .collection(process.env.COLLECTION2);
const port = process.env.PORT || 8000;
app.listen(port);
await connectionWithCompanies.createIndex({ code: 1 }, { unique: true });

export const connectionWithCompaniesExport = connectionWithCompanies;
export const connectionWithUserExport = connectionWithUser;
export const clientExport = client;

const RootMutationType = new GraphQLObjectType({
  name: "mutation",
  description: "Root Mutation",
  fields: () => ({
    addUser: {
      type: UserType,
      description: "Add User",
      args: {
        password: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const res = await connectionWithUser.insertOne({
          password: pass,
          email: email,
        });
        return res;
      },
    },
    addCompany: {
      type: CompanyType,
      description: "Add Company",
      args: {
        code: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        adminUser: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        const res = await connectionWithCompanies.insertOne({
          code: args.code,
          name: args.name,
          adminUser: args.adminUser,
        });
        return res;
      },
    },
    joinCompany: {
      type: CompanyType,
      description: "Add user to a company",
      args: {
        code: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const res = await connectionWithCompanies.updateOne(
          { code: args.code },
          { $push: { users: args.id } }
        );
        return res;
      },
    },
  }),
});

const RootQueryType = new GraphQLObjectType({
  name: "query",
  description: "Root Query",
  fields: () => ({
    getUser: {
      type: UserType,
      description: "One user",
      args: {
        password: { type: GraphQLString },
        email: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        let user = await connectionWithUser.find({
          password: args.password,
          email: args.email,
        });
        user = await user.toArray();
        return user[0];
      },
    },

    company: {
      type: CompanyType,
      description: "One company",
      args: {
        _id: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        let objId = new ObjectId(args._id);
        let company = await connectionWithCompanies.find({
          _id: objId,
        });
        company = await company.toArray();
        console.log(company);
        return company[0];
      },
    },
  }),
});

const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType,
});

app.all("/graphql", createHandler({ schema }));
