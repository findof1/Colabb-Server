import express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
} from "graphql";
import dotenv from "dotenv";
import mondodb, { ObjectId } from "mongodb";
dotenv.config();
const app = express();

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

const UserType = new GraphQLObjectType({
  name: "user",
  description: "This represents a user",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
    companies: {
      type: new GraphQLList(CompanyType),
      resolve: async (parent, args) => {
        const companyIds = parent.companies;
        const companies = await connectionWithCompanies.find({
          _id: { $in: companyIds.map(id => new ObjectId(id)) }
        }).toArray();
        return companies;
      }
    },
  }),
});

const CompanyType = new GraphQLObjectType({
  name: "company",
  description: "This represents a company",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    users: {
      type: new GraphQLList(UserType),
      resolve: async (parent, args) => {
        const userIds = parent.users;
        const users = await connectionWithUser.find({
          _id: { $in: userIds.map(id => new ObjectId(id)) }
        }).toArray();
        console.log(users)
        return users;
      }
    },
  }),
});

const RootMutationType = new GraphQLObjectType({
  name: "mutation",
  description: "Root Mutation",
  fields: () => ({
    addUser: {
      type: UserType,
      description: "Add User",
      args: {
        password: { type: GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args) => {
        const res = await connectionWithUser.insertOne({password:pass, email:email});
        return res
      },
    },
    addCompany: {
      type: CompanyType,
      description: "Add Company",
      args: {
        code: { type: GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLNonNull(GraphQLString) },
        adminUser: {type: GraphQLString}
      },
      resolve: async (parent, args) => {
        const res = await connectionWithCompanies.insertOne({code:args.code, name:args.name, adminUser:args.adminUser});
        return res
      },
    },
    joinCompany: {
      type: CompanyType,
      description: "Add user to a company",
      args: {
        code: { type: GraphQLNonNull(GraphQLString) },
        id: { type: GraphQLNonNull(GraphQLString) },
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
    user: {
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
