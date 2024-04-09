import { pathsToModuleNameMapper } from "ts-jest";
import tsconfig from "./tsconfig.json" assert { type: "json" };

process.env.NODE_APP_INSTANCE = 'tests';

const { compilerOptions } = tsconfig;

export default {
  verbose: true,
  preset: "ts-jest/presets/default-esm",
  collectCoverage: true,
  coverageDirectory: "output/coverage",
  moduleFileExtensions: ["js",  "json", "ts", "d.ts"],
  testRegex: '.+\.test\.ts$',
  reporters: ["default"],
  modulePaths: [compilerOptions.baseUrl],
  modulePathIgnorePatterns: ["<rootDir>/scripts/test.ts"],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { useESM: true }),
  testTimeout: 60000,
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  // watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};