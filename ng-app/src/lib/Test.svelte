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
  import ng from "../api";
  import {
    branch_subs,
    active_session,
    cannot_load_offline,
    online,
  } from "../store";
  import { link } from "svelte-spa-router";
  import { onMount, onDestroy } from "svelte";
  import { Button } from "flowbite-svelte";

  let is_tauri = import.meta.env.TAURI_PLATFORM;

  let files = branch_subs("ok");

  let img_map = {};

  onMount(() => {});

  async function get_img(ref) {
    if (!ref) return false;
    let cache = img_map[ref.nuri];
    if (cache) {
      return cache;
    }
    let prom = new Promise(async (resolve) => {
      try {
        let nuri = {
          target: "PrivateStore",
          entire_store: false,
          access: [{ Key: ref.reference.key }],
          locator: [],
          object: ref.reference.id,
        };

        let file_request = {
          V0: {
            command: "FileGet",
            nuri,
          },
        };

        let final_blob;
        let content_type;
        let unsub = await ng.app_request_stream(
          $active_session.session_id,
          file_request,
          async (blob) => {
            //console.log("GOT APP RESPONSE", blob);
            if (blob.V0.FileMeta) {
              content_type = blob.V0.FileMeta.content_type;
              final_blob = new Blob([], { type: content_type });
            } else if (blob.V0.FileBinary) {
              if (blob.V0.FileBinary.byteLength > 0) {
                final_blob = new Blob([final_blob, blob.V0.FileBinary], {
                  type: content_type,
                });
              } else {
                var imageUrl = URL.createObjectURL(final_blob);

                resolve(imageUrl);
              }
            }
          }
        );
      } catch (e) {
        console.error(e);
        resolve(false);
      }
    });
    img_map[ref.nuri] = prom;
    return prom;
  }

  let fileinput;

  function uploadFile(upload_id, nuri, file, success) {
    let chunkSize = 1048564;
    let fileSize = file.size;
    let offset = 0;
    let readBlock = null;

    let onLoadHandler = async function (event) {
      let result = event.target.result;

      if (event.target.error == null) {
        offset += event.target.result.byteLength;
        //console.log("chunk", event.target.result);

        let res = await ng.upload_chunk(
          $active_session.session_id,
          upload_id,
          event.target.result,
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
          success(res);
        }
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
      },
    };

    let start_res = await ng.app_request(
      $active_session.session_id,
      start_request
    );
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
          },
        };

        await ng.app_request($active_session.session_id, request);
      }
    });
    fileinput.value = "";
  };
</script>

<div>
  {#if $cannot_load_offline}
    <div class="row p-4">
      <p>
        You are offline and using the web app. You need to connect to the broker
        at least once before you can start using the app locally because the web
        app does not keep a local copy of your documents.<br /><br />
        Once connected, if you lose connectivity again, you will be able to have
        limited access to some functionalities. Sending binary files won't be possible,
        because the limit of local storage in your browser is around 5MB.<br
        /><br />
        All those limitations will be lifted once the "UserStorage for Web" feature
        will be released. Stay tuned! <br /><br />
        Check your connection status in the <a href="#/user">user panel</a>.
      </p>
    </div>
  {:else}
    <div class="row pt-2">
      <!-- <a use:link href="/">
      <button tabindex="-1" class=" mr-5 select-none"> Back home </button>
    </a> -->
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
        Add image
      </Button>
      <input
        style="display:none"
        type="file"
        accept=".jpg, .jpeg, .png"
        on:change={(e) => onFileSelected(e)}
        bind:this={fileinput}
      />
    </div>

    {#await files.load()}
      <p>Currently loading...</p>
    {:then}
      {#each $files as file}
        <p>
          {file.V0.File.name}

          {#await get_img(file.V0.File) then url}
            {#if url}
              <img src={url} title={"did:ng" + file.V0.File.nuri} />
            {/if}
          {/await}
        </p>
      {/each}
    {/await}
  {/if}
</div>
