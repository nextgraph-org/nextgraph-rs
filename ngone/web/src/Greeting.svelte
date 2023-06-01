<script>
  import { onMount } from "svelte";

  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3030/api/v1/";

  let greeting = "";

  async function getWallet() {
    const opts = {
      method: "get",
    };
    const response = await fetch(
      api_url + "bootstrap/I8tuoVE-LRH1wuWQpDBPivlSX8Wle39uHSL576BTxsk",
      opts
    );
    const result = await response.json();
    console.log("Result:", result);
  }

  onMount(() => getWallet());
</script>

<h1>{greeting}</h1>
