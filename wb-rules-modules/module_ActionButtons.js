/**
 * Wirenboard Multi-Action Button Module
 * Version: 0.3.2
 * 
 * This module provides functionality to detect and handle different types of button press events:
 * - Single, double, triple short presses (extensible to more)
 * - Long press with optional release detection
 * - Configurable timing parameters
 * - Repeating actions during long press
 */
var ActionButtons = {};

/**
 * Registers button press handlers for a specific trigger device/control
 * 
 * @param {string} trigger - Device and control name in format "<device>/<control>" (e.g., "wb-gpio/EXT1_IN1")
 * @param {object} action - Configuration object defining actions for different press types
 * @param {object} [action.singlePress] - Single press action: {func: Function, prop: Array}
 * @param {object} [action.doublePress] - Double press action: {func: Function, prop: Array}  
 * @param {object} [action.triplePress] - Triple press action: {func: Function, prop: Array}
 * @param {object} [action.longPress] - Long press action: {func: Function, prop: Array}
 * @param {object} [action.longRelease] - Long press release action: {func: Function, prop: Array}
 * @param {number} [timeToNextPress=300] - Time (ms) to wait for next press before processing action
 * @param {number} [timeOfLongPress=1000] - Time (ms) to consider press as long press  
 * @param {number} [intervalOfRepeat=100] - Time (ms) interval for repeating longPress action
 * 
 * @example
 * // Basic usage with single and double press
 * ActionButtons.onButtonPress(
 *   "wb-gpio/EXT1_IN1",
 *   {
 *     singlePress: {func: switchRelay, prop: ["wb-mr6c_33", "K1"]},
 *     doublePress: {func: switchRelayWithAutoOff, prop: ["wb-mr6c_33", "K2"]}
 *   }
 * );
 * 
 * @example  
 * // Advanced usage with custom timing
 * ActionButtons.onButtonPress(
 *   "wb-gpio/EXT1_IN2", 
 *   {
 *     longPress: {func: switchRelay, prop: ["wb-mr6c_33", "K4"]}
 *   },
 *   300, 800 // Custom timing: 300ms between presses, 800ms for long press
 * );
 * 
 * @note If longRelease is defined, longPress will repeat until button is released.
 *       If longRelease is not defined, longPress executes only once.
 */
ActionButtons.onButtonPress = function (trigger, action, timeToNextPress, timeOfLongPress, intervalOfRepeat) {
    
    // Input validation
    if (typeof trigger !== "string" || !trigger.includes("/")) {
        throw new Error("ActionButtons: trigger must be a string in format 'device/control'");
    }
    
    if (typeof action !== "object" || action === null) {
        throw new Error("ActionButtons: action must be an object");
    }
    
    // Set default values if not passed into function
    timeToNextPress = timeToNextPress || 300;
    timeOfLongPress = timeOfLongPress || 1000;
    intervalOfRepeat = intervalOfRepeat || 100;
    
    var buttonPressedCounter = 0;
    var actionRepeatCounter = 0;
    var timerWaitNextShortPress = undefined;
    var timerLongPress = undefined;
    var timerWaitLongRelease = undefined;
    var isLongPressed = false;
    var isLongReleased = false;

    // Generate unique rule name from trigger
    var ruleName = "on_button_press_" + trigger.replace("/", "_");
    log("ActionButtons: Defining rule:", ruleName);

    defineRule(ruleName, {
        whenChanged: trigger,
        then: function (newValue, devName, cellName) {

            // Button pressed - start long press detection
            if (newValue) {
                // Clear any existing timers
                if (typeof timerWaitNextShortPress == "number") {
                    clearTimeout(timerWaitNextShortPress);
                    timerWaitNextShortPress = undefined;
                }
                if (typeof timerLongPress == "number") {
                    clearTimeout(timerLongPress);
                    timerLongPress = undefined;
                }
                
                // Start long press timer
                timerLongPress = setTimeout(function () {
                    // Long press detected
                    isLongPressed = true;
                    isLongReleased = false;
                    buttonPressedCounter = 0;
                    actionRepeatCounter = 1;
                    
                    // Execute long press action
                    if (typeof action.longPress === "object") {
                        if (typeof action.longPress.func === "function") {
                            action.longPress.func.apply(this, action.longPress.prop);
                            
                            // Setup repeating action if longRelease is defined
                            if (typeof action.longRelease === "object") {
                                if (typeof action.longRelease.func === "function") {
                                    timerWaitLongRelease = setInterval(function () {
                                        if(!isLongReleased) {
                                            if (typeof action.longPress === "object") {
                                                if (typeof action.longPress.func === "function") {
                                                    action.longPress.func.apply(this, action.longPress.prop);
                                                }
                                            }
                                        }
                                        if(isLongReleased) {
                                            clearInterval(timerWaitLongRelease);
                                        }
                                    }, intervalOfRepeat);        
                                }                                        
                            }
                        }
                    }
                    timerLongPress = undefined;
                }, timeOfLongPress);

            }

            // Button released - handle short press counting or long press release
            else {
                if (!isLongPressed) {
                    // Handle short press sequence
                    if (typeof timerLongPress == "number") {
                        clearTimeout(timerLongPress);
                        timerLongPress = undefined;
                    }
                    
                    buttonPressedCounter += 1;
                    
                    if (typeof timerWaitNextShortPress == "number") {
                        clearTimeout(timerWaitNextShortPress);
                        timerWaitNextShortPress = undefined;
                    }
                    
                    // Start timer to wait for additional presses
                    timerWaitNextShortPress = setTimeout(function () {
                        switch (buttonPressedCounter) {
                        case 1:
                            // Single press detected
                            if (typeof action.singlePress === "object") {
                                if (typeof action.singlePress.func === "function") {
                                    action.singlePress.func.apply(this, action.singlePress.prop);
                                }
                            }
                            break;
                        case 2:
                            // Double press detected
                            if (typeof action.doublePress === "object") {
                                if (typeof action.doublePress.func === "function") {
                                    action.doublePress.func.apply(this, action.doublePress.prop);
                                }
                            }
                            break;
                        case 3:
                            // Triple press detected
                            if (typeof action.triplePress === "object") {
                                if (typeof action.triplePress.func === "function") {
                                    action.triplePress.func.apply(this, action.triplePress.prop);
                                }
                            }
                            break;
                        // Additional cases can be added here for more click patterns
                        }
                        // Reset counter and timer
                        buttonPressedCounter = 0;
                        timerWaitNextShortPress = undefined;
                    }, timeToNextPress);
                }
                
                // Handle long press release
                else {
                    if (typeof action.longRelease === "object") {
                        if (typeof action.longRelease.func === "function") {
                            action.longRelease.func.apply(this, action.longRelease.prop);
                        }
                    }
                    isLongPressed = false;
                    isLongReleased = true;
                }
            }

        }
    });
};

exports.ActionButtons = ActionButtons;
