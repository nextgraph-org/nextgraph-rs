<script>
  // The params prop contains values matched from the URL
  export let params = {};

  console.log(params);
</script>

<div class="fix">
  <div
    class="h-screen aspect-[3/5] pazzleline max-w-[720px] bg-yellow-300 inner"
  >
    <p>nextgraph URI {params[1]}</p>
  </div>
</div>
