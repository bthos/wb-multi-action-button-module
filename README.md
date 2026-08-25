# Multi-action Button module for Wirenboard

Function that identifies what kind of button press was performed: 
- Short press: single, double, triple, etc. - you can add more if you need
- Long press (and release)
- Long press (without release)

Script also assigns an action for each type of button press.


  @param  {string} trigger -  Name of device and control in the following format: "<device>/<control>".

  @param  {object} action -  Defines actions to be taken for each type of button press.

> Key: "singlePress" or "doublePress" or "triplePress" or "longPress" or "longRelease".

> Value: Object having the following structure {func: <function name>, prop: <array of parameters to be passed>}

Example:

```
                                  {
                                      singlePress: {func: myFunc1, prop: ["wb-mr6c_1", "K1"]},
                                      doublePress: {func: myFunc2, prop: ["wb-mrgbw-d_2", "RGB", "255;177;85"]},
                                      triplePress: {func: myFunc3, prop: []},
                                      longPress: {func: myFunc4, prop: []},
                                      longRelease: {func: myFunc5, prop: []}
                                  }
```

  @param  {number} timeToNextPress -  Time (ms) after button up to wait for the next press before reseting the counter. Default is 300 ms.
  
  @param  {number} timeOfLongPress -  Time (ms) after button down to be considered as as a long press. Default is 1000 ms (1 sec).
  
  @param  {number} intervalOfRepeat - Time (ms) before repeating action specified in LongPress action. Default is 100 ms.
 
Note: In case longRelease function defined, longPress function will repeate till button is released.
  In case longRelease function not defined, only one action will be executed for longPress.

## Requirements and limitations

- The `trigger` control must be a switch-like control that reports both press (`1`) and release (`0`) events (e.g. `wb-gpio` inputs). Controls of `pushbutton` type are not supported: they never report a release event, so a press cannot be distinguished from a long press. The module logs a warning if it detects such a control.
- `prop` must be an array — it is passed to the action function as the list of its arguments.
- `onButtonPress` returns the name of the created rule (it can be passed to `disableRule`/`enableRule`), or `null` if the arguments were invalid and no rule was defined.
- Invalid timing parameters (non-numbers, zero or negative values) fall back to the defaults.
