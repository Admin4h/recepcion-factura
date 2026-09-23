import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Auto-actualizar la app sin F5: cuando hay una version nueva, se recarga sola.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Nueva version lista -> recargar la pagina para tomarla
    updateSW(true)
  },
  onRegisteredSW(swUrl, r) {
    // Chequear updates cada 60 segundos mientras la app esta abierta
    if (r) setInterval(() => { r.update().catch(() => {}) }, 60 * 1000)
  },
})

// Cuando el service worker toma el control (nueva version activa), recargar una vez
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
