import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { initAutoTranslate } from './i18n/autoTranslate'

// In English mode, load the dictionary first so the page never flashes Chinese.
initAutoTranslate()
    .catch((err) => console.error('[i18n] English mode failed to start', err))
    .finally(() => {
        createRoot(document.getElementById('root')!).render(
            <StrictMode>
                <I18nProvider>
                    <App />
                </I18nProvider>
            </StrictMode>,
        )
    })
