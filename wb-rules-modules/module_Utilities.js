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

/**
 * Initialize MQTT Discovery topic for Home Assisstant
 * @param {string} device 
 * @param {string} control 
 * @param {string} device_type Supported device_type: switch, light, cover, sensor
 * @param {str} suggested_area 
 * @returns {boolean}
 */
Utilities.mqttDiscovery = function (device, control, device_type, suggested_area) {

    var execute = false;
    var key = "homeassistant/"+device_type+"/"+device+"_"+control+"/config";
    var error = "/devices/"+device+"/controls/"+control+"/meta/error";
    var entity = new Object();
    entity["~"] = "/devices/"+ device +"/controls";
    entity.name = Utilities.toCapitals(device +" "+ control);
    entity.payload_on = "1";
    entity.payload_off = "0";
    entity.availability_topic = "~/"+ control +"/meta/error";
    entity.payload_available = "0";
    entity.payload_not_available = "1";

    entity.device = new Object();
    entity.device.name = Utilities.toCapitals(device);
    entity.device.identifiers = device;
    entity.device.manufacturer = "N/A";
    entity.device.model = "N/A";
    // entity.device.via_device = "wirenboard--";
    entity.device.suggested_area = suggested_area;

    switch (device_type) {
        case "switch":
            entity.unique_id = device +"_"+ control;
            entity.state_topic = "~/"+ control;
            entity.command_topic = "~/"+ control +"/on";
            entity.device_class = "switch";
            // entity.icon = "mdi:switch";        
            execute = true;
            break;
        case "light":
            break;
        case "cover":
            break;
        case "sensor":
            break;
        default:
            message = JSON.stringify(entity);
            log("LOG::",message);
            break;
    }

    if (execute) {
        runShellCommand("mosquitto_pub -t '" + error + "' -r -m '0'");
        runShellCommand("mosquitto_pub -t '" + key + "' -m '" + message +"'");    
    }

    return execute;
}


exports.Utilities = Utilities;
