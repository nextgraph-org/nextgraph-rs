<!--
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import {
    createGitgraph,
    templateExtend,
    TemplateName,
  } from "../history/gitgraph-js/gitgraph";
  import ng from "../api";
  import {
    branch_subs,
    active_session,
    cannot_load_offline,
    online,
    get_blob,
  } from "../store";
  import { link } from "svelte-spa-router";
  import { onMount, onDestroy, tick } from "svelte";
  import { Button, Progressbar, Spinner } from "flowbite-svelte";
  import DataClassIcon from "./DataClassIcon.svelte";
  import { t } from "svelte-i18n";
  let is_tauri = import.meta.env.TAURI_PLATFORM;

  let upload_progress: null | { total: number; current: number; error?: any } =
    null;

  let files = $active_session && branch_subs($active_session.private_store_id);

  let gitgraph;

  let next = [
    {
      hash: "I",
      subject: "niko2",
      author: "",
      parents: ["G"],
    },
    {
      hash: "T",
      subject: "niko2",
      author: "",
      parents: ["D", "H"],
    },
    {
      hash: "Z",
      subject: "niko2",
      author: "",
      parents: ["E"],
    },
    {
      hash: "L",
      subject: "niko2",
      author: "",
      parents: ["H"],
    },
    {
      hash: "J",
      subject: "niko2",
      author: "",
      parents: ["L", "Z", "I"],
    },
    {
      hash: "K",
      subject: "niko2",
      author: "",
      parents: ["G", "E"],
    },
    {
      hash: "X",
      subject: "niko2",
      author: "",
      parents: ["I"],
    },
    {
      hash: "Q",
      subject: "niko2",
      author: "",
      parents: ["L", "X"],
    },
  ];

  function add() {
    let n = next.shift();
    if (n) gitgraph.commit(n);
  }

  onMount(async () => {
    const graphContainer = document.getElementById("graph-container");
    gitgraph = createGitgraph(graphContainer, {
      template: templateExtend(TemplateName.Metro, {
        branch: { label: { display: false } },
        commit: { message: { displayAuthor: false } },
      }),
    });

    gitgraph.swimlanes(["A", "F", "C"]);
    gitgraph.import([
      {
        hash: "A",
        subject: "niko2",
        branch: "A",
        parents: [],
        author: "",
        x: 0,
        y: 0,
      },
      {
        hash: "B",
        subject: "niko2",
        branch: "A",
        author: "",
        parents: ["A"],
        x: 0,
        y: 1,
      },
      {
        hash: "D",
        subject: "niko2",
        branch: "A",
        author: "",
        parents: ["B"],
        x: 0,
        y: 2,
      },
      {
        hash: "C",
        subject: "niko2",
        branch: "C",
        author: "",
        parents: ["A"],
        x: 2,
        y: 3,
      },
      {
        hash: "F",
        subject: "niko2",
        branch: "F",
        author: "",
        parents: ["B", "C"],
        x: 1,
        y: 4,
      },
      {
        hash: "G",
        subject: "niko2",
        branch: "F",
        parents: ["F"],
        author: "",
        x: 1,
        y: 5,
      },
      {
        hash: "E",
        subject: "niko2",
        branch: "C",
        author: "",
        parents: ["C"],
        x: 2,
        y: 6,
      },

      // {
      //   hash: "H",
      //   subject: "niko2",
      //   branch: "A",
      //   author: "",
      //   parents: ["D", "G"],
      //   x: 0,
      //   y: 7,
      // },
      // {
      //   hash: "I",
      //   subject: "niko2",
      //   branch: "A",
      //   author: "",
      //   parents: ["D", "H"],
      //   x: 0,
      //   y: 8,
      // },
      // {
      //   hash: "H",
      //   subject: "niko2",
      //   branch: "A",
      //   author: "",
      //   parents: ["D", "G", "E"],
      //   x: 0,
      //   y: 7,
      // },
    ]);

    // window.setTimeout(() => {
    //   gitgraph.commit({
    //     hash: "H",
    //     subject: "niko2",
    //     author: "",
    //     parents: ["D", "G", "E"],
    //   });
    // }, 0);

    window.setTimeout(() => {
      gitgraph.commit({
        hash: "H",
        subject: "niko2",
        author: "",
        parents: ["G", "E"],
      });
    }, 0);

    // window.setTimeout(() => {
    //   gitgraph.commit({
    //     hash: "H",
    //     subject: "niko2",
    //     author: "",
    //     parents: ["G"],
    //   });
    // }, 0);

    // gitgraph.swimlanes(["A", "B", false, "D"]);
    // gitgraph.import([
    //   {
    //     hash: "A",
    //     subject: "niko2",
    //     branch: "A",
    //     parents: [],
    //     author: "",
    //     x: 0,
    //     y: 0,
    //   },
    //   {
    //     hash: "C",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["A"],
    //     x: 0,
    //     y: 1,
    //   },
    //   {
    //     hash: "D",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["C"],
    //     x: 0,
    //     y: 2,
    //   },
    //   {
    //     hash: "E",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["D"],
    //     x: 0,
    //     y: 3,
    //   },
    //   {
    //     hash: "B",
    //     subject: "niko2",
    //     branch: "C",
    //     author: "",
    //     parents: ["A"],
    //     x: 2,
    //     y: 4,
    //   },
    //   {
    //     hash: "G",
    //     subject: "niko2",
    //     branch: "C",
    //     parents: ["B"],
    //     author: "",
    //     x: 2,
    //     y: 5,
    //   },
    //   {
    //     hash: "F",
    //     subject: "niko2",
    //     branch: "B",
    //     author: "",
    //     parents: ["D", "G"],
    //     x: 1,
    //     y: 6,
    //   },

    //   {
    //     hash: "H",
    //     subject: "niko2",
    //     branch: "D",
    //     author: "",
    //     parents: ["G"],
    //     x: 3,
    //     y: 7,
    //   },
    //   // {
    //   //   hash: "I",
    //   //   subject: "niko2",
    //   //   branch: "A",
    //   //   author: "",
    //   //   parents: ["E", "F", "H"],
    //   //   x: 0,
    //   //   y: 8,
    //   // },
    // ]);

    // gitgraph.swimlanes([
    //   "A",
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    //   false,
    // ]);
    // gitgraph.import([
    //   {
    //     hash: "A",
    //     subject: "niko2",
    //     branch: "A",
    //     parents: [],
    //     author: "",
    //     x: 0,
    //     y: 0,
    //   },
    //   {
    //     hash: "B",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["A"],
    //     x: 0,
    //     y: 1,
    //   },
    //   {
    //     hash: "C",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["B"],
    //     x: 0,
    //     y: 2,
    //   },
    //   {
    //     hash: "D",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["C"],
    //     x: 0,
    //     y: 3,
    //   },
    //   {
    //     hash: "E",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["D"],
    //     x: 0,
    //     y: 4,
    //   },
    //   {
    //     hash: "J",
    //     subject: "niko2",
    //     branch: "J",
    //     parents: ["A"],
    //     author: "",
    //     x: 2,
    //     y: 5,
    //   },
    //   {
    //     hash: "K",
    //     subject: "niko2",
    //     branch: "J",
    //     author: "",
    //     parents: ["J"],
    //     x: 2,
    //     y: 6,
    //   },

    //   {
    //     hash: "L",
    //     subject: "niko2",
    //     branch: "L",
    //     author: "",
    //     parents: ["A"],
    //     x: 3,
    //     y: 7,
    //   },
    //   {
    //     hash: "M",
    //     subject: "niko2",
    //     branch: "L",
    //     author: "",
    //     parents: ["L"],
    //     x: 3,
    //     y: 8,
    //   },
    //   {
    //     hash: "G",
    //     subject: "niko2",
    //     branch: "G",
    //     author: "",
    //     parents: ["C", "K", "M"],
    //     x: 1,
    //     y: 9,
    //   },
    //   {
    //     hash: "H",
    //     subject: "niko2",
    //     branch: "G",
    //     author: "",
    //     parents: ["G"],
    //     x: 1,
    //     y: 10,
    //   },
    //   {
    //     hash: "I",
    //     subject: "niko2",
    //     branch: "G",
    //     author: "",
    //     parents: ["H"],
    //     x: 1,
    //     y: 11,
    //   },
    //   {
    //     hash: "F",
    //     subject: "niko2",
    //     branch: "A",
    //     author: "",
    //     parents: ["E", "I"],
    //     x: 0,
    //     y: 12,
    //   },
    //   {
    //     hash: "1",
    //     subject: "niko2",
    //     branch: "1",
    //     author: "",
    //     parents: ["A"],
    //     x: 4,
    //     y: 13,
    //   },
    //   {
    //     hash: "2",
    //     subject: "niko2",
    //     branch: "2",
    //     author: "",
    //     parents: ["A"],
    //     x: 5,
    //     y: 14,
    //   },
    //   {
    //     hash: "3",
    //     subject: "niko2",
    //     branch: "3",
    //     author: "",
    //     parents: ["A"],
    //     x: 6,
    //     y: 15,
    //   },
    //   {
    //     hash: "4",
    //     subject: "niko2",
    //     branch: "4",
    //     author: "",
    //     parents: ["A"],
    //     x: 7,
    //     y: 16,
    //   },
    //   {
    //     hash: "5",
    //     subject: "niko2",
    //     branch: "5",
    //     author: "",
    //     parents: ["A"],
    //     x: 8,
    //     y: 17,
    //   },
    //   {
    //     hash: "6",
    //     subject: "niko2",
    //     branch: "6",
    //     author: "",
    //     parents: ["A"],
    //     x: 9,
    //     y: 18,
    //   },
    //   {
    //     hash: "7",
    //     subject: "niko2",
    //     branch: "7",
    //     author: "",
    //     parents: ["A"],
    //     x: 10,
    //     y: 19,
    //   },
    //   {
    //     hash: "8",
    //     subject: "niko2",
    //     branch: "8",
    //     author: "",
    //     parents: ["A"],
    //     x: 11,
    //     y: 20,
    //   },
    //   {
    //     hash: "9",
    //     subject: "niko2",
    //     branch: "9",
    //     author: "",
    //     parents: ["A"],
    //     x: 12,
    //     y: 21,
    //   },
    // ]);
  });

  let fileinput;

  function uploadFile(upload_id, nuri, file, success) {
    let chunkSize = 1_048_564;
    let fileSize = file.size;
    let offset = 0;
    let readBlock = null;
    upload_progress = { total: fileSize, current: offset };

    let onLoadHandler = async function (event) {
      let result = event.target.result;

      if (event.target.error == null) {
        offset += result.byteLength;
        upload_progress = { total: fileSize, current: offset };

        // console.log("chunk", result);

        let res = await ng.upload_chunk(
          $active_session.session_id,
          upload_id,
          result,
          nuri
        );
        //console.log("chunk upload res", res);
        // if (onChunkRead) {
        //   onChunkRead(result);
        // }
      } else {
        // if (onChunkError) {
        //   onChunkError(event.target.error);
        // }
        return;
      }

      // If finished:
      if (offset >= fileSize) {
        //console.log("file uploaded");
        let res = await ng.upload_chunk(
          $active_session.session_id,
          upload_id,
          [],
          nuri
        );
        //console.log("end upload res", res);
        if (success) {
          upload_progress = { total: fileSize, current: fileSize };
          success(res);
        } else {
          upload_progress = { total: fileSize, current: fileSize, error: true };
        }

        // Make progress bar disappear
        setTimeout(() => {
          upload_progress = null;
        }, 2_500);
        return;
      }

      readBlock(offset, chunkSize, file);
    };

    readBlock = function (offset, length, file) {
      let fileReader = new FileReader();
      let blob = file.slice(offset, length + offset);
      fileReader.onload = onLoadHandler;
      fileReader.readAsArrayBuffer(blob);
    };

    readBlock(offset, chunkSize, file);
    return;
  }

  const onFileSelected = async (e) => {
    let image = e.target.files[0];
    if (!image) return;
    //console.log(image);

    let nuri = {
      target: "PrivateStore",
      entire_store: false,
      access: [],
      locator: [],
    };

    let start_request = {
      V0: {
        command: "FilePut",
        nuri,
        payload: {
          V0: {
            RandomAccessFilePut: image.type,
          },
        },
        session_id: $active_session.session_id,
      },
    };

    let start_res = await ng.app_request(start_request);
    let upload_id = start_res.V0.FileUploading;

    uploadFile(upload_id, nuri, image, async (reference) => {
      if (reference) {
        let request = {
          V0: {
            command: "FilePut",
            nuri,
            payload: {
              V0: {
                AddFile: {
                  filename: image.name,
                  object: reference.V0.FileUploaded,
                },
              },
            },
            session_id: $active_session.session_id,
          },
        };

        await ng.app_request(request);
      }
    });
    fileinput.value = "";
  };
