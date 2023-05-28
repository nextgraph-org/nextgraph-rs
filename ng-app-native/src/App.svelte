<script lang="ts">
  import Router from "svelte-spa-router";

  import Home from "./routes/Home.svelte";
  import Test from "./routes/Test.svelte";
  import NotFound from "./routes/NotFound.svelte";

  const routes = {
    // Exact path
    "/": Home,

    "/test": Test,

    // Catch-all
    // This is optional, but if present it must be the last
    "*": NotFound,
  };
</script>

<main class="container2">
  <Router {routes} />
</main>
