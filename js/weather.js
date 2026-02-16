/* =====================================================
   CONFIGURATION
===================================================== */
const API_KEY = "9699b6faeef69a3f798228ff4f55119f";
const DEFAULT_CITY = "Bengaluru";

let selectedCity =
  localStorage.getItem("selectedCity") || DEFAULT_CITY;

/* =====================================================
   MESSAGE BANNER
===================================================== */
function showMessage(text, type = "success") {
  const box = document.getElementById("messageBox");
  if (!box) return;

  box.className = `message ${type}`;
  box.innerText = text;

  setTimeout(() => {
    box.innerText = "";
    box.className = "";
  }, 3000);
}

/* =====================================================
   NETWORK STATUS (INDEX ONLY)
===================================================== */
function updateNetworkStatus() {
  const el = document.getElementById("networkStatus");
  if (!el) return;

  if (navigator.onLine) {
    el.innerText = "🟢 You are online";
    el.className = "network-status online";
  } else {
    el.innerText = "🔴 You are offline. Data may not load.";
    el.className = "network-status offline";
  }
}

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);

/* =====================================================
   RECENT CITIES
===================================================== */
let recentCities =
  JSON.parse(localStorage.getItem("recentCities")) || [];

function updateRecentCities(city) {
  recentCities = recentCities.filter(
    c => c.toLowerCase() !== city.toLowerCase()
  );

  recentCities.unshift(city);
  if (recentCities.length > 5) recentCities.pop();

  localStorage.setItem(
    "recentCities",
    JSON.stringify(recentCities)
  );

  renderRecentCities();
}

function renderRecentCities() {
  const list = document.getElementById("recentCities");
  if (!list) return;

  list.innerHTML = "";
  recentCities.forEach(city => {
    const li = document.createElement("li");
    li.innerText = city;
    li.style.cursor = "pointer";
    li.onclick = () => {
      document.getElementById("cityInput").value = city;
      getWeather(true);
    };
    list.appendChild(li);
  });
}

/* =====================================================
   CURRENT WEATHER (INDEX)
===================================================== */
async function getWeather(showAlert = false) {
  const input = document.getElementById("cityInput");
  const city =
    input && input.value ? input.value : selectedCity;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
    );
    const data = await res.json();

    if (data.cod !== 200) {
      showMessage("City not found", "error");
      return;
    }

    selectedCity = data.name;
    localStorage.setItem("selectedCity", selectedCity);

    document.getElementById("cityName").innerText =
      `${data.name}, ${data.sys.country}`;
    document.getElementById("temperature").innerText =
      Math.round(data.main.temp) + " °C";
    document.getElementById("description").innerText =
      data.weather[0].description;
    document.getElementById("details").innerText =
      `Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} km/h`;

    const icon =
      `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const iconEl = document.getElementById("weatherIcon");
    if (iconEl) iconEl.src = icon;

    document.getElementById("feelsLike").innerText =
      Math.round(data.main.feels_like) + " °C";
    document.getElementById("humidity").innerText =
      data.main.humidity + " %";
    document.getElementById("wind").innerText =
      data.wind.speed + " km/h";
    document.getElementById("clouds").innerText =
      data.clouds.all + " %";

    let advice = "Weather conditions are normal.";
    if (data.main.temp > 35)
      advice = "High temperature. Stay hydrated.";
    else if (data.weather[0].main.includes("Rain"))
      advice = "Rain expected. Carry an umbrella.";
    else if (data.main.temp < 20)
      advice = "Cool weather. Wear light warm clothing.";

    document.getElementById("weatherAdvice").innerText = advice;

    updateRecentCities(selectedCity);
    loadHourlyForecast(selectedCity);

    if (showAlert)
      showMessage("Weather updated successfully", "success");

  } catch {
    showMessage("Network error", "error");
  }
}

/* =====================================================
   HOURLY FORECAST
===================================================== */
async function loadHourlyForecast(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
  );
  const data = await res.json();

  const box = document.getElementById("hourlyForecast");
  if (!box) return;

  box.innerHTML = "";
  data.list.slice(0, 8).forEach(item => {
    const time = item.dt_txt.split(" ")[1].slice(0, 5);
    const icon =
      `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;

    const div = document.createElement("div");
    div.className = "hour-card";
    div.innerHTML = `
      <strong>${time}</strong><br>
      <img src="${icon}" width="40"><br>
      ${Math.round(item.main.temp)} °C
    `;
    box.appendChild(div);
  });
}

