import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Links to your main application file
import './index.css'; // Links to the Tailwind CSS entry point

// This command starts the React application and injects it into index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);