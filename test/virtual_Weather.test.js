"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { createEnv } = require("./wb-rules-env");

const RESPONSE = {
    dt: 1700000000,
    weather: [{ description: "light rain", icon: "10d" }],
    main: { temp: 3.5, feels_like: 1.2, temp_min: 2, temp_max: 4.1, pressure: 1012, humidity: 87 },
    wind: { speed: 4.6, deg: 90 },
    clouds: { all: 75 },
    sys: { sunrise: 1699940000, sunset: 1699975000 },
};

function loadWeather() {
    const env = createEnv();
    env.runScript("wb-rules/virtual_Weather.js");
    return env;
}

// Completes the last shell command started by the script
function respond(env, exitCode, output) {
    env.shellCommands[env.shellCommands.length - 1].opts.exitCallback(exitCode, output);
}

test("fetches on startup, by cron and by the update button", () => {
    const env = loadWeather();
    assert.strictEqual(env.shellCommands.length, 1, "fetch on startup");
    assert.match(env.shellCommands[0].command, /^wget -qO- 'https:\/\/api\.openweathermap\.org\/data\/2\.5\/weather\?/);
    assert.deepStrictEqual(env.rules.weather_call.when, { cron: "@every 30m" });

    env.rules.weather_call.then();
    env.rules.weather_update.then(true, "weather", "get_update");
    assert.strictEqual(env.shellCommands.length, 3);
});

test("updates the device from the response", () => {
    const env = loadWeather();
    respond(env, 0, JSON.stringify(RESPONSE));
    assert.strictEqual(env.dev["weather/temperature"], 3.5);
    assert.strictEqual(env.dev["weather/humidity"], 87);
    assert.strictEqual(env.dev["weather/description"], "light rain");
    assert.strictEqual(env.dev["weather/icon"], "https://openweathermap.org/img/wn/10d@4x.png");
    assert.strictEqual(env.dev["weather/clouds_description"], "75% (light rain)");
    assert.match(env.dev["weather/sunrise"], /^\d\d:\d\d$/);
    assert.match(env.dev["weather/last_updated"], /^\d\d:\d\d$/);
});

test("wind direction goes clockwise from north", () => {
    const env = loadWeather();
    const cases = { 0: "north", 45: "north-east", 90: "east", 180: "south", 270: "west", 315: "north-west", 359: "north" };
    for (const deg of Object.keys(cases)) {
        respond(env, 0, JSON.stringify(Object.assign({}, RESPONSE, { wind: { speed: 1, deg: Number(deg) } })));
        assert.strictEqual(env.dev["weather/wind_direction"], deg + "° " + cases[deg]);
    }
    // the API omits the direction in calm weather
    respond(env, 0, JSON.stringify(Object.assign({}, RESPONSE, { wind: { speed: 0 } })));
    assert.strictEqual(env.dev["weather/wind_direction"], "-");
});

test("failed request or bad response keeps the previous values", () => {
    const env = loadWeather();
    respond(env, 0, JSON.stringify(RESPONSE));
    respond(env, 8, "");
    respond(env, 0, "<html>Bad gateway</html>");
    respond(env, 0, JSON.stringify({ cod: 401, message: "Invalid API key" }));
    assert.strictEqual(env.dev["weather/temperature"], 3.5);
    assert.strictEqual(env.logsOf("error").length, 3);
});
