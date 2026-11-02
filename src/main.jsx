import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import './rooms.css';
import './organizer.css';
import './flow.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
