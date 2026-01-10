import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

export function renderApp(container: HTMLElement) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

