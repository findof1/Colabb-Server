import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
} from "graphql";
import { connectionWithCompaniesExport } from "../server.js";
import CompanyType from "./CompanyType.js";

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
        const id = parent._id.toString();
        const companies = await connectionWithCompaniesExport
          .find({ "users.id": id })
          .toArray();
        return companies;
      },
    },
  }),
});

export default UserType;
