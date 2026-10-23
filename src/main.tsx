import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FinanceProvider } from './context/FinanceContext'
import { ImportDraftProvider } from './context/ImportDraftContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FinanceProvider>
        <ImportDraftProvider>
          <App />
        </ImportDraftProvider>
      </FinanceProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
