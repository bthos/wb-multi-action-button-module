// wb-rules runs on Duktape (ES5): make sure no ES6+ syntax slips into the scripts
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { readScript } = require("./wb-rules-env");

const SCRIPTS = [
    "wb-rules-modules/module_ActionButtons.js",
    "wb-rules-modules/module_Utilities.js",
    "wb-rules/rules_Buttons.js",
    "wb-rules/virtual_Weather.js",
];

for (const file of SCRIPTS) {
    test(file + " uses ES5 syntax only", () => {
        const code = readScript(file).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
        assert.doesNotMatch(code, /\b(let|const|class)\s|=>|`|\.\.\.[A-Za-z_[]/);
    });
}
