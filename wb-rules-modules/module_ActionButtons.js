/**
 * Version: 0.3.2
 * 
 * Function that identifies what kind of button press was performed: 
 * - Short press: single, double, triple, etc. - you can add more if you need
 * - Long press (and release)
 * - Long press (without release)
 * Script also assigns an action for each type of button press.
 *
 * @param  {string} trigger         -  Name of device and control in the following format: "<device>/<control>".
 * @param  {object} action          -  Defines actions to be taken for each type of button press.
 *                                  Key: "singlePress" or "doublePress" or "triplePress" or "longPress" or "longRelease".
 *                                  Value: Object having the following structure {func: <function name>, prop: <array of parameters to be passed>}
 *                                  Example:
 *                                  {
 *                                      singlePress: {func: myFunc1, prop: ["wb-mr6c_1", "K1"]},
 *                                      doublePress: {func: myFunc2, prop: ["wb-mrgbw-d_2", "RGB", "255;177;85"]},
 *                                      triplePress: {func: myFunc3, prop: []},
 *                                      longPress: {func: myFunc4, prop: []},
 *                                      longRelease: {func: myFunc5, prop: []}
 *                                  }
 * @param  {number} timeToNextPress -  Time (ms) after button up to wait for the next press before reseting the counter. Default is 300 ms.
 * @param  {number} timeOfLongPress -  Time (ms) after button down to be considered as as a long press. Default is 1000 ms (1 sec).
 * @param  {number} intervalOfRepeat - Time (ms) before repeating action specified in LongPress action. Default is 100 ms.
 * 
 * Note: In case longRelease function defined, longPress function will repeate till button is released.
 *       In case longRelease function not defined, only one action will be executed for longPress.
 */
var ActionButtons = {};

ActionButtons.onButtonPress = function (trigger, action, timeToNextPress, timeOfLongPress, intervalOfRepeat) {
    
    // Set default values if not passed into function
    timeToNextPress = timeToNextPress || 300;
    timeOfLongPress = timeOfLongPress || 1000;
    intervalOfRepeat = intervalOfRepeat || 100;
    
    var buttonPressedCounter = 0;
    // var actionRepeatCounter = 0;
    var timerWaitNextShortPress = undefined;
    var timerLongPress = undefined;
    var timerWaitLongRelease = undefined;
    var isLongPressed = false;
    var isLongReleased = false;

    var ruleName = "on_button_press_" + trigger.replace("/", "_");
    log("LOG::Define WB Rule::", ruleName);

    defineRule(ruleName, {
        whenChanged: trigger,
        then: function (newValue, devName, cellName) {

            // If button is pressed, wait for a Long Press
            if (newValue) {

                if (typeof timerWaitNextShortPress == "number") {
                    log("LOG::timerWaitNextShortPress(1)::", timerWaitNextShortPress);
                    clearTimeout(timerWaitNextShortPress);
                    timerWaitNextShortPress = undefined;
                }
                if (typeof timerLongPress == "number") {
                    log("LOG::timerLongPress::", timerLongPress);
                    clearTimeout(timerLongPress);
                    timerLongPress = undefined;
                }
                timerLongPress = setTimeout(function () {
                    // Long Press identified, we will skip short press
                    isLongPressed = true;
                    isLongReleased = false;
                    buttonPressedCounter = 0;
                    actionRepeatCounter = 1;
                    if (typeof action.longPress === "object") {
                        if (typeof action.longPress.func === "function") {
                            action.longPress.func.apply(this, action.longPress.prop);
                            
                            // If Long Release action defined, we will repeat Long Press action till not released. Otherwise only 1 Long Press action is executed
                            if (typeof action.longRelease === "object") {
                                if (typeof action.longRelease.func === "function") {
                                    timerWaitLongRelease = setInterval(function () {
                                        if(!isLongReleased) {
                                            if (typeof action.longPress === "object") {
                                                if (typeof action.longPress.func === "function") {
                                                    action.longPress.func.apply(this, action.longPress.prop);
                                                }
                                            }
                                            // log(">>>>>> long press - press (" + actionRepeatCounter++ + ") <<<<<<");    
                                        }
                                        if(isLongReleased) {
                                            clearInterval(timerWaitLongRelease);
                                        }
                                    }, intervalOfRepeat);        
                                }                                        
                            }
    
                        }
                    }
                    // log(">>>>>> long press - press (" + actionRepeatCounter++ + ") <<<<<<");
                    timerLongPress = undefined;
                }, timeOfLongPress);

            }

            // If button is released, then it is not a Long Press, start to count clicks
            else {
                if (!isLongPressed) {
                    if (typeof timerLongPress == "number") {
                        log("LOG::timerLongPress::", timerLongPress);
                        clearTimeout(timerLongPress);
                        timerLongPress = undefined;
                    }
                    buttonPressedCounter += 1;
                    if (typeof timerWaitNextShortPress == "number") {
                        log("LOG::timerWaitNextShortPress(2)::", timerWaitNextShortPress);
                        clearTimeout(timerWaitNextShortPress);
                        timerWaitNextShortPress = undefined;
                    }
                    timerWaitNextShortPress = setTimeout(function () {
                        switch (buttonPressedCounter) {
                        // Counter equals 1 - it's a single short press
                        case 1:
                            if (typeof action.singlePress === "object") {
                                if (typeof action.singlePress.func === "function") {
                                    action.singlePress.func.apply(this, action.singlePress.prop);
                                }
                            }
                            // log(">>>>>> short press - single <<<<<<");
                            break;
                        // Counter equals 2 - it's a double short press
                        case 2:
                            if (typeof action.doublePress === "object") {
                                if (typeof action.doublePress.func === "function") {
                                    action.doublePress.func.apply(this, action.doublePress.prop);
                                }
                            }
                            // log(">>>>>> short press - double <<<<<<");
                            break;
                        // Counter equals 3 - it's a triple short press
                        case 3:
                            if (typeof action.triplePress === "object") {
                                if (typeof action.triplePress.func === "function") {
                                    action.triplePress.func.apply(this, action.triplePress.prop);
                                }
                            }
                            // log(">>>>>> short press - triple <<<<<<");
                            break;
                        // You can add more cases here to track more clicks
                        }
                        // Reset the counter
                        buttonPressedCounter = 0;
                        timerWaitNextShortPress = undefined;
                    }, timeToNextPress);
                }

                // Catch button released after long press
                else {
                    if (typeof action.longRelease === "object") {
                        if (typeof action.longRelease.func === "function") {
                            // if (typeof action.longRelease.prop === "array") {
                                action.longRelease.func.apply(this, action.longRelease.prop);
                            // } else {
                            //     action.longRelease.func.apply(this, []);
                            // }
                        }
                    }
                    // log(">>>>>> long press - release <<<<<<");
                    isLongPressed = false;
                    isLongReleased = true;
                }
            }

        }
    });
};

exports.ActionButtons = ActionButtons;
