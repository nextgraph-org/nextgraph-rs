<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import ng from "../../api";
  import {
    branch_subscribe,
    active_session,
    online,
    get_blob,
  } from "../../store";
  import { cur_tab, cur_tab_doc_can_edit } from "../../tab";
  import {
    ExclamationTriangle,
    ArrowDownTray,
    ArrowUpTray,
  } from "svelte-heros-v2";

  import { onMount, onDestroy, tick } from "svelte";
  import { Button, Progressbar, Spinner } from "flowbite-svelte";
  import { t } from "svelte-i18n";
  let is_tauri = import.meta.env.TAURI_ENV_PLATFORM;

  let upload_progress: null | { total: number; current: number; error?: any } =
    null;

  let commits =
    $active_session &&
    branch_subscribe(
      $cur_tab.branch.nuri + ":" + $cur_tab.store.overlay,
      false
    );
  let fileinput;

  let file_urls = {};
  const prepare_url = (nuri) => {
    if (!file_urls[nuri]) {
      file_urls[nuri] = {
        click: false,
      };
    }
    return true;
  };

  const download = async (file) => {
    if (is_tauri) {
      await ng.file_save_to_downloads(
        $active_session.session_id,
        file.reference,
        file.name,
        "did:ng:" + $cur_tab.branch.nuri + ":" + $cur_tab.store.overlay
      );
    } else {
      file_urls[file.nuri].url = await get_blob(file, false);
      //console.log(file.name);
      //console.log(file_urls[file.nuri].click);
      await tick();
      file_urls[file.nuri].click.click();
    }
  };

  const isImage = async (url): Promise<boolean> => {
    if (typeof url === "string") {
      let blob = await fetch(url).then((r) => r.blob());
      return blob.type.startsWith("image/");
    }
    return false;
  };

  function uploadFile(upload_id, nuri, file, success) {
    //console.log(nuri);
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
        upload_progress = { total: fileSize, current: fileSize, error: true };
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
          await success(res);
          // Make progress bar disappear
          setTimeout(() => {
            upload_progress = null;
          }, 1_000);
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
    //console.log(image.type);

    let start_request_payload = {
      RandomAccessFilePut: image.type,
    };
    let nuri = "did:ng:" + $cur_tab.branch.nuri + ":" + $cur_tab.store.overlay;
    let start_res = await ng.app_request_with_nuri_command(
      nuri,
      "FilePut",
      $active_session.session_id,
      start_request_payload
    );
    let upload_id = start_res.V0.FileUploading;

    uploadFile(upload_id, nuri, image, async (reference) => {
      if (reference) {
        let file_put_payload = {
          AddFile: {
            filename: image.name,
            object: reference.V0.FileUploaded,
          },
        };
        await ng.app_request_with_nuri_command(
          nuri,
          "FilePut",
          $active_session.session_id,
          file_put_payload
        );
      }
    });
    fileinput.value = "";
  };
</script>

<div class="w-full">
  {#if $cur_tab_doc_can_edit}
    <div class="row pt-2 w-full">
      <Button
        disabled={!$online && !is_tauri}
        type="button"
        on:click={() => {
          fileinput.click();
        }}
        class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
      >
        <ArrowUpTray class="w-8 h-8 mr-2 -ml-1" />
        {$t("doc.file.upload")}
      </Button>
      <input
        style="display:none"
        type="file"
        on:change={(e) => onFileSelected(e)}
        bind:this={fileinput}
      />
    </div>
  {/if}
  {#if upload_progress !== null}
    <div class="mx-6 mt-2">
      <Progressbar
        progress={(
          (100 * upload_progress.current) /
          upload_progress.total
        ).toFixed(0)}
        labelOutside={$t("doc.file.upload_progress")}
      />
    </div>
  {/if}
  {#if commits}
    {#await commits.load()}
      <p>{$t("connectivity.loading")}...</p>
    {:then}
      {#each $commits.files as file}
        <p class="mb-5">
          {#await get_blob(file, true)}
            <div class="ml-2">
              <Spinner />
            </div>
          {:then url}
            {#await isImage(url) then is}
              {#if is}
                <img src={url} title={file.nuri} alt={file.name} />
              {/if}
            {/await}
            <span class="ml-2 text-gray-600">{file.name}<br /></span>
            {#if url === false}
              <span
                ><ExclamationTriangle
                  tabindex="-1"
                  class="ml-2  w-6 h-8 focus:outline-none"
                  style="display:inline"
                />{$t("errors.cannot_load_this_file")}</span
              >
            {:else if prepare_url(file.nuri)}
              <a
                bind:this={file_urls[file.nuri].click}
                href={file_urls[file.nuri].url || ""}
                target="_blank"
                download={file.name}
              ></a>
              <button
                class="ml-2 select-none p-1 pb-0 pt-0 text-gray-600"
                style="box-shadow:none;"
                on:click={() => download(file)}
              >
                <span
                  ><ArrowDownTray
                    tabindex="-1"
                    class="w-6 h-8 mr-3 focus:outline-none"
                    style="display:inline"
                  />{$t("doc.file.download")}</span
                >
              </button>
            {/if}
          {/await}
        </p>
      {/each}
    {/await}
  {/if}
</div>
