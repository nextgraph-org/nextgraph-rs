import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { default as native_api } from "./native-api";
import {init_api} from "./.auth-react/api";
import { select_default_lang } from "./svelte/lang";
init_api(native_api);
await select_default_lang();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
