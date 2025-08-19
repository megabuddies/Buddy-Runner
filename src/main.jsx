import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import './utils/logger.js'; // Инициализируем систему логирования
import './utils/networkOptimizer.js'; // Инициализируем блокировку ненужных сетевых запросов

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);