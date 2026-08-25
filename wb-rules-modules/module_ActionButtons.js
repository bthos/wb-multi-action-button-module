/**
 * Version: 0.4.0
 *
 * Function that identifies what kind of button press was performed:
 * - Short press: single, double, triple, etc. - you can add more if you need
 * - Long press (and release)
 * - Long press (without release)
 * Script also assigns an action for each type of button press.
 *
 * @param  {string} trigger         -  Name of device and control in the following format: "<device>/<control>".
 *                                  The control must be a switch-like control reporting both press ("1"/true)
 *                                  and release ("0"/false) events (e.g. wb-gpio inputs). Controls of "pushbutton"
 *                                  type are NOT supported: they never report a release, so every press would be
 *                                  misdetected as a long press.
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
 * @return {string|null}            -  Name of the defined wb-rules rule (can be passed to disableRule/enableRule),
 *                                  or null if the arguments were invalid and no rule was defined.
 *
 * Note: In case longRelease function defined, longPress function will repeate till button is released.
 *       In case longRelease function not defined, only one action will be executed for longPress.
 *       Invalid timing parameters (non-numbers, zero or negative) fall back to the defaults.
 */
var ActionButtons = {};

var SUPPORTED_ACTIONS = ["singlePress", "doublePress", "triplePress", "longPress", "longRelease"];

// Checks that an action item is an object with a callable 'func'
function isValidActionItem(actionItem) {
    return !!actionItem && typeof actionItem === "object" && typeof actionItem.func === "function";
}

// Safely executes one action item ({func: <function>, prop: <array>}).
// Tolerates missing/null items and a missing prop array.
function callAction(actionItem) {
    if (isValidActionItem(actionItem)) {
        actionItem.func.apply(null, Array.isArray(actionItem.prop) ? actionItem.prop : []);
    }
}

// Returns value if it is a positive finite number, otherwise the default
function positiveNumberOr(value, defaultValue) {
    return (typeof value === "number" && isFinite(value) && value > 0) ? value : defaultValue;
}

