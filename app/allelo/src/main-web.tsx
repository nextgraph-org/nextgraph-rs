import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import * as web_api from "../../../sdk/js/lib-wasm/pkg";
import {init_api} from "./.auth-react/api";
init_api(web_api);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
