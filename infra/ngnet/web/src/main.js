import './app.postcss'
import "../../../../common/src/styles.css";
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

export default app
