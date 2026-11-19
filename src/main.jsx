import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource/bangers/latin.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
