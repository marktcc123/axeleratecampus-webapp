import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// ORDER IS LOAD-BEARING. Both stylesheets define tokens on :root; the second
// wins on source order. Swap these and the site stops being responsive.
// tests/unit/stylesheet-order.test.js asserts this order.
import 'axelerate-design-system/styles.css';
import './styles/responsive.css';

// The barrel's side-effect evaluation injects every component's stylesheet.
// The shell's Link-as-button elements (.ax-btn on <Link>) rely on that
// regardless of which route loads first — keep this even if routes are
// later code-split.
import 'axelerate-design-system';

import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
