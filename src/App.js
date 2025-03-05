import React from 'react';
import { Route, Routes } from 'react-router-dom';
import WeatherHome from './WeatherHome'; // New component for the main page
import WeatherDetails from './WeatherDetails'; // New component for detailed weather view
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Gaurav's Weather App</h1>
      </header>
      <Routes>
        <Route path="/" element={<WeatherHome />} />
        <Route path="/weather/:city" element={<WeatherDetails />} />
        <Route path="/weather/:city/:lat/:lon" element={<WeatherDetails />} />
      </Routes>
    </div>
  );
}

export default App;
