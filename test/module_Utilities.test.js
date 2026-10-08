"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { createEnv } = require("./wb-rules-env");

function discover(...args) {
    const env = createEnv();
    const result = env.require("module_Utilities").Utilities.mqttDiscovery(...args);
    return { env, result };
}

test("switch: publishes a retained discovery config for Home Assistant", () => {
    const { env, result } = discover("wb-mr6c_33", "K1", "switch", "Masha's room");
    assert.strictEqual(result, true);

    const config = env.published.find((p) => p.topic === "homeassistant/switch/wb-mr6c_33_K1/config");
    assert.ok(config, "config published");
    assert.strictEqual(config.retain, true);

    const entity = JSON.parse(config.payload);
    assert.strictEqual(entity["~"], "/devices/wb-mr6c_33/controls");
    assert.strictEqual(entity.unique_id, "wb-mr6c_33_K1");
    assert.strictEqual(entity.state_topic, "~/K1");
    assert.strictEqual(entity.command_topic, "~/K1/on");
    assert.strictEqual(entity.availability_topic, "~/K1/meta/error");
    assert.deepStrictEqual(entity.device.identifiers, ["wb-mr6c_33"]);
    assert.strictEqual(entity.device.suggested_area, "Masha's room", "quotes are passed as is");
});

test("switch: seeds the availability topic as 'no error'", () => {
    const { env } = discover("wb-mr6c_33", "K1", "switch");
    const seed = env.published.find((p) => p.topic === "/devices/wb-mr6c_33/controls/K1/meta/error");
    assert.deepStrictEqual(seed, { topic: "/devices/wb-mr6c_33/controls/K1/meta/error", payload: "0", qos: 1, retain: true });
});

test("unsupported types publish nothing and return false", () => {
    for (const type of ["light", "cover", "sensor", "unknown", undefined]) {
        const { env, result } = discover("dev", "ctrl", type);
        assert.strictEqual(result, false);
        assert.deepStrictEqual(env.published, []);
        assert.strictEqual(env.logsOf("warning").length, 1);
    }
});

test("toCapitals", () => {
    const { Utilities } = createEnv().require("module_Utilities");
    assert.strictEqual(Utilities.toCapitals("fix this string"), "Fix This String");
    assert.strictEqual(Utilities.toCapitals("javaSCrIPT", true), "Javascript");
});
