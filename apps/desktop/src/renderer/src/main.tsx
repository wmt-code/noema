import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

try {
  document.documentElement.classList.toggle(
    'dark',
    localStorage.getItem('noema:theme') === 'dark'
  )
} catch {
  /* The default theme also works without local storage. */
}
const root = document.getElementById('root')
if (!root) throw new Error('Renderer root element is missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
