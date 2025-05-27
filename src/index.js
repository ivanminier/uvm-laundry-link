import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // 👈 this is key

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// 🔥 Disable service worker to clear old manifest
serviceWorkerRegistration.unregister();
