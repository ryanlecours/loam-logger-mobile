import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // Use the local schema file from the API package (avoids a running server
  // with introspection). GRAPHQL_SCHEMA_PATH overrides the sibling-checkout
  // default, for worktrees that do not sit beside the API repo.
  schema: process.env.GRAPHQL_SCHEMA_PATH || "../loam-logger/apps/api/src/graphql/schema.ts",
  documents: ["src/graphql/**/*.graphql"],
  generates: {
    "src/graphql/generated.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
      },
    },
  },
};

export default config;
