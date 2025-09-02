const input = document.getElementById('cityInput');
    const weatherInfo = document.getElementById('weatherInfo');
    const weatherAnimation = document.getElementById('weatherAnimation');
    const mapContainer = document.getElementById('mapContainer');
    const historyList = document.getElementById('historyList');
    const forecastContainer = document.getElementById('forecastContainer');
    const rainEffect = document.getElementById('rainEffect');
    const snowEffect = document.getElementById('snowEffect');
    const sunEffect = document.getElementById('sunEffect');
    const aiAnalysisResult = document.getElementById('aiAnalysisResult');
    const aiLoading = document.getElementById('aiLoading');
    const aiAnalysisContent = document.getElementById('aiAnalysisContent');
    const aiError = document.getElementById('aiError');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const historicalChart = document.getElementById('historicalChart');
    
    let map;
    let marker;
    let selectedCoords = null;
    let currentWeatherData = null;
    let tempUnit = 'c'; // Default to Celsius
    const MAX_HISTORY_ITEMS = 10;
    let weatherChart = null;
    let lottieAnimation = null;

    // Gemini API Key
    const GEMINI_API_KEY = "AIzaSyDMrToKPOPFyGGyR-HSMs21VuwuVxVXNwM";

    // Weather animation paths (Lottie)
    const weatherAnimations = {
      sunny: 'https://assets10.lottiefiles.com/packages/lf20_6q0yJh.json',
      cloudy: 'https://assets10.lottiefiles.com/packages/lf20_6q0yJh.json',
      rainy: 'https://assets1.lottiefiles.com/packages/lf20_6q0yJh.json',
      snowy: 'https://assets1.lottiefiles.com/packages/lf20_6q0yJh.json',
      thunder: 'https://assets1.lottiefiles.com/packages/lf20_6q0yJh.json'
    };

    // Set default date range (last 7 days)
    document.addEventListener('DOMContentLoaded', function() {
      renderHistory();
      
      // Set default date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      startDateInput.valueAsDate = startDate;
      endDateInput.valueAsDate = endDate;
    });

    // Initialize map when opened
    function openMap() {
      mapContainer.style.display = 'flex';
      
      if (!map) {
        map = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('click', function(e) {
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker(e.latlng).addTo(map);
          selectedCoords = e.latlng;
        });
      }
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
    }

    function closeMap() {
      mapContainer.style.display = 'none';
    }

    function useCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            if (marker) {
              map.removeLayer(marker);
            }
            map.setView([latitude, longitude], 12);
            marker = L.marker([latitude, longitude]).addTo(map);
            selectedCoords = { lat: latitude, lng: longitude };
          },
          error => {
            alert("Unable to retrieve your location: " + error.message);
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    }

    function useSelectedLocation() {
      if (selectedCoords) {
        getWeatherByCoords(selectedCoords.lat, selectedCoords.lng);
        closeMap();
      } else {
        alert("Please select a location on the map first.");
      }
    }

    // Existing keyboard shortcut
    input.addEventListener("keydown", function(event) {
      if (event.key === "Enter") getWeather();
    });

    function showPage(pageId) {
      // Hide all pages
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });
      
      // Show selected page
      document.getElementById(`${pageId}-page`).classList.add('active');
      
      // Update tab styling
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      event.target.classList.add('active');
    }

    function celsiusToFahrenheit(c) {
      return (c * 9/5) + 32;
    }

    function toggleTempUnit(unit) {
      tempUnit = unit;
      if (currentWeatherData) {
        displayWeather(currentWeatherData);
        renderForecast(currentWeatherData.forecast);
      }
      
      // Update active button state
      document.querySelectorAll('.temp-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
      });
    }

    // Save search history to localStorage
    function saveToHistory(city) {
      let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
      
      // Remove if already exists
      history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
      
      // Add to beginning of array
      history.unshift(city);
      
      // Limit to max items
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }
      
      localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
      renderHistory();
    }

    // Render search history
    function renderHistory() {
      const history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
      
      if (historyList) {
        historyList.innerHTML = history.map(city => 
          `<div class="history-item" onclick="searchFromHistory('${city}')">${city}</div>`
        ).join('');
      }
    }

    // Clear search history
    function clearHistory() {
      localStorage.removeItem('weatherSearchHistory');
      renderHistory();
    }

    // Search from history item click
    function searchFromHistory(city) {
      input.value = city;
      getWeather();
      showPage('current');
    }

    async function getWeather() {
      const city = input.value.trim();
      if (!city) return;
      
      const apiKey = "1eb5e63f8b310afea1aa79bbc9a44705";
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

      try {
        // Fetch current weather
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        if (currentData.cod != 200) {
          weatherInfo.innerHTML = `<p>⚠️ ${currentData.message}</p>`;
          return;
        }

        // Fetch forecast
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        if (forecastData.cod != "200") {
          weatherInfo.innerHTML = `<p>⚠️ Failed to get forecast data</p>`;
          return;
        }

        // Combine data
        currentData.forecast = forecastData;
        currentWeatherData = currentData;
        
        displayWeather(currentData);
        renderForecast(forecastData);
        saveToHistory(city);
        
      } catch (error) {
        weatherInfo.innerHTML = `<p>❌ Failed to fetch data. Please try again.</p>`;
      }
    }

    async function getWeatherByCoords(lat, lon) {
      const apiKey = "1eb5e63f8b310afea1aa79bbc9a44705";
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      try {
        // Fetch current weather
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        if (currentData.cod != 200) {
          weatherInfo.innerHTML = `<p>⚠️ ${currentData.message}</p>`;
          return;
        }

        // Fetch forecast
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        if (forecastData.cod != "200") {
          weatherInfo.innerHTML = `<p>⚠️ Failed to get forecast data</p>`;
          return;
        }

        // Combine data
        currentData.forecast = forecastData;
        currentWeatherData = currentData;
        
        input.value = currentData.name;
        displayWeather(currentData);
        renderForecast(forecastData);
        saveToHistory(currentData.name);
        
      } catch (error) {
        weatherInfo.innerHTML = `<p>❌ Failed to fetch data. Please try again.</p>`;
      }
    }

    function setWeatherBackground(weatherType) {
      // Hide all effects first
      rainEffect.style.display = 'none';
      snowEffect.style.display = 'none';
      sunEffect.style.display = 'none';
      
      // Clear any existing elements
      rainEffect.innerHTML = '';
      snowEffect.innerHTML = '';
      
      // Set body background based on weather
      if (weatherType.includes('rain') || weatherType.includes('drizzle')) {
        document.body.style.background = 'linear-gradient(to bottom, #616161, #9bc5c3)';
        rainEffect.style.display = 'block';
        createRainEffect();
      } else if (weatherType.includes('snow')) {
        document.body.style.background = 'linear-gradient(to bottom, #b6b6b6, #e8e8e8)';
        snowEffect.style.display = 'block';
        createSnowEffect();
      } else if (weatherType.includes('clear')) {
        document.body.style.background = 'linear-gradient(to right, #ffd200, #ffa500)';
        sunEffect.style.display = 'block';
      } else if (weatherType.includes('cloud')) {
        document.body.style.background = 'linear-gradient(to bottom, #a3bded, #6991c7)';
      } else {
        document.body.style.background = 'linear-gradient(to right, #89f7fe, #66a6ff)';
      }
    }

    function createRainEffect() {
      for (let i = 0; i < 50; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.opacity = Math.random() * 0.5 + 0.3;
        rainEffect.appendChild(drop);
      }
    }

    function createSnowEffect() {
      for (let i = 0; i < 30; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.innerHTML = '❄';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.animationDuration = (Math.random() * 3 + 5) + 's';
        flake.style.animationDelay = Math.random() * 5 + 's';
        flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
        flake.style.opacity = Math.random() * 0.5 + 0.3;
        snowEffect.appendChild(flake);
      }
    }

    function loadWeatherAnimation(weatherType) {
      // Destroy previous animation if exists
      if (lottieAnimation) {
        lottieAnimation.destroy();
      }
      
      let animationUrl;
      
      if (weatherType.includes('rain') || weatherType.includes('drizzle')) {
        animationUrl = weatherAnimations.rainy;
      } else if (weatherType.includes('snow')) {
        animationUrl = weatherAnimations.snowy;
      } else if (weatherType.includes('clear')) {
        animationUrl = weatherAnimations.sunny;
      } else if (weatherType.includes('cloud')) {
        animationUrl = weatherAnimations.cloudy;
      } else if (weatherType.includes('thunder')) {
        animationUrl = weatherAnimations.thunder;
      } else {
        animationUrl = weatherAnimations.cloudy;
      }
      
      // Load new animation
      lottieAnimation = lottie.loadAnimation({
        container: weatherAnimation,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: animationUrl
      });
    }

    function renderForecast(forecastData) {
      if (!forecastData || !forecastData.list) return;
      
      // Group forecast by day
      const dailyForecast = {};
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString();
        
        if (!dailyForecast[day]) {
          dailyForecast[day] = {
            date: date,
            temps: [],
            humidity: [],
            icons: [],
            descriptions: []
          };
        }
        
        dailyForecast[day].temps.push(item.main.temp);
        dailyForecast[day].humidity.push(item.main.humidity);
        dailyForecast[day].icons.push(item.weather[0].icon);
        dailyForecast[day].descriptions.push(item.weather[0].main);
      });
      
      // Get the next 5 days
      const forecastDays = Object.keys(dailyForecast).slice(0, 5);
      
      let forecastHTML = '';
      
      forecastDays.forEach(day => {
        const data = dailyForecast[day];
        const minTemp = Math.min(...data.temps);
        const maxTemp = Math.max(...data.temps);
        const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b) / data.humidity.length);
        
        // Find the most frequent weather icon/description
        const iconCounts = {};
        data.icons.forEach(icon => {
          iconCounts[icon] = (iconCounts[icon] || 0) + 1;
        });
        const mostFrequentIcon = Object.keys(iconCounts).reduce((a, b) => 
          iconCounts[a] > iconCounts[b] ? a : b
        );
        
        const descriptionCounts = {};
        data.descriptions.forEach(desc => {
          descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
        });
        const mostFrequentDesc = Object.keys(descriptionCounts).reduce((a, b) => 
          descriptionCounts[a] > descriptionCounts[b] ? a : b
        );
        
        // Format date
        const formattedDate = data.date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        // Convert temps if needed
        const displayMin = tempUnit === 'c' ? minTemp : celsiusToFahrenheit(minTemp);
        const displayMax = tempUnit === 'c' ? maxTemp : celsiusToFahrenheit(maxTemp);
        const tempSymbol = tempUnit === 'c' ? '°C' : '°F';
        
        forecastHTML += `
          <div class="forecast-day">
            <div class="forecast-date">${formattedDate}</div>
            <div>
              <img src="https://openweathermap.org/img/wn/${mostFrequentIcon}.png" 
                   alt="${mostFrequentDesc}" class="forecast-icon" />
            </div>
            <div class="forecast-temp">
              ${displayMin.toFixed(0)}${tempSymbol} / ${displayMax.toFixed(0)}${tempSymbol}<br>
              <small>💧 ${avgHumidity}%</small>
            </div>
          </div>
        `;
      });
      
      forecastContainer.innerHTML = forecastHTML;
    }

    function displayWeather(data) {
      const flagUrl = `https://flagsapi.com/${data.sys.country}/flat/64.png`;
      const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      const localTime = new Date((data.dt + data.timezone) * 1000).toUTCString().replace("GMT", "Local Time");
      const weatherType = data.weather[0].main.toLowerCase();

      // Set weather background and animation
      setWeatherBackground(weatherType);
      loadWeatherAnimation(weatherType);

      // Convert temperatures if needed
      const temp = tempUnit === 'c' ? data.main.temp : celsiusToFahrenheit(data.main.temp);
      const tempMin = tempUnit === 'c' ? data.main.temp_min : celsiusToFahrenheit(data.main.temp_min);
      const tempMax = tempUnit === 'c' ? data.main.temp_max : celsiusToFahrenheit(data.main.temp_max);
      const tempSymbol = tempUnit === 'c' ? '°C' : '°F';

      weatherInfo.innerHTML = `
        <p><strong>${data.name}, ${data.sys.country}</strong>
          <img class="flag" src="${flagUrl}" alt="flag">
        </p>
        <p>${localTime}</p>
        <p><strong>${data.weather[0].main}</strong> - ${data.weather[0].description}</p>
        <p>🌡 Temp: ${temp.toFixed(1)}${tempSymbol}</p>
        <p>📉 Min: ${tempMin.toFixed(1)}${tempSymbol} | 📈 Max: ${tempMax.toFixed(1)}${tempSymbol}</p>
        <p>💧 Humidity: ${data.main.humidity}%</p>
        <div class="temp-toggle">
          <button onclick="toggleTempUnit('c')" data-unit="c" class="${tempUnit === 'c' ? 'active' : ''}">°C</button>
          <button onclick="toggleTempUnit('f')" data-unit="f" class="${tempUnit === 'f' ? 'active' : ''}">°F</button>
        </div>
      `;
    }

    // AI Analysis Functions
    async function generateAIAnalysis() {
      if (!currentWeatherData) {
        aiError.textContent = "Please get current weather data first.";
        aiError.style.display = "block";
        return;
      }

      // Reset UI
      aiError.style.display = "none";
      aiAnalysisContent.innerHTML = "";
      aiLoading.style.display = "block";

      try {
        const prompt = `Provide a detailed weather analysis and recommendations for ${currentWeatherData.name}, ${currentWeatherData.sys.country}. 
        Current conditions: ${currentWeatherData.weather[0].main} (${currentWeatherData.weather[0].description}), 
        Temperature: ${currentWeatherData.main.temp}°C, 
        Humidity: ${currentWeatherData.main.humidity}%, 
        Wind Speed: ${currentWeatherData.wind.speed} m/s.
        
        Please provide:
        1. A brief summary of current conditions
        2. Activity recommendations based on the weather
        3. Health considerations (UV, air quality, etc.)
        4. Any warnings or alerts
        5. What to expect in the next few hours
        
        Format the response in HTML with clear sections.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        const analysisText = result.candidates[0].content.parts[0].text;
        aiAnalysisContent.innerHTML = analysisText;
        
      } catch (error) {
        aiError.textContent = "Failed to generate analysis: " + error.message;
        aiError.style.display = "block";
      } finally {
        aiLoading.style.display = "none";
      }
    }

    // Historical Weather Data Functions
    async function getHistoricalData() {
      const startDate = startDateInput.value;
      const endDate = endDateInput.value;
      
      if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
      }
      
      if (!currentWeatherData) {
        alert("Please get current weather data first.");
        return;
      }
      
      // For demonstration, we'll generate mock historical data
      // In a real app, you would use a weather API that supports historical data
      const mockHistoricalData = generateMockHistoricalData(startDate, endDate, currentWeatherData);
      renderHistoricalChart(mockHistoricalData);
    }

    function generateMockHistoricalData(startDate, endDate, currentData) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      
      const historicalData = [];
      const baseTemp = currentData.main.temp;
      const baseHumidity = currentData.main.humidity;
      
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        
        // Generate realistic variations
        const tempVariation = (Math.random() * 8) - 4; // -4 to +4 degrees
        const humidityVariation = (Math.random() * 20) - 10; // -10 to +10%
        
        historicalData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          temperature: baseTemp + tempVariation,
          humidity: Math.max(20, Math.min(100, baseHumidity + humidityVariation))
        });
      }
      
      return historicalData;
    }

    function renderHistoricalChart(data) {
      const ctx = historicalChart.getContext('2d');
      
      // Destroy previous chart if it exists
      if (weatherChart) {
        weatherChart.destroy();
      }
      
      // Create new chart
      weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.date),
          datasets: [
            {
              label: 'Temperature (°C)',
              data: data.map(d => d.temperature),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              yAxisID: 'y',
              tension: 0.3
            },
            {
              label: 'Humidity (%)',
              data: data.map(d => d.humidity),
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              yAxisID: 'y1',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Temperature (°C)'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: 'Humidity (%)'
              }
            }
          }
        }
      });
    }