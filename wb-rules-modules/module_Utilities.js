var Utilities = {};

/**
 * Capitalizes first letters of words in string.
 * @param {string} str String to be modified
 * @param {boolean=false} lower Whether all other letters should be lowercased
 * @return {string}
 * @usage
 *   toCapitals('fix this string');     // -> 'Fix This String'
 *   toCapitals('javaSCrIPT');          // -> 'JavaSCrIPT'
 *   toCapitals('javaSCrIPT', true);    // -> 'Javascript'
 */
Utilities.toCapitals = function (str, lower) {
    lower = lower || false;
    return (lower ? str.toLowerCase() : str).replace(/\b\w/g, function(match){ return match.toUpperCase() });
}

// Type specific part of the Home Assistant discovery config, keyed by device_type.
// Add "light", "cover", "sensor" here to support them.
var DISCOVERY_TYPES = {
    "switch": function (entity, control) {
        entity.state_topic = "~/" + control;
        entity.command_topic = "~/" + control + "/on";
        entity.payload_on = "1";
        entity.payload_off = "0";
        entity.device_class = "switch";
    }
};

/**
 * Initialize MQTT Discovery topic for Home Assisstant
 * @param {string} device
 * @param {string} control
 * @param {string} device_type Supported device_type: switch
 * @param {str} suggested_area
 * @returns {boolean} true if the discovery config was published
 */
Utilities.mqttDiscovery = function (device, control, device_type, suggested_area) {

    var configure = DISCOVERY_TYPES[device_type];
    if (!configure) {
        log.warning("mqttDiscovery: device_type '{}' is not supported (supported: {})",
            device_type, Object.keys(DISCOVERY_TYPES).join(", "));
        return false;
    }

    var entity = {
        "~": "/devices/" + device + "/controls",
        name: Utilities.toCapitals(device + " " + control),
        unique_id: device + "_" + control,
        // Wiren Board reports control errors ("r", "w", "p"...) in meta/error, empty or "0" means no error
        availability_topic: "~/" + control + "/meta/error",
        availability_template: "{{ 'online' if value in ['', '0'] else 'offline' }}",
        device: {
            name: Utilities.toCapitals(device),
            identifiers: [device],
            manufacturer: "N/A",
            model: "N/A",
            suggested_area: suggested_area
        }
    };
    configure(entity, control);

    // Home Assistant shows the entity as unavailable until the first availability message,
    // and Wiren Board publishes meta/error only on failures - so seed it as "no error"
    publish("/devices/" + device + "/controls/" + control + "/meta/error", "0", 1, true);

    // Retained, so Home Assistant gets the config again after its own restart
    publish("homeassistant/" + device_type + "/" + device + "_" + control + "/config", JSON.stringify(entity), 1, true);
    return true;
}


exports.Utilities = Utilities;
