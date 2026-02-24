import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/variables.css'
import './theme/reset.css'
import './theme/typography.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
