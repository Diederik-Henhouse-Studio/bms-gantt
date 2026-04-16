import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ScenarioRouter } from './ScenarioRouter';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScenarioRouter />
  </React.StrictMode>,
);
