// Location coordinates
var latitude = "NN.NN";
var longitude = "NN.NN";
// Generate Key here: https://home.openweathermap.org/api_keys
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

function getWeather() {
    var weather_data = readConfig("/usr/weather/data.json");
    var directions = ["north", "north-west", "west", "south-west", "south", "south-east", "east", "north-east"];

    var lastUpdated = new Date( format(weather_data.dt)*1000 );
    dev["weather/last_updated"] = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    dev["weather/description"] = format(weather_data.weather[0].description);
    dev["weather/icon"] = "http://openweathermap.org/img/wn/" + format(weather_data.weather[0].icon) + "@4x.png";
    dev["weather/temperature"] = parseFloat( format(weather_data.main.temp) );
    dev["weather/feels_like"] = parseFloat( format(weather_data.main.feels_like) );
    dev["weather/temperature_min"] = parseFloat( format(weather_data.main.temp_min) );
    dev["weather/temperature_max"] = parseFloat( format(weather_data.main.temp_max) );
    dev["weather/pressure"] = parseFloat( format(weather_data.main.pressure) );
    dev["weather/humidity"] = parseFloat( format(weather_data.main.humidity) );
    dev["weather/wind_speed"] = parseFloat( format(weather_data.wind.speed) );

    var angle = parseFloat( format(weather_data.wind.deg) );
    dev["weather/wind_direction"] =  angle + "° " + directions[Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8];

    dev["weather/clouds"] = format(weather_data.clouds.all) + "%";
    dev["weather/clouds_description"] = dev["weather/clouds"] + " (" + dev["weather/description"] + ")"; 

    var dateSunrise = new Date( format(weather_data.sys.sunrise)*1000 );
    var dateSunset = new Date( format(weather_data.sys.sunset)*1000 );
    // dev["weather/sunrise"] = dateSunrise.toString();
    // dev["weather/sunset"] = dateSunset.toString();
    dev["weather/sunrise"] = dateSunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    dev["weather/sunset"] = dateSunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // log("Time: {}".format(weather_data.dt));
    // log("Temperature is: {}".format(weather_data.main.temp));
    // log("Humidity is: {}".format(weather_data.main.humidity));
    // log("Wind speed is: {}".format(weather_data.wind.speed));
}

defineRule("weather_call", {	// Periodic call to weather API
    when: cron("@every 30m"),
    then: function() {
        runShellCommand("wget -qO /usr/weather/data.json 'https://api.openweathermap.org/data/2.5/weather?lat="+latitude+"&lon="+longitude+"&units=metric&appid="+appid+"'");
        startTimer("wait_weather", 5*1000);  		// Wait for response from weather API	
    //    log("Request sent");
    }
});

defineRule("weather_update", {
    whenChanged: "weather/get_update",
    then: function() {
      getWeather();
    }
});

defineRule("weather_parse", {	// Read weather data response from API
    when: function() { 
        return timers.wait_weather.firing;
    },
    then: function() {
      getWeather();
    }
});

log("Weather script updated!");
