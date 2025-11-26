import {createRoot} from 'react-dom/client'
import './index.css'
import App from '@/App'
import {default as native_api} from "./native-api";
import {init_api} from "./.auth-react/api";
import {select_default_lang} from "./svelte/lang";
import {init_store} from "./svelte/store";
import {bootstrap_native} from "./svelte/store_native";

init_api(native_api);
init_store(bootstrap_native);
select_default_lang();

createRoot(document.getElementById('root')!).render(
  <App/>
)
