<script lang="ts">
  let name = "";
  let greetMsg = "";
  let ng;

  if (import.meta.env.NG_APP_WEB) {
    ng = {
      greet: async function (n) {
        return "greetings from web " + n;
      },
    };
  } else {
    import("@tauri-apps/api/tauri").then((tauri) => {
      ng = { greet: (n) => tauri.invoke("greet", { name: n }) };
    });
  }

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await ng.greet(name);
  }
</script>

<div>
  <div class="row">
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button on:click={greet}> Greet </button>
  </div>
  <p>{greetMsg}</p>
</div>
