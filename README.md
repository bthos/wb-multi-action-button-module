# Multi-action Button Module for Wirenboard

A comprehensive module for the Wirenboard rule engine (@wirenboard/wb-rules) that provides advanced button press detection and handling capabilities.

## Features

This module can identify and handle different types of button press patterns:
- **Short press**: single, double, triple, etc. (extensible to more patterns)
- **Long press**: with optional automatic repetition
- **Long press with release**: separate actions for press and release events
- **Configurable timing**: customize detection thresholds and repeat intervals
- **Action assignment**: define specific functions to execute for each press type

## Installation

1. Copy the module files to your Wirenboard device:
   ```bash
   # Copy the main ActionButtons module
   cp wb-rules-modules/module_ActionButtons.js /etc/wb-rules-modules/
   
   # Copy utility module (optional, for MQTT Discovery)
   cp wb-rules-modules/module_Utilities.js /etc/wb-rules-modules/
   ```

2. Copy example rule files (optional):
   ```bash
   # Copy button handling examples
   cp wb-rules/rules_Buttons.js /etc/wb-rules/
   
   # Copy weather virtual device example
   cp wb-rules/virtual_Weather.js /etc/wb-rules/
   ```

3. Restart the wb-rules service:
   ```bash
   systemctl restart wb-rules
   ```

## Quick Start

```javascript
// Import the module
var room = require("module_ActionButtons");

// Basic single and double press detection
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN1",  // Button trigger (device/control)
    {
        singlePress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K1"]
        },
        doublePress: {
            func: switchRelayWithAutoOff, 
            prop: ["wb-mr6c_33", "K2"]
        }
    }
);
```

## API Reference

### ActionButtons.onButtonPress(trigger, action, timeToNextPress, timeOfLongPress, intervalOfRepeat)

Registers button press handlers for a specific device control.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `trigger` | string | **required** | Device and control name in format `"<device>/<control>"` |
| `action` | object | **required** | Configuration object defining actions for different press types |
| `timeToNextPress` | number | 300 | Time (ms) to wait for next press before processing action |
| `timeOfLongPress` | number | 1000 | Time (ms) to consider press as long press |
| `intervalOfRepeat` | number | 100 | Time (ms) interval for repeating longPress action |

#### Action Object Structure

The `action` parameter should contain one or more of these properties:

```javascript
{
    singlePress: {func: Function, prop: Array},   // Single press action
    doublePress: {func: Function, prop: Array},   // Double press action  
    triplePress: {func: Function, prop: Array},   // Triple press action
    longPress: {func: Function, prop: Array},     // Long press action
    longRelease: {func: Function, prop: Array}    // Long press release action
}
```

- `func`: Function to execute
- `prop`: Array of parameters to pass to the function

## Examples

### Basic Usage

```javascript
var room = require("module_ActionButtons");

// Simple relay toggle on single press
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN1",
    {
        singlePress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K1"]
        }
    }
);
```

### Multi-Action Configuration

```javascript
// Multiple press types with different actions
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
        triplePress: {
            func: setRandomRGB,
            prop: ["wb-mrgbw-d_1", "RGB", "wb-led_1"]
        },
        longPress: {
            func: switchRelayWithAutoOff,
            prop: ["wb-mr6c_33", "K3"]
        }
    }
);
```

### Custom Timing

```javascript
// Custom timing: 500ms between presses, 800ms for long press
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN2",
    {
        longPress: {
            func: switchRelay,
            prop: ["wb-mr6c_33", "K4"]
        }
    },
    500,  // timeToNextPress
    800   // timeOfLongPress
);
```

### Long Press with Repetition

```javascript
// Long press that repeats every 200ms until released
room.ActionButtons.onButtonPress(
    "wb-gpio/EXT1_IN3",
    {
        longPress: {
            func: dimmerUp,           // Function called repeatedly
            prop: ["wb-dimmer_1"]
        },
        longRelease: {
            func: dimmerStop,         // Function called on release
            prop: ["wb-dimmer_1"]
        }
    },
    300,   // timeToNextPress
    1000,  // timeOfLongPress  
    200    // intervalOfRepeat
);
```

## Helper Functions

The repository includes several helper functions for common Wirenboard operations:

### Relay Control Functions

```javascript
// Toggle relay state
function switchRelay(device, control)

// Toggle relay with auto-on functionality
function switchRelayWithAutoOn(device, control)

// Toggle relay with auto-off functionality  
function switchRelayWithAutoOff(device, control)
```

### RGB/Dimmer Functions

```javascript
// Switch RGB dimmer (toggle between off and saved color)
function switchDimmerRGB(relayDevice, relayControl, dimmerDevice)

// Set random RGB color
function setRandomRGB(relayDevice, relayControl, dimmerDevice)

// Generate random color with brightness level (0-5)
function getRandColor(brightness)
```

## Additional Modules

### Utilities Module

Provides utility functions for MQTT Discovery and text formatting:

```javascript
var utils = require("module_Utilities");

// Capitalize text
var title = utils.Utilities.toCapitals("my device name");

// Setup MQTT Discovery for Home Assistant
utils.Utilities.mqttDiscovery("wb-mr6c_33", "K1", "switch", "Living Room");
```

### Virtual Weather Device

Example implementation of a weather data virtual device using OpenWeatherMap API:

1. Configure your location and API key in `virtual_Weather.js`
2. The device automatically fetches weather data every 30 minutes
3. Manual updates available via the `get_update` button

## Troubleshooting

### Common Issues

1. **Button not responding**: Check that the trigger device/control path is correct
2. **Function not found**: Ensure helper functions are defined before calling `onButtonPress`
3. **Timer conflicts**: Each button trigger creates its own isolated timer context

### Debug Mode

Enable debug logging by modifying the log statements in the module:

```javascript
// Change this line in module_ActionButtons.js
log("ActionButtons: Defining rule:", ruleName);
```

### Testing

Test button functionality using the Wirenboard web interface:
1. Navigate to "Devices & Controls" 
2. Find your GPIO input device
3. Manually toggle the control to simulate button presses
4. Check the logs for action execution

## License

This project is released under CC0 1.0 Universal (Public Domain). See [LICENSE](LICENSE) for details.

## Contributing

Feel free to submit issues and enhancement requests. This module is designed to be easily extensible for additional button press patterns and timing configurations.
