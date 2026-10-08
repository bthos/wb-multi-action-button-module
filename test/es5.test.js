// wb-rules runs on Duktape (ES5): make sure no ES6+ syntax or built-ins slip into the scripts
"use strict";
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert");
const { readScript } = require("./wb-rules-env");

// Every script that goes to the controller
const SCRIPTS = ["wb-rules-modules", "wb-rules"].flatMap((dir) =>
    fs.readdirSync(path.join(__dirname, "..", dir)).filter((f) => f.endsWith(".js")).map((f) => dir + "/" + f));

const ES6_SYNTAX = /\b(let|const|class)\s|=>|`|\.\.\.[A-Za-z_[]/;

// ES6+ built-ins that older Duktape versions lack
const ES6_BUILTINS = new RegExp("\\.(" + [
    "includes", "startsWith", "endsWith", "repeat", "padStart", "padEnd", "trimStart", "trimEnd",
    "find", "findIndex", "fill", "flat", "flatMap", "copyWithin", "entries", "values",
].join("|") + ")\\(|\\b(" + [
    "Object\\.(assign|entries|values|fromEntries|is)", "Array\\.(from|of)",
    "Number\\.(isInteger|isNaN|isFinite|parseFloat|parseInt)", "Math\\.(trunc|sign|log10|log2|hypot|cbrt)",
    "Promise", "Symbol", "Proxy", "Reflect", "WeakMap", "WeakSet", "new (Map|Set)",
].join("|") + ")\\b");

function stripComments(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
}

for (const file of SCRIPTS) {
    test(file + " uses ES5 only", () => {
        const code = stripComments(readScript(file));
        assert.doesNotMatch(code, ES6_SYNTAX, "ES6+ syntax");
        assert.doesNotMatch(code, ES6_BUILTINS, "ES6+ built-in");
    });
}

test("the ES5 check catches ES6 code", () => {
    for (const sample of ['trigger.includes("/")', "Object.assign({}, a)", "[1].find(f)", "let a = 1", "f(x => x)"]) {
        assert.ok(ES6_SYNTAX.test(sample) || ES6_BUILTINS.test(sample), sample);
    }
    for (const sample of ['s.indexOf("/")', "Object.keys(a)", "[1].forEach(f)", "var a = 1", "isFinite(n)"]) {
        assert.ok(!ES6_SYNTAX.test(sample) && !ES6_BUILTINS.test(sample), sample);
    }
});
