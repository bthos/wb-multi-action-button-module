var room = require("module_ActionButtons");

/**
 * Helper Functions
 */

// Toggles a relay. If linkedSuffix is given (e.g. "_auto_off"), the control "<control><linkedSuffix>"
// is set to the same new state, so the auto mode follows the relay.
// The new state is computed once: reading a real device right after writing to it still returns
// the old value, so it must not be read twice.
function switchRelay(device, control, linkedSuffix) {
    var isOn = !dev[device + "/" + control];
    dev[device + "/" + control] = isOn;
    if (linkedSuffix) {
        dev[device + "/" + control + linkedSuffix] = isOn;
    }
}

// Last non-black colour of each RGB dimmer, survives wb-rules restarts
var RGB_OFF = "0;0;0";
var lastColors = new PersistentStorage("buttons_last_rgb", { global: true });

// Turns the dimmer power relay on and toggles the dimmer between black and its last colour
function switchDimmerRGB(relayDevice, relayControl, dimmerDevice) {
    dev[relayDevice + "/" + relayControl] = true;
    var color = dev[dimmerDevice + "/RGB"];
    if (color !== RGB_OFF) {
        lastColors[dimmerDevice] = color;
        dev[dimmerDevice + "/RGB"] = RGB_OFF;
    } else {
        dev[dimmerDevice + "/RGB"] = lastColors[dimmerDevice] || "255;255;255";
    }
}

// Turns the dimmer power relay on and sets a random colour.
// Optional brightness: 0 (darkest) .. 5 (pastel) - the colour is mixed with this grey level.
function setRandomRGB(relayDevice, relayControl, dimmerDevice, brightness) {
    var color = [0, 0, 0].map(function () {
        var channel = Math.floor(Math.random() * 256);
        return (brightness === undefined) ? channel : Math.round((channel + brightness * 51) / 2); // 51 => 255/5
    }).join(";");
    dev[relayDevice + "/" + relayControl] = true;
    lastColors[dimmerDevice] = color;
    dev[dimmerDevice + "/RGB"] = color;
}
////////////////////////////////////


room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN1",
    {
        singlePress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K1"]
        },
        doublePress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K2", "_auto_off"]
        },
        longPress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K3", "_auto_off"]
        }
    }
);
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN2",
    {
        longPress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K4"]
        }
    },
    300, 800
);
