import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { seedDemoData } from './db/repository';
import { startAutoSync } from './services/syncService';
import './styles/global.css';

void seedDemoData().finally(() => startAutoSync());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