/* =====================================================
   WEEKLY FORECAST (FREE API SAFE)
===================================================== */
async function loadDailyForecast() {
  const city =
    localStorage.getItem("selectedCity") || DEFAULT_CITY;

  const cityEl = document.getElementById("dailyCity");
  if (cityEl) cityEl.innerText = city;

  const container = document.getElementById("dailyForecast");
  if (!container) return;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
    );
    const data = await res.json();

    container.innerHTML = "";
    const days = {};

    data.list.forEach(item => {
      const date = item.dt_txt.split(" ")[0];
      if (!days[date]) days[date] = [];
      days[date].push(item);
    });

    Object.keys(days).slice(0, 7).forEach(date => {
      const day = days[date][0];
      const icon =
        `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;

      const card = document.createElement("div");
      card.className = "forecast-card";
      card.innerHTML = `
        <strong>${new Date(date).toDateString()}</strong><br>
        <img src="${icon}" width="60"><br>
        ${day.weather[0].description}<br>
        🌡 ${Math.round(day.main.temp)}°C
      `;
      container.appendChild(card);
    });

  } catch {
    container.innerHTML =
      "<p>Unable to load weekly forecast.</p>";
  }
}

/* =====================================================
   AIR QUALITY
===================================================== */
async function loadAirQuality() {
  const city =
    localStorage.getItem("selectedCity") || DEFAULT_CITY;

  document.getElementById("aqCity").innerText = city;

  const geo = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
  );
  const geoData = await geo.json();

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${geoData.coord.lat}&lon=${geoData.coord.lon}&appid=${API_KEY}`
  );
  const data = await res.json();

  document.getElementById("aqiLevel").innerText =
    data.list[0].main.aqi;
  document.getElementById("pm25").innerText =
    data.list[0].components.pm2_5;
  document.getElementById("pm10").innerText =
    data.list[0].components.pm10;
  document.getElementById("co").innerText =
    data.list[0].components.co;
  document.getElementById("no2").innerText =
    data.list[0].components.no2;

  let advice = "Air quality is good.";
  if (data.list[0].main.aqi >= 3)
    advice = "Sensitive groups should be cautious.";
  if (data.list[0].main.aqi >= 4)
    advice = "Avoid outdoor activities.";

  document.getElementById("aqAdvice").innerText = advice;
}

/* =====================================================
   WEATHER ALERTS
===================================================== */
async function loadWeatherAlerts() {
  const city =
    localStorage.getItem("selectedCity") || DEFAULT_CITY;

  document.getElementById("alertCity").innerText = city;

  const geo = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
  );
  const geoData = await geo.json();

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/onecall?lat=${geoData.coord.lat}&lon=${geoData.coord.lon}&exclude=minutely,hourly,daily&appid=${API_KEY}`
  );
  const data = await res.json();

  const box = document.getElementById("alertsContainer");
  if (!box) return;

  box.innerHTML = "";

  if (!data.alerts) {
    box.innerHTML =
      "<div class='alert info'>No active weather alerts.</div>";
    return;
  }

  data.alerts.forEach(a => {
    const div = document.createElement("div");
    div.className = "alert danger";
    div.innerHTML = `
      <strong>${a.event}</strong><br>
      ${a.description}
    `;
    box.appendChild(div);
  });
}

/* =====================================================
   CLIMATE DATA
===================================================== */
async function loadClimateData() {
  const city =
    localStorage.getItem("selectedCity") || DEFAULT_CITY;

  document.getElementById("climateCity").innerText = city;

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
  );
  const data = await res.json();

  document.getElementById("climateTemp").innerText =
    Math.round(data.main.temp) + " °C";
  document.getElementById("climateHumidity").innerText =
    data.main.humidity + " %";
  document.getElementById("climatePressure").innerText =
    data.main.pressure + " hPa";
  document.getElementById("climateWind").innerText =
    data.wind.speed + " km/h";

  document.getElementById("climateInsight").innerText =
    data.main.temp > 35
      ? "Higher-than-normal temperature trend observed."
      : "Climate conditions are within normal range.";
}

/* =====================================================
   CONTACT FORM
===================================================== */
function validateForm() {
  if (!name.value || !email.value || !message.value) {
    showMessage("Please fill all fields", "error");
    return false;
  }
  showMessage("Message sent successfully", "success");
  return false;
}

/* =====================================================
   AUTO LOAD PER PAGE
===================================================== */
window.addEventListener("load", () => {

  updateNetworkStatus();
  renderRecentCities();

  if (document.getElementById("cityInput")) {
    document.getElementById("cityInput").value = selectedCity;
    getWeather(false);
  }

  if (location.pathname.includes("daily.html"))
    loadDailyForecast();

  if (location.pathname.includes("airquality.html"))
    loadAirQuality();

  if (location.pathname.includes("alerts.html"))
    loadWeatherAlerts();

  if (location.pathname.includes("climate.html"))
    loadClimateData();
});
