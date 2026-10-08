// Minimal emulation of the wb-rules environment: virtual timers, rules, dev[], log, publish, shell
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

function createEnv(options) {
    options = options || {};
    let now = 0;
    let nextId = 0;
    const timers = new Map();
    const rules = {};
    const logs = [];
    const published = [];
    const shellCommands = [];
    const devValues = Object.assign({}, options.dev);
    const storages = {};
    const pendingWrites = [];

    const log = (...args) => logs.push({ level: "info", args });
    log.debug = (...args) => logs.push({ level: "debug", args });
    log.info = log;
    log.warning = (...args) => logs.push({ level: "warning", args });
    log.error = (...args) => logs.push({ level: "error", args });

    const sandbox = {
        log,
        setTimeout: (f, ms) => { timers.set(++nextId, { f, at: now + ms }); return nextId; },
        setInterval: (f, ms) => { timers.set(++nextId, { f, at: now + ms, every: ms }); return nextId; },
        clearTimeout: (id) => { timers.delete(id); },
        clearInterval: (id) => { timers.delete(id); },
        defineRule: (name, rule) => {
            if (rules[name]) throw new Error("rule '" + name + "' is already defined");
            rules[name] = rule;
        },
        defineVirtualDevice: (name, def) => {
            Object.keys(def.cells).forEach((cell) => { devValues[name + "/" + cell] = def.cells[cell].value; });
        },
        cron: (spec) => ({ cron: spec }),
        publish: (topic, payload, qos, retain) => published.push({ topic, payload, qos, retain }),
        runShellCommand: (command, opts) => shellCommands.push({ command, opts }),
        PersistentStorage: function (name) { return (storages[name] = storages[name] || {}); },
        // With options.deferWrites a write is seen only after flushDev(), like a real device that
        // confirms a new value over MQTT later; otherwise it is seen at once, like a virtual device
        dev: new Proxy(devValues, {
            set: (target, key, value) => {
                if (options.deferWrites) pendingWrites.push([key, value]); else target[key] = value;
                return true;
            },
        }),
        exports: {},
    };
    sandbox.require = (name) => loadModule(name);
    vm.createContext(sandbox);

    // Same as in wb-rules: a module gets its own scope and exports object
    const moduleCache = {};
    function loadModule(name) {
        if (!moduleCache[name]) {
            const exports = {};
            const wrapper = vm.runInContext(
                "(function (exports) {\n" + readScript("wb-rules-modules/" + name + ".js") + "\n})", sandbox);
            wrapper(exports);
            moduleCache[name] = exports;
        }
        return moduleCache[name];
    }

    // Runs due timers; an exception in a callback is logged like wb-rules does, not thrown
    function advance(ms) {
        const end = now + ms;
        for (;;) {
            let dueId = null;
            let due = null;
            for (const [id, timer] of timers) {
                if (timer.at <= end && (!due || timer.at < due.at)) { dueId = id; due = timer; }
            }
            if (!due) break;
            now = due.at;
            if (due.every) due.at += due.every; else timers.delete(dueId);
            try { due.f(); } catch (e) { logs.push({ level: "engine", args: [String(e)] }); }
        }
        now = end;
    }

    return {
        sandbox, rules, logs, published, shellCommands, timers, storages, dev: devValues, advance,
        require: loadModule,
        flushDev: () => { pendingWrites.splice(0).forEach(([key, value]) => { devValues[key] = value; }); },
        runScript: (file) => vm.runInContext(readScript(file), sandbox),
        logsOf: (level) => logs.filter((l) => l.level === level),
    };
}

function readScript(file) {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
}

module.exports = { createEnv, readScript };
