import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Global toast container — dùng react-hot-toast */}
    {/* position: top-right theo convention; style phù hợp với design system */}
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{
        duration: 3000,
        className:
          '!rounded-card !border !shadow-card !text-body !font-medium',
        success: {
          iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
        },
        error: {
          duration: 4000,
          iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
        },
        loading: {
          iconTheme: { primary: '#2563eb', secondary: '#ffffff' },
        },
      }}
    />
    <App />
  </React.StrictMode>,
)
