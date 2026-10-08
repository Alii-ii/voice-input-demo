import React from 'react';
import { createRoot } from 'react-dom/client';
import Gallery from './gallery.jsx';
import './styles.css';

createRoot(document.getElementById('tool-root')).render(
  <React.StrictMode>
    <Gallery />
  </React.StrictMode>
);
