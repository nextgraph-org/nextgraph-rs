import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import native_api from "./native-api";
import {init_api} from "./.auth-react/api";
init_api(native_api);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