</script>

<div>
  <div id="graph-container"></div>
  {#if $cannot_load_offline}
    <div class="row p-4">
      <p>
        {@html $t("pages.test.cannot_load_offline")}
        <a href="#/user">{$t("pages.user_panel.title")}</a>.
      </p>
    </div>
  {:else}
    <div class="row pt-2">
      <!-- <a use:link href="/">
      <button tabindex="-1" class=" mr-5 select-none"> Back home </button>
    </a> -->
      <Button
        type="button"
        on:click={() => {
          add();
        }}
        class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
      >
        g
      </Button>
      <Button
        disabled={!$online && !is_tauri}
        type="button"
        on:click={() => {
          fileinput.click();
        }}
        class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
      >
        <svg
          class="w-8 h-8 mr-2 -ml-1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        {$t("pages.test.add_image")}
      </Button>
      <input
        style="display:none"
        type="file"
        accept=".jpg, .jpeg, .png"
        on:change={(e) => onFileSelected(e)}
        bind:this={fileinput}
      />
    </div>
    {#if upload_progress !== null}
      <div class="mx-6 mt-2">
        <Progressbar
          progress={(
            (100 * upload_progress.current) /
            upload_progress.total
          ).toFixed(0)}
          labelOutside={$t("pages.test.upload_progress")}
        />
      </div>
    {/if}
    {#if files}
      {#await files.load()}
        <p>{$t("connectivity.loading")}...</p>
      {:then}
        {#each $files as file}
          <p>
            {file.name}

            {#await get_blob(file)}
              <div class="ml-2">
                <Spinner />
              </div>
            {:then url}
              {#if url}
                <img src={url} title={file.nuri} alt={file.name} />
              {/if}
            {/await}
          </p>
        {/each}
      {/await}
    {/if}
  {/if}
</div>
