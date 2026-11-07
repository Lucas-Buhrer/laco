import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/login.css';
import './styles/layout.css';

createRoot(document.getElementById('raiz')).render(<App />);
