import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "dist",
        "node_modules",
        "temp",
        "output",
        "temp",
        "log",
        "**/Jenkinsfile",
        "**/package.json",
        "**/package-lock.json",
        "**/yarn.lock",
        "**/README.md",
        "**/license",
        "**/*.map",
        "**/*.yaml",
        "**/*.hbs",
        "**/*.txt",
        "**/*.js",
        "**/*.mjs",
        "src/run.js",
    ],
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "commonjs",

        parserOptions: {
            project: ["./tsconfig.json"],
            es6: true,
        },
    },

    rules: {
        "prettier/prettier": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-ternary": "off",

        "@typescript-eslint/restrict-template-expressions": ["off", {
            allowAny: true,
        }],

        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/unbound-method": "off",

        "@typescript-eslint/ban-types": ["off", {
            types: {
                "{}": true,
            },

            extendDefaults: true,
        }],

        "no-async-promise-executor": "off",
    },
}];