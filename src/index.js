import React from "react";
import { createRoot } from 'react-dom/client';
import App from "./components/App";
import { HelmetProvider } from 'react-helmet-async';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);