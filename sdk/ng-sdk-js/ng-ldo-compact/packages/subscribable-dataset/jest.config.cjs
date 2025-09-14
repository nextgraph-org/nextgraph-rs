/* eslint-disable @typescript-eslint/no-var-requires */
// packages/dataset/jest.config.cjs
const sharedConfig = require("../../jest.config.js");

module.exports = {
  ...sharedConfig,
  rootDir: "./", // Sets context for this package
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    // "!src/index.ts", // Optional, if index.ts only re-exports
  ],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
