"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { createEnv } = require("./wb-rules-env");

const ALL = ["singlePress", "doublePress", "triplePress", "longPress", "longRelease"];

// Registers a button with recording actions and returns helpers to press it
function setupButton(actionNames, ...timings) {
    const env = createEnv();
    const calls = [];
    const action = {};
    for (const name of actionNames) {
        action[name] = { func: (...args) => calls.push(args.length ? name + ":" + args.join(",") : name), prop: [] };
    }
    const ruleName = env.require("module_ActionButtons").ActionButtons.onButtonPress("wb-gpio/IN1", action, ...timings);
    const rule = env.rules[ruleName];
    const press = () => rule.then(true);
    const release = () => rule.then(false);
    const click = () => { press(); env.advance(50); release(); env.advance(50); };
    return { env, calls, action, ruleName, press, release, click };
}

test("single, double and triple press", () => {
    for (const [clicks, expected] of [[1, "singlePress"], [2, "doublePress"], [3, "triplePress"]]) {
        const b = setupButton(ALL);
        for (let i = 0; i < clicks; i++) b.click();
        b.env.advance(400);
        assert.deepStrictEqual(b.calls, [expected]);
        assert.strictEqual(b.env.timers.size, 0, "no timers left");
    }
});

test("more clicks than configured do nothing", () => {
    const b = setupButton(ALL);
    for (let i = 0; i < 4; i++) b.click();
    b.env.advance(400);
    assert.deepStrictEqual(b.calls, []);
});

test("clicks slower than timeToNextPress are separate single presses", () => {
    const b = setupButton(ALL);
    b.click();
    b.env.advance(400);
    b.click();
    b.env.advance(400);
    assert.deepStrictEqual(b.calls, ["singlePress", "singlePress"]);
});

test("long press repeats until release when longRelease is defined", () => {
    const b = setupButton(ALL);
    b.press();
    b.env.advance(1250);
    b.release();
    b.env.advance(1000);
    assert.deepStrictEqual(b.calls, ["longPress", "longPress", "longPress", "longRelease"]);
    assert.strictEqual(b.env.timers.size, 0);
});

test("long press runs once when longRelease is not defined", () => {
    const b = setupButton(["singlePress", "longPress"]);
    b.press();
    b.env.advance(2000);
    b.release();
    b.env.advance(1000);
    assert.deepStrictEqual(b.calls, ["longPress"]);
});

test("click then hold is a long press", () => {
    const b = setupButton(ALL);
    b.click();
    b.press();
    b.env.advance(1100);
    b.release();
    b.env.advance(500);
    assert.deepStrictEqual(b.calls, ["longPress", "longPress", "longRelease"]);
});

test("prop is passed to the action", () => {
    const env = createEnv();
    let got;
    const name = env.require("module_ActionButtons").ActionButtons.onButtonPress("a/b",
        { singlePress: { func: (x, y) => { got = [x, y]; }, prop: ["wb-mr6c_1", "K1"] } });
    env.rules[name].then(true);
    env.rules[name].then(false);
    env.advance(400);
    assert.deepStrictEqual(got, ["wb-mr6c_1", "K1"]);
});

test("a failing action is logged and does not turn the next single press into a double", () => {
    const b = setupButton(ALL);
    let failures = 0;
    b.action.singlePress.func = () => { failures++; throw new Error("boom"); };
    b.click();
    b.env.advance(400);
    b.click();
    b.env.advance(400);
    assert.strictEqual(failures, 2);
    assert.strictEqual(b.env.logsOf("error").length, 2);
});

test("a failing longPress stops repeating", () => {
    const b = setupButton(ALL);
    let calls = 0;
    b.action.longPress.func = () => { if (++calls > 2) throw new Error("boom"); };
    b.press();
    b.env.advance(5000);
    assert.strictEqual(calls, 3);
    assert.strictEqual(b.env.timers.size, 0);
});

test("lost release after long press: longRelease on next press, then clicks work again", () => {
    const b = setupButton(ALL);
    b.press();
    b.env.advance(1050);
    // release event lost
    b.click();
    b.env.advance(400);
    assert.deepStrictEqual(b.calls, ["longPress", "longRelease", "singlePress"]);
    assert.strictEqual(b.env.timers.size, 0);
    assert.strictEqual(b.env.logsOf("warning").length, 1);
});

test("release without press (rules restarted while held) is ignored", () => {
    const b = setupButton(ALL);
    b.release();
    b.env.advance(2000);
    assert.deepStrictEqual(b.calls, []);
});

test("custom timings, numeric strings accepted, invalid ones fall back to defaults", () => {
    const b = setupButton(["longPress"], "300", 800);
    b.press();
    b.env.advance(850);
    assert.deepStrictEqual(b.calls, ["longPress"]);

    const d = setupButton(["longPress"], -1, "abc");
    d.press();
    d.env.advance(900);
    assert.deepStrictEqual(d.calls, []);
    d.env.advance(200);
    assert.deepStrictEqual(d.calls, ["longPress"]);
});

test("invalid arguments define no rule", () => {
    const env = createEnv();
    const { ActionButtons } = env.require("module_ActionButtons");
    const ok = { singlePress: { func() {} } };
    assert.strictEqual(ActionButtons.onButtonPress("no-slash", ok), null);
    assert.strictEqual(ActionButtons.onButtonPress("a/b", null), null);
    assert.strictEqual(ActionButtons.onButtonPress("a/b", { singlepress: { func() {} } }), null);
    assert.strictEqual(ActionButtons.onButtonPress("a/b", ok), "on_button_press_a_b");
    assert.strictEqual(ActionButtons.onButtonPress("a/b", ok), null, "duplicate rule");
    assert.deepStrictEqual(Object.keys(env.rules), ["on_button_press_a_b"]);
});
