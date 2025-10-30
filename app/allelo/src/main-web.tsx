import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { default as web_api } from "../../../sdk/js/api-web";
import {init_api} from "./.auth-react/api";
import { select_default_lang } from "./svelte/lang";
init_api(web_api);
import { init_store } from "./svelte/store";
import { bootstrap_web } from "./svelte/store_web";
init_store(bootstrap_web);
select_default_lang();

createRoot(document.getElementById('root')!).render(

    <App />

)
