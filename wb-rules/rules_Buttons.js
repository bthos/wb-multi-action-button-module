var room = require("module_ActionButtons");

/**
 * Helper Functions
 */
function switchRelay(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
}
function switchRelayWithAutoOn(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
    dev[device+"/"+control+"_auto_on"] = !dev[device + "/" + control];
}
function switchRelayWithAutoOff(device, control) {
    dev[device+"/"+control] = !dev[device + "/" + control];
    dev[device+"/"+control+"_auto_off"] = !dev[device + "/" + control];
}
function switchDimmerRGB(relayDevice, relayControl, dimmerDevice) {
    dev[relayDevice+"/"+relayControl] = true;
    if (dev[dimmerDevice+"/RGB"] !== "0;0;0") {
        dev[dimmerDevice+"/RGB"] = "0;0;0";
    }
    else {
        // log(dev[relayDevice+"/RGB"]);
        dev[dimmerDevice+"/RGB"] = dev[relayDevice + "/RGB"];
    }
}
function setRandomRGB(relayDevice, relayControl, dimmerDevice) {
    dev[relayDevice+"/"+relayControl] = true;
    dev[relayDevice + "/RGB"] = "" + Math.floor(Math.random() * 255) + ";" + Math.floor(Math.random() * 255) + ";" + Math.floor(Math.random() * 255);
    // log(relayDevice, "/RGB: ", dev[relayDevice + "/RGB"]);
    dev[dimmerDevice+"/RGB"] = dev[relayDevice + "/RGB"];
}
function getRandColor(brightness) {
    // Six levels of brightness from 0 to 5, 0 being the darkest
    var rgb = [Math.random() * 256, Math.random() * 256, Math.random() * 256];
    var mix = [brightness*51, brightness*51, brightness*51]; //51 => 255/5
    var mixedrgb = [rgb[0] + mix[0], rgb[1] + mix[1], rgb[2] + mix[2]].map(function(x){ return Math.round(x/2.0)})
    return mixedrgb.join(";");
}
function runPermanentAction(func, prop) {

    if (typeof func === "function") {
        func.apply(this, prop);
    }
}
function disalarmLeakage(leakage, sensor) {
    // leakage.forEach(leakageDevice => {
    //     if (dev[leakageDevice+"/"+"Alarm"]) {

    //     }
    // });
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
            func: switchRelayWithAutoOff,
            prop: ["wb-mr6c_33", "K2"]
        },
        longPress: {
            func: switchRelayWithAutoOff,
            prop: ["wb-mr6c_33", "K3"]
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
