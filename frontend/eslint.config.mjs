import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import * as espree from "espree";

export default defineConfig([
    ...next,
    {
        files: ["**/*.mjs"],
        languageOptions: {
            // Next's Babel ESLint parser returns a scope manager without ESLint 10's `addGlobals`
            parser: espree,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
    },
    {
        settings: {
            react: {
                // eslint-plugin-react is not yet compatible with ESLint 10's RuleContext when using "detect"
                version: "19.2",
            },
        },
    },
    {
        rules: {
            // @preact/signals-react uses intentional `.value` writes; this rule targets React Compiler semantics
            "react-hooks/immutability": "off",
        },
    },
]);
