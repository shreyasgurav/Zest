import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from "./components/App";


const root = createRoot(document.getElementById('root'));

ReactDOM.render(
    <Auth0Provider
      domain="dev-fcvminbx3u0yygnt.us.auth0.com"
      clientId="gLI8Q4jx6HF6FSO73Qhl65LmFW2otoHJ"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "https://dev-fcvminbx3u0yygnt.us.auth0.com/api/v2/"
      }}
    >
      <App />
    </Auth0Provider>,
    document.getElementById('root')
  );