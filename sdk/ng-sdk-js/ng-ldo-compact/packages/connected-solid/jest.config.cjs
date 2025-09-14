/* eslint-disable @typescript-eslint/no-var-requires */
// packages/connected-solid/jest.config.cjs
const sharedConfig = require("../../jest.esm.config.js");

module.exports = {
  ...sharedConfig,
  rootDir: "./",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};
