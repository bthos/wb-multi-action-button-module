"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { createEnv } = require("./wb-rules-env");

function loadRules(options) {
    const env = createEnv(options);
    env.runScript("wb-rules/rules_Buttons.js");
    return env;
}

// Both a real device (new value is seen after the device confirms it) and a virtual one
for (const deferWrites of [true, false]) {
    test("switchRelay: auto mode follows the relay (" + (deferWrites ? "real" : "virtual") + " device)", () => {
        const env = loadRules({ deferWrites, dev: { "wb-mr6c_33/K2": false, "wb-mr6c_33/K2_auto_off": false } });
        env.sandbox.switchRelay("wb-mr6c_33", "K2", "_auto_off");
        env.flushDev();
        assert.strictEqual(env.dev["wb-mr6c_33/K2"], true);
        assert.strictEqual(env.dev["wb-mr6c_33/K2_auto_off"], true);

        env.sandbox.switchRelay("wb-mr6c_33", "K2", "_auto_off");
        env.flushDev();
        assert.strictEqual(env.dev["wb-mr6c_33/K2"], false);
        assert.strictEqual(env.dev["wb-mr6c_33/K2_auto_off"], false);
    });
}

test("switchRelay without suffix toggles only the relay", () => {
    const env = loadRules({ dev: { "wb-mr6c_33/K1": true } });
    env.sandbox.switchRelay("wb-mr6c_33", "K1");
    assert.strictEqual(env.dev["wb-mr6c_33/K1"], false);
    assert.strictEqual(env.dev["wb-mr6c_33/K1undefined"], undefined);
});

test("switchDimmerRGB toggles between black and the last colour", () => {
    const env = loadRules({ dev: { "wb-mrgbw-d_2/RGB": "10;20;30" } });
    const toggle = () => env.sandbox.switchDimmerRGB("wb-mr6c_33", "K5", "wb-mrgbw-d_2");

    toggle();
    assert.strictEqual(env.dev["wb-mr6c_33/K5"], true, "power relay on");
    assert.strictEqual(env.dev["wb-mrgbw-d_2/RGB"], "0;0;0");
    toggle();
    assert.strictEqual(env.dev["wb-mrgbw-d_2/RGB"], "10;20;30");
    assert.strictEqual(env.dev["wb-mr6c_33/RGB"], undefined, "relay board is not used as colour storage");
});

test("switchDimmerRGB falls back to white when no colour is remembered", () => {
    const env = loadRules({ dev: { "wb-mrgbw-d_2/RGB": "0;0;0" } });
    env.sandbox.switchDimmerRGB("wb-mr6c_33", "K5", "wb-mrgbw-d_2");
    assert.strictEqual(env.dev["wb-mrgbw-d_2/RGB"], "255;255;255");
});

test("setRandomRGB sets a valid colour that switchDimmerRGB restores", () => {
    const env = loadRules();
    for (const brightness of [undefined, 0, 5]) {
        env.sandbox.setRandomRGB("wb-mr6c_33", "K5", "wb-mrgbw-d_2", brightness);
        const color = env.dev["wb-mrgbw-d_2/RGB"];
        const channels = color.split(";").map(Number);
        assert.strictEqual(channels.length, 3);
        channels.forEach((c) => assert.ok(Number.isInteger(c) && c >= 0 && c <= 255, color));
        if (brightness === 5) channels.forEach((c) => assert.ok(c >= 127, color));
    }
    const color = env.dev["wb-mrgbw-d_2/RGB"];
    env.sandbox.switchDimmerRGB("wb-mr6c_33", "K5", "wb-mrgbw-d_2");
    env.sandbox.switchDimmerRGB("wb-mr6c_33", "K5", "wb-mrgbw-d_2");
    assert.strictEqual(env.dev["wb-mrgbw-d_2/RGB"], color);
});

test("buttons are registered", () => {
    const env = loadRules();
    assert.deepStrictEqual(Object.keys(env.rules).sort(), ["on_button_press_wb-gpio_EXT1_IN1", "on_button_press_wb-gpio_EXT1_IN2"]);
});
