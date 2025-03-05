import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './App.css';

// Popular cities from around the world (reduced to 9)
const popularCities = [
  'Tokyo', 'New York', 'London', 
  'Paris', 'Sydney', 'Dubai',
  'Rio de Janeiro', 'Cape Town', 'Toronto'
];

const API_KEY = '6838abf1bcd712c86ef3f1e3ceee9aef';

function WeatherHome() {
  const [weatherData, setWeatherData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        // First get the geo coordinates for each city to ensure we get the correct location
        const geoResponses = await Promise.all(popularCities.map(city => 
          fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`)
        ));
        const geoData = await Promise.all(geoResponses.map(res => res.json()));
        
        // Then fetch weather data using the coordinates
        const weatherPromises = geoData.map(locations => {
          if (locations.length > 0) {
            const location = locations[0];
            return fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}`)
              .then(res => res.json())
              .then(weatherData => ({
                ...weatherData,
                state: location.state || '',
                country: location.country,
                lat: location.lat,
                lon: location.lon,
                // Use the original city name from our list instead of what the API returns
                originalName: popularCities[geoData.indexOf(locations)]
              }));
          }
          return Promise.resolve(null);
        });
        
        const results = await Promise.all(weatherPromises);
        setWeatherData(results.filter(Boolean));
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };
    fetchWeatherData();
  }, []);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSearchError('');
    
    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Fetch city suggestions from API
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${value}&limit=5&appid=${API_KEY}`
      );
      const data = await response.json();
      
      if (data.length === 0) {
        setSearchError('No cities found. Try a different search term.');
      }
      
      // Format suggestions to include country code and coordinates
      const formattedSuggestions = data.map(city => ({
        name: city.name,
        country: city.country,
        state: city.state,
        lat: city.lat,
        lon: city.lon,
        fullName: `${city.name}, ${city.state ? `${city.state}, ` : ''}${city.country}`
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSearchError('Error fetching suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.fullName);
    setSuggestions([]);
    // Navigate with coordinates to ensure the correct city is loaded
    navigate(`/weather/${suggestion.name}/${suggestion.lat}/${suggestion.lon}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Show error message if user tries to submit without selecting from dropdown
    if (searchTerm.trim() !== '') {
      setSearchError('Please select a city from the suggestions dropdown.');
    }
  };

  // Function to get local time for each city
  const getLocalTime = (timezone) => {
    const localTime = new Date();
    const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
    const cityTime = new Date(utcTime + (1000 * timezone));
    
    // Get timezone abbreviation
    const tzAbbr = getTimezoneAbbreviation(timezone);
    
    return cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + tzAbbr;
  };

  // Add this function to get timezone abbreviation based on offset
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

  // Function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div>
      <h2>Gaurav's Global Weather Forecast</h2>
      
      <div className="search-container">
        <form onSubmit={handleSearchSubmit}>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={handleSearchChange} 
            placeholder="Search for a city..." 
            autoComplete="off"
          />
        </form>
        
        {isLoading && <div className="loading-indicator">Loading suggestions...</div>}
        
        {searchError && <div className="search-error">{searchError}</div>}
        
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((suggestion, index) => (
              <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                <span className="country-flag">{getCountryFlag(suggestion.country)}</span>
                <span className="suggestion-text">{suggestion.fullName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <h3>Popular Cities Worldwide</h3>
      <div className="weather-cards-container">
        {weatherData.map(city => (
          <Link 
            to={`/weather/${city.originalName || city.name}/${city.lat}/${city.lon}`} 
            key={city.id} 
            className="city-link"
          >
            <div className="weather-card">
              <div className="city-header">
                <h4>{city.originalName || city.name}</h4>
                <span className="city-time">{getLocalTime(city.timezone)}</span>
              </div>
              <div className="city-location">
                <span className="country-flag">{getCountryFlag(city.country)}</span>
                <span>{city.state ? `${city.state}, ` : ''}{city.country}</span>
              </div>
              <div className="weather-icon">
                <img 
                  src={`https://openweathermap.org/img/wn/${city.weather[0].icon}@2x.png`} 
                  alt={city.weather[0].description}
                />
              </div>
              <p>{Math.round(city.main.temp - 273.15)}°C</p>
              <div className="weather-description">{city.weather[0].main}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default WeatherHome; 
