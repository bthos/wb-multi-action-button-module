/**
 * Virtual Weather Device for Wirenboard
 * 
 * This module creates a virtual weather device that fetches weather data from OpenWeatherMap API
 * and provides various weather-related controls and displays.
 * 
 * Configuration required:
 * - latitude: Geographic latitude coordinate
 * - longitude: Geographic longitude coordinate  
 * - appid: API key from https://home.openweathermap.org/api_keys
 */

// Location coordinates - CONFIGURE THESE VALUES
var latitude = "NN.NN";         // Replace with your latitude
var longitude = "NN.NN";        // Replace with your longitude
// Generate Key here: https://home.openweathermap.org/api_keys
var appid = "<alpha-numeric Key from openweathermap>";  // Replace with your API key

defineVirtualDevice("weather", {
    title: "Weather",
    cells: {
        get_update: {
            type: "pushbutton"
        },
        last_updated: {
            type: "text",
            value: ""
        },
        description: {
            type: "text",
            value: ""
        },
        icon: {
            type: "text",
            value: ""
        },
        temperature: {
            type: "temperature",
            value: 0.0
        },
        feels_like: {
            type: "temperature",
            value: 0.0
        },
        temperature_min: {
            type: "temperature",
            value: 0.0
        },
        temperature_max: {
            type: "temperature",
            value: 0.0
        },
        pressure: {
            type: "atmospheric_pressure",
            value: 0
        },
        humidity: {
            type: "rel_humidity",
            value: 0
        },
        wind_speed: {
            type: "wind_speed",
            value: 0
        },
        wind_direction: {
            type: "text",
            value: "X"
        },
        clouds: {
            type: "text",
            value: "%"
        },
        clouds_description: {
            type: "text",
            value: ""
        },
        sunrise: {
            type: "text",
            value: "00:00"
        },
        sunset: {
            type: "text",
            value: "00:00"
        }
    }
}); 

/**
 * Parses weather data from OpenWeatherMap API response and updates virtual device controls
 * 
 * This function reads the weather data JSON file downloaded by the API call,
 * processes the data, and updates all weather-related device controls with
 * formatted values including temperature, humidity, wind, and astronomical data.
 * 
 * @throws {Error} If weather data file cannot be read or parsed
 */
function getWeather() {
    try {
        var weather_data = readConfig("/usr/weather/data.json");
        var directions = ["north", "north-west", "west", "south-west", "south", "south-east", "east", "north-east"];

        // Parse and format timestamp
        var lastUpdated = new Date( format(weather_data.dt)*1000 );
        dev["weather/last_updated"] = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        
        // Weather description and icon
        dev["weather/description"] = format(weather_data.weather[0].description);
        dev["weather/icon"] = "http://openweathermap.org/img/wn/" + format(weather_data.weather[0].icon) + "@4x.png";
        
        // Temperature data
        dev["weather/temperature"] = parseFloat( format(weather_data.main.temp) );
        dev["weather/feels_like"] = parseFloat( format(weather_data.main.feels_like) );
        dev["weather/temperature_min"] = parseFloat( format(weather_data.main.temp_min) );
        dev["weather/temperature_max"] = parseFloat( format(weather_data.main.temp_max) );
        
        // Atmospheric data
        dev["weather/pressure"] = parseFloat( format(weather_data.main.pressure) );
        dev["weather/humidity"] = parseFloat( format(weather_data.main.humidity) );
        
        // Wind data
        dev["weather/wind_speed"] = parseFloat( format(weather_data.wind.speed) );
        var angle = parseFloat( format(weather_data.wind.deg) );
        dev["weather/wind_direction"] =  angle + "° " + directions[Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8];

        // Cloud data
        dev["weather/clouds"] = format(weather_data.clouds.all) + "%";
        dev["weather/clouds_description"] = dev["weather/clouds"] + " (" + dev["weather/description"] + ")"; 

        // Sunrise/sunset times
        var dateSunrise = new Date( format(weather_data.sys.sunrise)*1000 );
        var dateSunset = new Date( format(weather_data.sys.sunset)*1000 );
        dev["weather/sunrise"] = dateSunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        dev["weather/sunset"] = dateSunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        
    } catch (error) {
        log("Weather: Error processing weather data -", error);
    }
}

// Weather API call rule - executes every 30 minutes
defineRule("weather_call", {
    when: cron("@every 30m"),
    then: function() {
        if (latitude === "NN.NN" || longitude === "NN.NN" || appid.includes("<alpha-numeric")) {
            log("Weather: Please configure latitude, longitude, and API key in virtual_Weather.js");
            return;
        }
        runShellCommand("wget -qO /usr/weather/data.json 'https://api.openweathermap.org/data/2.5/weather?lat="+latitude+"&lon="+longitude+"&units=metric&appid="+appid+"'");
        startTimer("wait_weather", 5*1000);  // Wait 5 seconds for API response
    }
});

// Manual weather update rule - triggered by button press
defineRule("weather_update", {
    whenChanged: "weather/get_update",
    then: function() {
      getWeather();
    }
});

// Weather data parsing rule - triggered after API response delay
defineRule("weather_parse", {
    when: function() { 
        return timers.wait_weather.firing;
    },
    then: function() {
      getWeather();
    }
});

log("Weather: Virtual device script loaded successfully!");
