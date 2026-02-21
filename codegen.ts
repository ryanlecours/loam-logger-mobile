import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // Use local schema file from the API package (avoids need for running server with introspection)
  schema: "../loam-logger/apps/api/src/graphql/schema.ts",
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
