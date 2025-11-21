import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { select_default_lang } from "./svelte/lang";
select_default_lang();

createRoot(document.getElementById('root')!).render(

    <App />

)
