/**
 * Version: 0.5.0
 *
 * Function that identifies what kind of button press was performed:
 * - Short press: single, double, triple, etc. - you can add more if you need (see CLICK_ACTIONS)
 * - Long press (and release)
 * - Long press (without release)
 * Script also assigns an action for each type of button press.
 *
 * @param  {string} trigger         -  Name of device and control in the following format: "<device>/<control>".
 *                                  The control must report both press (truthy) and release (falsy) events,
 *                                  e.g. wb-gpio inputs. "pushbutton" controls never report a release and are not supported.
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
 * @return {string|null}            -  Name of the created rule (usable with disableRule/enableRule), or null on invalid arguments.
 *
 * Note: In case longRelease function defined, longPress function will repeate till button is released.
 *       In case longRelease function not defined, only one action will be executed for longPress.
 *       Timings that are not positive numbers fall back to the defaults.
 */
var ActionButtons = {};

// Action name by number of short presses. Add "quadruplePress" etc. here to track more clicks.
var CLICK_ACTIONS = [null, "singlePress", "doublePress", "triplePress"];
var SUPPORTED_ACTIONS = CLICK_ACTIONS.slice(1).concat(["longPress", "longRelease"]);

// Button states
var IDLE = 0, PRESSED = 1, LONG_PRESSED = 2;

function positiveNumberOr(value, defaultValue) {
    var number = Number(value);
    return (isFinite(number) && number > 0) ? number : defaultValue;
}

function cancelTimer(id, clear) {
    if (typeof id === "number") {
        clear(id);
    }
    return null;
}

// Turns {func, prop} into a function that runs the action and returns false if it failed.
// Errors are logged instead of thrown, so a broken action can not corrupt the button state.
function makeHandler(trigger, name, item) {
    return function () {
        try {
            item.func.apply(null, Array.isArray(item.prop) ? item.prop : []);
            return true;
        } catch (e) {
            log.error("ActionButtons [{}]: {} action failed: {}", trigger, name, e);
            return false;
        }
    };
}

ActionButtons.onButtonPress = function (trigger, action, timeToNextPress, timeOfLongPress, intervalOfRepeat) {

    if (typeof trigger !== "string" || !/^[^\/]+\/[^\/]+$/.test(trigger)) {
        log.error("ActionButtons: invalid trigger '{}', expected '<device>/<control>'", trigger);
        return null;
    }

    // Validate actions once, so the state machine below only deals with ready-to-call handlers
    var handlers = {};
    var hasHandlers = false;
    Object.keys(action || {}).forEach(function (name) {
        var item = action[name];
        if (SUPPORTED_ACTIONS.indexOf(name) < 0) {
            log.warning("ActionButtons [{}]: unknown action '{}' is ignored (supported: {})",
                trigger, name, SUPPORTED_ACTIONS.join(", "));
        } else if (!item || typeof item.func !== "function") {
            log.warning("ActionButtons [{}]: action '{}' has no 'func' and is ignored", trigger, name);
        } else {
            handlers[name] = makeHandler(trigger, name, item);
            hasHandlers = true;
        }
    });
    if (!hasHandlers) {
        log.error("ActionButtons [{}]: no valid actions defined, rule is not created", trigger);
        return null;
    }

    // Set default values if not passed into function
    timeToNextPress = positiveNumberOr(timeToNextPress, 300);
    timeOfLongPress = positiveNumberOr(timeOfLongPress, 1000);
    intervalOfRepeat = positiveNumberOr(intervalOfRepeat, 100);

    var state = IDLE;
    var pressCount = 0;
    var timerWaitNextShortPress = null;
    var timerLongPress = null;
    var timerRepeat = null;
    var warnedAboutMissingRelease = false;

    function stopLongPress() {
        timerLongPress = cancelTimer(timerLongPress, clearTimeout);
        timerRepeat = cancelTimer(timerRepeat, clearInterval);
    }

    function finishLongPress() {
        state = IDLE;
        stopLongPress();
        if (handlers.longRelease) {
            handlers.longRelease();
        }
    }

    function onLongPress() {
        // Long Press identified, we will skip short press
        timerLongPress = null;
        state = LONG_PRESSED;
        pressCount = 0;

        // If Long Release action defined, we will repeat Long Press action till not released.
        // Otherwise only 1 Long Press action is executed. A failing action stops the repeat.
        if (handlers.longPress && handlers.longPress() && handlers.longRelease) {
            timerRepeat = setInterval(function () {
                if (!handlers.longPress()) {
                    timerRepeat = cancelTimer(timerRepeat, clearInterval);
                }
            }, intervalOfRepeat);
        }
    }

    function onShortPressesDone() {
        timerWaitNextShortPress = null;
        var handler = handlers[CLICK_ACTIONS[pressCount]];
        pressCount = 0;
        if (handler) {
            handler();
        }
    }

    function onPress() {
        if (state !== IDLE) {
            // The release event was lost (or the control never reports one)
            if (!warnedAboutMissingRelease) {
                warnedAboutMissingRelease = true;
                log.warning("ActionButtons [{}]: press without release - release event lost, or the control " +
                    "is of 'pushbutton' type which is not supported", trigger);
            }
            if (state === LONG_PRESSED) {
                finishLongPress();
            }
        }
        timerWaitNextShortPress = cancelTimer(timerWaitNextShortPress, clearTimeout);
        stopLongPress();
        state = PRESSED;
        timerLongPress = setTimeout(onLongPress, timeOfLongPress);
    }

    function onRelease() {
        if (state === LONG_PRESSED) {
            // Catch button released after long press
            finishLongPress();
        } else if (state === PRESSED) {
            // Released before long press timeout - count clicks
            state = IDLE;
            stopLongPress();
            pressCount += 1;
            timerWaitNextShortPress = setTimeout(onShortPressesDone, timeToNextPress);
        }
        // state === IDLE: release without press (e.g. rules engine restarted while button was held) - ignore
    }

    var ruleName = "on_button_press_" + trigger.replace("/", "_");
    try {
        defineRule(ruleName, {
            whenChanged: trigger,
            then: function (newValue) {
                if (newValue) {
                    onPress();
                } else {
                    onRelease();
                }
            }
        });
    } catch (e) {
        log.error("ActionButtons [{}]: failed to define rule '{}': {}", trigger, ruleName, e);
        return null;
    }
    return ruleName;
};

exports.ActionButtons = ActionButtons;
