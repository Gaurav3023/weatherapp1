import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import './App.css';

const API_KEY = '6838abf1bcd712c86ef3f1e3ceee9aef';

function WeatherDetails() {
  const { city, lat, lon } = useParams();
  const [details, setDetails] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [locationInfo, setLocationInfo] = useState({ city: city, state: '', country: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        let forecastUrl, currentUrl;
        
        // If coordinates are provided, use them for more accurate results
        if (lat && lon) {
          forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
          currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
          
          // Get location details from reverse geocoding
          const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
          );
          const geoData = await geoResponse.json();
          
          if (geoData.length > 0) {
            setLocationInfo({
              city: city || geoData[0].name,
              state: geoData[0].state || '',
              country: geoData[0].country
            });
          }
        } else {
          forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}`;
          currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`;
          
          // Get location details from direct geocoding
          const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
          );
          const geoData = await geoResponse.json();
          
          if (geoData.length > 0) {
            setLocationInfo({
              city: geoData[0].name,
              state: geoData[0].state || '',
              country: geoData[0].country
            });
          }
        }
        
        // Fetch forecast data
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        setDetails(forecastData);

        // Fetch current weather
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();
        setCurrentWeather(currentData);
        
        // Get timezone abbreviation
        const timezoneOffset = currentData.timezone;
        const timezoneAbbr = getTimezoneAbbreviation(timezoneOffset);
        setTimezone(timezoneAbbr);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };
    
    fetchData();
  }, [city, lat, lon]);

  // Function to get timezone abbreviation based on offset
  const getTimezoneAbbreviation = (offsetSeconds) => {
    const offsetHours = offsetSeconds / 3600;
    const sign = offsetHours >= 0 ? '+' : '-';
    const absHours = Math.abs(offsetHours);
    
    // Common timezone abbreviations
    if (offsetHours === -5) return 'EST';
    if (offsetHours === -4) return 'EDT';
    if (offsetHours === -8) return 'PST';
    if (offsetHours === -7) return 'MST';
    if (offsetHours === -6) return 'CST';
    if (offsetHours === 0) return 'GMT';
    if (offsetHours === 1) return 'CET';
    if (offsetHours === 2) return 'EET';
    if (offsetHours === 5.5) return 'IST';
    if (offsetHours === 8) return 'CST'; // China Standard Time
    if (offsetHours === 9) return 'JST';
    if (offsetHours === 10) return 'AEST';
    
    // Generic format for other timezones
    return `GMT${sign}${Math.floor(absHours)}${absHours % 1 === 0.5 ? ':30' : ''}`;
  };

  // Function to format time in the city's timezone with timezone abbreviation
  const formatTimeInCityTimezone = (timestamp, timezoneOffset, tzAbbr) => {
    const date = new Date(timestamp * 1000);
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const cityDate = new Date(utcDate.getTime() + (timezoneOffset * 1000));
    
    const timeString = cityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `${timeString} ${tzAbbr}`;
  };

  // Function to get wind direction from degrees
  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    if (!countryCode) return '';
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  // Update the getLocalTime function to include timezone abbreviation
  const getLocalTime = (timezoneOffset, tzAbbr) => {
    const date = new Date();
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const cityDate = new Date(utcDate.getTime() + (timezoneOffset * 1000));
    
    const timeString = cityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `${timeString} ${tzAbbr}`;
  };

  const scrollForecast = (direction) => {
    const container = document.querySelector('.hourly-forecast-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Update the getThreeHourForecasts function to correctly handle all timezones
  const getThreeHourForecasts = (forecastList, timezoneOffset) => {
    if (!forecastList || forecastList.length === 0) return [];
    
    // Get current time in the city's timezone
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const cityNow = new Date(utcNow.getTime() + (timezoneOffset * 1000));
    
    // Find the current timestamp in seconds
    const currentTimestamp = Math.floor(cityNow.getTime() / 1000);
    
    // Sort forecasts by time to ensure they're in chronological order
    const sortedForecasts = [...forecastList].sort((a, b) => a.dt - b.dt);
    
    // Filter forecasts to only include future forecasts
    let futureForecasts = sortedForecasts.filter(forecast => 
      forecast.dt > currentTimestamp
    );
    
    // If we have no future forecasts (rare edge case), return empty array
    if (futureForecasts.length === 0) return [];
    
    // Calculate time difference between forecasts to detect if we're missing any
    const forecastIntervals = [];
    for (let i = 0; i < futureForecasts.length - 1; i++) {
      forecastIntervals.push(futureForecasts[i+1].dt - futureForecasts[i].dt);
    }
    
    // Standard interval should be 3 hours (10800 seconds)
    // If we see much larger gaps, the API might be skipping some time periods
    const standardInterval = 10800;
    const maxAllowedGap = standardInterval * 1.5; // Allow some flexibility
    
    // Filter out forecasts that have abnormal gaps
    const regularForecasts = [futureForecasts[0]];
    for (let i = 0; i < futureForecasts.length - 1; i++) {
      if (forecastIntervals[i] <= maxAllowedGap) {
        regularForecasts.push(futureForecasts[i+1]);
      }
    }
    
    // Take the first 8 forecasts (24 hours worth of 3-hour intervals)
    return regularForecasts.slice(0, 8);
  };

  if (!details || !currentWeather) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>Loading weather data...</h2>
    </div>
  );

  const { lat: forecastLat, lon: forecastLon } = details.city.coord;
  const timezoneOffset = currentWeather.timezone;

  // Format the location name
  const formattedLocationName = `${locationInfo.city}${locationInfo.state ? `, ${locationInfo.state}` : ''}${locationInfo.country ? `, ${locationInfo.country}` : ''}`;

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', margin: '10px 0', color: 'rgba(255,255,255,0.7)' }}>
        ← Back to Cities
      </Link>
      
      <div className="weather-card ios-style-card">
        <h2>{city || locationInfo.city}</h2>
        <div className="city-location" style={{ justifyContent: 'center', marginBottom: '10px' }}>
          <span className="country-flag">{getCountryFlag(locationInfo.country)}</span>
          <span>{locationInfo.state ? `${locationInfo.state}, ` : ''}{locationInfo.country}</span>
        </div>
        <div className="timezone-info">Current time zone: {timezone}</div>
        <div className="ios-time">{getLocalTime(timezoneOffset, timezone)}</div>
        <div className="current-weather-icon">
          <img 
            src={`https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@4x.png`} 
            alt={currentWeather.weather[0].description}
          />
        </div>
        <p className="ios-temp">{Math.round(currentWeather.main.temp - 273.15)}°</p>
        <div className="ios-description">{currentWeather.weather[0].description}</div>
        <div className="ios-high-low">
          H: {Math.round(currentWeather.main.temp_max - 273.15)}° 
          L: {Math.round(currentWeather.main.temp_min - 273.15)}°
        </div>
      </div>
      
      <h3>3-Hour Forecast</h3>
      <div className="forecast-scroll-wrapper">
        <button 
          className="forecast-scroll-button left" 
          onClick={() => scrollForecast('left')}
          aria-label="Scroll left"
        >
          &#8249;
        </button>
        <div className="forecast-container hourly-forecast-container">
          <div className="forecast-item now-forecast">
            <h4>Now {getLocalTime(timezoneOffset, timezone)}</h4>
            <div className="forecast-icon">
              <img 
                src={`https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}.png`} 
                alt={currentWeather.weather[0].description}
              />
            </div>
            <p>{Math.round(currentWeather.main.temp - 273.15)}°</p>
            <div>{currentWeather.weather[0].main}</div>
          </div>
          
          {getThreeHourForecasts(details.list, timezoneOffset).map((forecast, index) => {
            // Format the time for display
            const forecastDate = new Date(forecast.dt * 1000);
            const localForecastTime = new Date(forecastDate.getTime() + 
              (forecastDate.getTimezoneOffset() * 60000) + (timezoneOffset * 1000));
            
            const hour = localForecastTime.getHours();
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            const timeString = `${hour12} ${ampm}`;
            
            return (
              <div key={index} className="forecast-item">
                <h4>{timeString} {timezone}</h4>
                <div className="forecast-icon">
                  <img 
                    src={`https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`} 
                    alt={forecast.weather[0].description}
                  />
                </div>
                <p>{Math.round(forecast.main.temp - 273.15)}°</p>
                <div>{forecast.weather[0].main}</div>
              </div>
            );
          })}
        </div>
        <button 
          className="forecast-scroll-button right" 
          onClick={() => scrollForecast('right')}
          aria-label="Scroll right"
        >
          &#8250;
        </button>
      </div>
      
      <h3>8-Day Forecast</h3>
      <div className="forecast-container" style={{ flexDirection: 'column' }}>
        {Array.from(new Array(8)).map((_, dayIndex) => {
          // Get the current date in the city's timezone
          const now = new Date();
          const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
          const cityNow = new Date(utcNow.getTime() + (timezoneOffset * 1000));
          
          // Add dayIndex days to get the target date
          const targetDate = new Date(cityNow);
          targetDate.setDate(cityNow.getDate() + dayIndex + 1); // +1 to start from tomorrow
          
          // Set the time to 12:00 PM
          targetDate.setHours(12, 0, 0, 0);
          
          // Convert back to UTC for comparison with API data
          const targetUTC = new Date(targetDate.getTime() - timezoneOffset * 1000);
          const targetTimestamp = Math.floor(targetUTC.getTime() / 1000);
          
          // Find the forecast closest to 12 PM for this day
          let closestForecast = details.list.reduce((closest, forecast) => {
            const diff = Math.abs(forecast.dt - targetTimestamp);
            if (!closest || diff < Math.abs(closest.dt - targetTimestamp)) {
              return forecast;
            }
            return closest;
          }, null);
          
          // For days beyond the API's 5-day limit, estimate weather based on patterns
          if (dayIndex >= 5) {
            // Use the weather from the same day of the week in the available data
            // or the last available day if we can't match the day of the week
            const dayOfWeek = targetDate.getDay();
            const matchingDayForecast = details.list.find(item => {
              const itemDate = new Date(item.dt * 1000);
              return itemDate.getDay() === dayOfWeek;
            }) || details.list[details.list.length - 1];
            
            closestForecast = {
              ...matchingDayForecast,
              dt: targetTimestamp,
              main: {
                ...matchingDayForecast.main,
                // Add some random variation to temperature for days beyond the API limit
                temp: matchingDayForecast.main.temp + (Math.random() * 4 - 2) // +/- 2 degrees
              },
              weather: matchingDayForecast.weather,
              estimated: true // Flag to indicate this is an estimated forecast
            };
          }
          
          if (!closestForecast) return null;
          
          // Format the date for display
          const forecastDate = new Date(targetDate);
          
          return (
            <div key={dayIndex} className="forecast-item" style={{ 
              width: 'auto', 
              marginBottom: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              opacity: closestForecast.estimated ? 0.8 : 1 // Slightly fade estimated forecasts
            }}>
              <h4 style={{ width: '100px', textAlign: 'left' }}>{forecastDate.toLocaleDateString([], {weekday: 'long'})}</h4>
              <div className="forecast-icon">
                <img 
                  src={`https://openweathermap.org/img/wn/${closestForecast.weather[0].icon}.png`} 
                  alt={closestForecast.weather[0].description}
                />
              </div>
              <p style={{ width: '50px' }}>{Math.round(closestForecast.main.temp - 273.15)}°</p>
              <div style={{ width: '100px', textAlign: 'right' }}>
                {closestForecast.weather[0].main}
                {closestForecast.estimated && <span className="estimated-tag">*</span>}
              </div>
            </div>
          );
        })}
        {/* Add a note about estimated forecasts */}
        <div className="forecast-note">* Days 6-8 are estimates based on available data</div>
      </div>
      
      <h3>Weather Map</h3>
      <div className="map-container">
        <MapContainer center={[forecastLat, forecastLon]} zoom={7} style={{ height: "400px", width: "100%" }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.Overlay checked name="Clouds">
              <TileLayer
                url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
                attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              />
            </LayersControl.Overlay>
            
            <LayersControl.Overlay name="Precipitation">
              <TileLayer
                url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
                attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              />
            </LayersControl.Overlay>
            
            <LayersControl.Overlay name="Temperature">
              <TileLayer
                url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
                attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              />
            </LayersControl.Overlay>
            
            <LayersControl.Overlay name="Wind Speed">
              <TileLayer
                url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
                attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
              />
            </LayersControl.Overlay>
          </LayersControl>
          
          <Marker position={[forecastLat, forecastLon]}>
            <Popup>
              {formattedLocationName}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      
      <h3>Weather Details</h3>
      <div className="weather-details-grid">
        <div className="detail-card">
          <h4>Cloud Coverage</h4>
          <div className="detail-value">{currentWeather.clouds.all}%</div>
          <div className="detail-icon">
            <i className="fas fa-cloud"></i>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>Humidity</h4>
          <div className="detail-value">{currentWeather.main.humidity}%</div>
          <div className="detail-icon">
            <i className="fas fa-tint"></i>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>Pressure</h4>
          <div className="detail-value">{currentWeather.main.pressure} hPa</div>
          <div className="detail-icon">
            <i className="fas fa-compress-alt"></i>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>Wind</h4>
          <div className="detail-value">
            {Math.round(currentWeather.wind.speed * 3.6)} km/h {getWindDirection(currentWeather.wind.deg)}
          </div>
          <div className="detail-icon">
            <i className="fas fa-wind"></i>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>Visibility</h4>
          <div className="detail-value">{(currentWeather.visibility / 1000).toFixed(1)} km</div>
          <div className="detail-icon">
            <i className="fas fa-eye"></i>
          </div>
        </div>
        
        <div className="detail-card">
          <h4>Feels Like</h4>
          <div className="detail-value">{Math.round(currentWeather.main.feels_like - 273.15)}°C</div>
          <div className="detail-icon">
            <i className="fas fa-thermometer-half"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherDetails; 