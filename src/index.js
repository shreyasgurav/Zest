import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import App from "./components/App";


const root = createRoot(document.getElementById('root'));

ReactDOM.render(
      <App />,
    document.getElementById('root')
  );