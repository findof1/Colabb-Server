import { GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList } from "graphql";
import { connectionWithUserExport } from '../server.js'
import UserType from "./UserType.js";
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
        const users = await connectionWithUserExport.find({
          _id: { $in: userIds.map(id => new ObjectId(id)) }
        }).toArray();
        console.log(users)
        return users;
      }
    },
  }),
});

export default CompanyType