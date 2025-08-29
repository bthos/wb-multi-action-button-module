/**
 * Button Action Rules Example
 * 
 * This file demonstrates how to use the Multi-Action Button Module
 * for Wirenboard devices. It includes:
 * 
 * - Helper functions for common button actions
 * - Example button configurations
 * - Best practices for button handling
 * 
 * To use this file:
 * 1. Modify device names to match your hardware
 * 2. Customize functions for your specific needs  
 * 3. Add or remove button configurations as required
 */

var room = require("module_ActionButtons");

/**
 * Helper Functions for Button Actions
 */

/**
 * Toggles a relay control state
 * @param {string} device - Device name/identifier (e.g., "wb-mr6c_33")
 * @param {string} control - Control name (e.g., "K1")
 */
function switchRelay(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
}

/**
 * Toggles a relay control and sets its auto-on state
 * @param {string} device - Device name/identifier (e.g., "wb-mr6c_33") 
 * @param {string} control - Control name (e.g., "K1")
 */
function switchRelayWithAutoOn(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
    dev[device+"/"+control+"_auto_on"] = !dev[device + "/" + control];
}

/**
 * Toggles a relay control and sets its auto-off state
 * @param {string} device - Device name/identifier (e.g., "wb-mr6c_33")
 * @param {string} control - Control name (e.g., "K1") 
 */
function switchRelayWithAutoOff(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
    dev[device+"/"+control+"_auto_off"] = !dev[device + "/" + control];
}

/**
 * Switches RGB dimmer state - toggles between off (0;0;0) and saved RGB value
 * @param {string} relayDevice - Relay device name that stores the RGB value
 * @param {string} relayControl - Relay control name
 * @param {string} dimmerDevice - Dimmer device name to control
 */
function switchDimmerRGB(relayDevice, relayControl, dimmerDevice) {
    dev[relayDevice+"/"+relayControl] = true;
    if (dev[dimmerDevice+"/RGB"] !== "0;0;0") {
        dev[dimmerDevice+"/RGB"] = "0;0;0";
    }
    else {
        dev[dimmerDevice+"/RGB"] = dev[relayDevice + "/RGB"];
    }
}

/**
 * Sets a random RGB color for both relay and dimmer devices
 * @param {string} relayDevice - Relay device name to store RGB value
 * @param {string} relayControl - Relay control name
 * @param {string} dimmerDevice - Dimmer device name to control
 */
function setRandomRGB(relayDevice, relayControl, dimmerDevice) {
    dev[relayDevice+"/"+relayControl] = true;
    dev[relayDevice + "/RGB"] = "" + Math.floor(Math.random() * 255) + ";" + Math.floor(Math.random() * 255) + ";" + Math.floor(Math.random() * 255);
    dev[dimmerDevice+"/RGB"] = dev[relayDevice + "/RGB"];
}

/**
 * Generates a random RGB color with specified brightness level
 * @param {number} brightness - Brightness level from 0 to 5 (0 being darkest, 5 brightest)
 * @returns {string} RGB color string in format "R;G;B" (e.g., "255;128;64")
 */
function getRandColor(brightness) {
    // Generate base random RGB values (0-255)
    var rgb = [Math.random() * 256, Math.random() * 256, Math.random() * 256];
    // Calculate brightness mix (51 = 255/5 for 5 brightness levels)
    var mix = [brightness*51, brightness*51, brightness*51];
    // Blend random color with brightness and average the result
    var mixedrgb = [rgb[0] + mix[0], rgb[1] + mix[1], rgb[2] + mix[2]].map(function(x){ return Math.round(x/2.0)})
    return mixedrgb.join(";");
}
/**
 * Executes a function permanently with given parameters
 * @param {Function} func - The function to execute
 * @param {Array} prop - Array of parameters to pass to the function
 */
function runPermanentAction(func, prop) {
    if (typeof func === "function") {
        func.apply(this, prop);
    }
}
////////////////////////////////////
// Button Configuration Examples
////////////////////////////////////

/**
 * Example 1: Multi-action button with single, double, and long press
 * 
 * This configuration demonstrates:
 * - Single press: Toggle K1 relay
 * - Double press: Toggle K2 relay with auto-off
 * - Long press: Toggle K3 relay with auto-off
 */
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN1",
    {
        singlePress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K1"]
        },
        doublePress: {
            func: switchRelayWithAutoOff,
            prop: ["wb-mr6c_33", "K2"]
        },
        longPress: {
            func: switchRelayWithAutoOff,
            prop: ["wb-mr6c_33", "K3"]
        }
    }
);

/**
 * Example 2: Simple long press button with custom timing
 * 
 * This configuration demonstrates:
 * - Long press only (no short press actions)
 * - Custom timing: 300ms wait time, 800ms long press threshold
 */
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN2",
    {
        longPress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K4"]
        }
    },
    300,  // timeToNextPress: 300ms between presses
    800   // timeOfLongPress: 800ms to trigger long press
);

// Log successful initialization
log("Button rules loaded successfully!");
