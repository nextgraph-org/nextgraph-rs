import App from "./App.svelte";
// You might have some global CSS for the example app itself
// import './app.css';

const app = new App({
  target: document.getElementById("app")!,
});

export default app;
