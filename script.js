const apiKey = '4bce74331ec314f37c7e89f297c5a65e';
let userTimeZone = 'Asia/Manila'; // Default to Philippine time

document.addEventListener('DOMContentLoaded', () => {
    updateTime(); // Initial time update
    setInterval(updateTime, 1000); // Update time every second

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            getWeatherByCoords(lat, lon);
        }, function(error) {
            console.error("Error getting location:", error);
            getWeatherByCity("Manila");
        });
    } else {
        getWeatherByCity("Manila");
    }

    const cityInput = document.getElementById('city');
    cityInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            getWeather();
        }
    });
});

function updateTime() {
    const timeDisplay = document.getElementById('time-display');
    if (!timeDisplay) return; // Exit if time-display element doesn't exist

    const now = new Date();
    
    const options = {
        timeZone: userTimeZone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    const timeString = now.toLocaleString('en-US', options);
    timeDisplay.textContent = timeString;
}

function getWeatherByCoords(lat, lon) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    fetch(nominatimUrl, {
        headers: { 'User-Agent': 'WeatherApp/1.0 (your.email@example.com)' }
    })
        .then(response => response.json())
        .then(data => {
            console.log('Nominatim response:', data); // Debugging
            const city = extractCityFromNominatim(data);
            if (city) {
                const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
                fetchWeatherData(currentWeatherUrl, forecastUrl);
            } else {
                console.warn('City not found. Falling back to Manila.');
                getWeatherByCity("Manila");
            }
        })
        .catch(error => {
            console.error('Error with Nominatim reverse geocoding:', error);
            getWeatherByCity("Manila");
        });
}

function extractCityFromNominatim(data) {
    if (data && data.address) {
        console.log('Nominatim address details:', data.address); // Debugging
        // Extract city from detailed address fields, prioritizing city over other components
        const city = data.address.city || data.address.town || data.address.village ||
                     data.address.locality || data.address.suburb || data.address.neighborhood ||
                     data.address.hamlet || 'Unknown';

        // If city is not found, attempt a fallback
        if (city === 'Unknown') {
            const addressParts = [data.address.state, data.address.country];
            return addressParts.filter(part => part).join(', ') || 'Unknown';
        }

        return city;
    }
    return 'Unknown';
}

function getWeatherByCity(city) {
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    fetchWeatherData(currentWeatherUrl, forecastUrl);
}

function fetchWeatherData(currentWeatherUrl, forecastUrl) {
    Promise.all([
        fetch(currentWeatherUrl).then(response => response.json()),
        fetch(forecastUrl).then(response => response.json())
    ]).then(([currentData, forecastData]) => {
        console.log('Current weather data:', currentData); // Debugging
        console.log('Forecast data:', forecastData); // Debugging
        displayWeather(currentData);
        displayHourlyForecast(forecastData.list);
    }).catch(error => {
        console.error('Error fetching weather data:', error);
        displayError("Error fetching weather data. Please try again.");
    });
}

function getWeather() {
    const city = document.getElementById('city').value;
    if (!city) {
        displayError("Please enter a city name");
        return;
    }
    getWeatherByCity(city);
}

function displayWeather(data) {
    const weatherDisplay = document.getElementById('weather-display');
    const windInfoDiv = document.getElementById('wind-info');

    if (data.cod === '404') {
        displayError(data.message);
        return;
    }

    const { name: cityName, main: { temp, feels_like }, weather: [{ description, icon }], wind: { speed, deg } } = data;

    const windDirection = getDetailedWindDirection(deg);

    weatherDisplay.innerHTML = `
        <div class="weather-card">
            <h2>${cityName}</h2>
            <div id="time-display"></div>
            <img src="https://openweathermap.org/img/wn/${icon}@4x.png" alt="${description}" class="weather-icon">
            <p class="temperature">${Math.round(temp)}°C</p>
            <p class="feels-like">Feels like: ${Math.round(feels_like)}°C</p>
            <p class="description">${description}</p>
        </div>
    `;

    windInfoDiv.innerHTML = `
        <div class="wind-card">
            <h3>Wind Information</h3>
            <p>Speed: ${speed} m/s</p>
            <p>Direction: ${windDirection}</p>
            <div class="wind-arrow" style="transform: rotate(${deg}deg)">➤</div>
        </div>
    `;
    
    updateTime(); // Update time immediately after displaying weather
}

function displayHourlyForecast(hourlyData) {
    const hourlyForecastDiv = document.getElementById('hourly-forecast');
    hourlyForecastDiv.innerHTML = '<h3>Hourly Forecast</h3>';

    const next24Hours = hourlyData.slice(0, 8);

    const forecastGrid = document.createElement('div');
    forecastGrid.className = 'forecast-grid';

    next24Hours.forEach(item => {
        const { dt, main: { temp }, weather: [{ icon, description }] } = item;
        const dateTime = new Date(dt * 1000);
        const formattedTime = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const hourlyItemHtml = `
            <div class="forecast-item">
                <p class="forecast-time">${formattedTime}</p>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" class="forecast-icon">
                <p class="forecast-temp">${Math.round(temp)}°C</p>
            </div>
        `;

        forecastGrid.innerHTML += hourlyItemHtml;
    });

    hourlyForecastDiv.appendChild(forecastGrid);
}

function getDetailedWindDirection(degree) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degree / 22.5) % 16;
    return `${directions[index]} (${degree}°)`;
}

function displayError(message) {
    const weatherDisplay = document.getElementById('weather-display');
    const windInfoDiv = document.getElementById('wind-info');
    const hourlyForecastDiv = document.getElementById('hourly-forecast');

    weatherDisplay.innerHTML = `<p class="error-message">${message}</p>`;
    windInfoDiv.innerHTML = '';
    hourlyForecastDiv.innerHTML = '';
}
