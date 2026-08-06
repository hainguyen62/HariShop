import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import store from './store'
import './bootstrap.min.css'
import './index.css'
import App from './App'

window.process = window.process || {
  env: { 
    NODE_ENV: 'development',
    PUBLIC_URL: ''
  }
};

document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

ReactDOM.render(
  <HelmetProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </HelmetProvider>,
  document.getElementById('root')
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('Đăng ký Service Worker thất bại:', err))
  })
}