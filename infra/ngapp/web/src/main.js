import './app.postcss'
import "../../../app/nextgraph/src/styles.css";
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

export default app