ActionButtons.onButtonPress = function (trigger, action, timeToNextPress, timeOfLongPress, intervalOfRepeat) {

    var triggerParts = (typeof trigger === "string") ? trigger.split("/") : [];
    if (triggerParts.length !== 2 || !triggerParts[0] || !triggerParts[1]) {
        log.error("ActionButtons: invalid trigger '{}', expected '<device>/<control>'", trigger);
        return null;
    }
    if (!action || typeof action !== "object") {
        log.error("ActionButtons [{}]: 'action' must be an object", trigger);
        return null;
    }

    // Warn about misspelled or malformed action entries: they would otherwise be silently ignored
    var hasValidAction = false;
    Object.keys(action).forEach(function (key) {
        if (SUPPORTED_ACTIONS.indexOf(key) < 0) {
            log.warning("ActionButtons [{}]: unknown action '{}' is ignored (supported: {})",
                trigger, key, SUPPORTED_ACTIONS.join(", "));
        } else if (!isValidActionItem(action[key])) {
            log.warning("ActionButtons [{}]: action '{}' has no valid 'func' and is ignored", trigger, key);
        } else {
            hasValidAction = true;
        }
    });
    if (!hasValidAction) {
        log.error("ActionButtons [{}]: no valid actions defined, rule is not created", trigger);
        return null;
    }

    // Set default values if not passed into function
    timeToNextPress = positiveNumberOr(timeToNextPress, 300);
    timeOfLongPress = positiveNumberOr(timeOfLongPress, 1000);
    intervalOfRepeat = positiveNumberOr(intervalOfRepeat, 100);

    var buttonPressedCounter = 0;
    var timerWaitNextShortPress = undefined;
    var timerLongPress = undefined;
    var timerWaitLongRelease = undefined;
    var isLongPressed = false;
    var isButtonDown = false;
    var warnedAboutMissingRelease = false;

    function stopWaitNextShortPressTimer() {
        if (typeof timerWaitNextShortPress === "number") {
            clearTimeout(timerWaitNextShortPress);
            timerWaitNextShortPress = undefined;
        }
    }
    function stopLongPressTimer() {
        if (typeof timerLongPress === "number") {
            clearTimeout(timerLongPress);
            timerLongPress = undefined;
        }
    }
    function stopLongPressRepeat() {
        if (typeof timerWaitLongRelease === "number") {
            clearInterval(timerWaitLongRelease);
            timerWaitLongRelease = undefined;
        }
    }

    var ruleName = "on_button_press_" + trigger.replace("/", "_");

    try {
        defineRule(ruleName, {
            whenChanged: trigger,
            then: function (newValue, devName, cellName) {

                // If button is pressed, wait for a Long Press
                if (newValue) {

                    if (isButtonDown && !warnedAboutMissingRelease) {
                        warnedAboutMissingRelease = true;
                        log.warning("ActionButtons [{}]: got a press event while the button was already pressed " +
                            "(release event lost, or the control is of 'pushbutton' type which is not supported: " +
                            "the module needs both press and release events)", trigger);
                    }
                    isButtonDown = true;

                    stopWaitNextShortPressTimer();
                    stopLongPressTimer();
                    // A repeat interval may still be running if the release event was lost - never leave it behind
                    stopLongPressRepeat();

                    timerLongPress = setTimeout(function () {
                        // Long Press identified, we will skip short press.
                        // The state is updated before user actions run, so a failing action cannot corrupt it.
                        timerLongPress = undefined;
                        isLongPressed = true;
                        buttonPressedCounter = 0;

                        callAction(action.longPress);

                        // If Long Release action defined, we will repeat Long Press action till not released.
                        // Otherwise only 1 Long Press action is executed
                        if (isValidActionItem(action.longPress) && isValidActionItem(action.longRelease)) {
                            stopLongPressRepeat();
                            timerWaitLongRelease = setInterval(function () {
                                callAction(action.longPress);
                            }, intervalOfRepeat);
                        }
                    }, timeOfLongPress);

                }

                // If button is released, then it is not a Long Press, start to count clicks
                else {
                    var wasButtonDown = isButtonDown;
                    isButtonDown = false;

                    if (!isLongPressed) {
                        stopLongPressTimer();

                        // Release without a preceding press: happens if the rule engine (re)started
                        // while the button was held. Counting it as a click would fire a phantom action.
                        if (!wasButtonDown) {
                            return;
                        }

                        buttonPressedCounter += 1;
                        stopWaitNextShortPressTimer();
                        timerWaitNextShortPress = setTimeout(function () {
                            var pressCount = buttonPressedCounter;
                            // Reset the counter before running user actions, so a failing action cannot corrupt it
                            buttonPressedCounter = 0;
                            timerWaitNextShortPress = undefined;

                            switch (pressCount) {
                            // Counter equals 1 - it's a single short press
                            case 1:
                                callAction(action.singlePress);
                                break;
                            // Counter equals 2 - it's a double short press
                            case 2:
                                callAction(action.doublePress);
                                break;
                            // Counter equals 3 - it's a triple short press
                            case 3:
                                callAction(action.triplePress);
                                break;
                            // You can add more cases here to track more clicks
                            }
                        }, timeToNextPress);
                    }

                    // Catch button released after long press
                    else {
                        // Reset the state and stop the timers before user actions run,
                        // so a failing longRelease action cannot corrupt the state
                        isLongPressed = false;
                        stopLongPressTimer();
                        stopLongPressRepeat();

                        callAction(action.longRelease);
                    }
                }

            }
        });
    } catch (e) {
        log.error("ActionButtons [{}]: failed to define rule '{}': {}", trigger, ruleName, e);
        return null;
    }

    log("ActionButtons: defined rule {}", ruleName);
    return ruleName;
};

exports.ActionButtons = ActionButtons;
