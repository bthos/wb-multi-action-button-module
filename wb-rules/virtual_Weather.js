// Location coordinates
var latitude = "NN.NN";
var longitude = "NN.NN";
// Generate Key here: https://home.openweathermap.org/api_keys
// Do not commit a real key to a public repository
var appid = "<alpha-numeric Key from openweathermap>";

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

var WIND_DIRECTIONS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

// Formats unix time (seconds) as local "HH:MM" (Duktape ignores toLocaleTimeString options)
function toHoursMinutes(unixTime) {
    var date = new Date(unixTime * 1000);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

// Wind degrees go clockwise from north: 0 - north, 90 - east
function toWindDirection(degrees) {
    if (typeof degrees !== "number") {
        return "-";
    }
    return degrees + "° " + WIND_DIRECTIONS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

function updateWeather(data) {
    dev["weather/last_updated"] = toHoursMinutes(data.dt);
    dev["weather/description"] = data.weather[0].description;
    dev["weather/icon"] = "https://openweathermap.org/img/wn/" + data.weather[0].icon + "@4x.png";
    dev["weather/temperature"] = data.main.temp;
    dev["weather/feels_like"] = data.main.feels_like;
    dev["weather/temperature_min"] = data.main.temp_min;
    dev["weather/temperature_max"] = data.main.temp_max;
    dev["weather/pressure"] = data.main.pressure;
    dev["weather/humidity"] = data.main.humidity;
    dev["weather/wind_speed"] = data.wind.speed;
    dev["weather/wind_direction"] = toWindDirection(data.wind.deg);
    dev["weather/clouds"] = data.clouds.all + "%";
    dev["weather/clouds_description"] = dev["weather/clouds"] + " (" + data.weather[0].description + ")";
    dev["weather/sunrise"] = toHoursMinutes(data.sys.sunrise);
    dev["weather/sunset"] = toHoursMinutes(data.sys.sunset);
}

// Requests the weather API and updates the device when the response arrives.
// On any failure the previous values are kept.
function fetchWeather() {
    var url = "https://api.openweathermap.org/data/2.5/weather?units=metric" +
        "&lat=" + encodeURIComponent(latitude) +
        "&lon=" + encodeURIComponent(longitude) +
        "&appid=" + encodeURIComponent(appid);

    runShellCommand("wget -qO- '" + url + "'", {
        captureOutput: true,
        exitCallback: function (exitCode, output) {
            if (exitCode !== 0) {
                log.error("Weather: request failed, wget exit code {}", exitCode);
                return;
            }
            try {
                updateWeather(JSON.parse(output));
            } catch (e) {
                log.error("Weather: unexpected response: {}", e);
            }
        }
    });
}

defineRule("weather_call", {	// Periodic call to weather API
    when: cron("@every 30m"),
    then: fetchWeather
});

defineRule("weather_update", {	// Manual update
    whenChanged: "weather/get_update",
    then: fetchWeather
});

fetchWeather();
