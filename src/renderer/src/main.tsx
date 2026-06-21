import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// 手書き風フォント（Yomogi）をオフライン同梱
import '@fontsource/yomogi/japanese-400.css'
import '@fontsource/yomogi/latin-400.css'
import './index.css'
import '@xyflow/react/dist/style.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
