import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/i18n'
import App from './App'
import { Providers } from './app/providers'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
)
