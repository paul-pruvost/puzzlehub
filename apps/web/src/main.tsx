import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import '@puzzlehub/ui/tokens.css';
import './index.css';
import { App } from './app/App';
import { ThemeProvider } from './app/ThemeProvider';
import { AuthProvider } from './app/AuthProvider';
import { CosmeticsProvider } from './app/CosmeticsProvider';
import { OfflineProgressProvider } from './app/OfflineProgressProvider';

const root = document.getElementById('root');
if (!root) throw new Error('élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CosmeticsProvider>
          <OfflineProgressProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </OfflineProgressProvider>
        </CosmeticsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
