import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clickjacking: the site must not work inside a frame on another page
// (GitHub Pages cannot send the X-Frame-Options header).
if (window.top !== window.self) {
  document.body.textContent = 'This page cannot be shown inside a frame.'
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
