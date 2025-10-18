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
  import { onMount, tick } from "svelte";
  import { t, locale } from "svelte-i18n";
  import { CenteredLayout } from "@ng-org/ui-common/lib";
  import { LogoSimple } from "@ng-org/ui-common/components";
  import { push, default as Router, querystring } from "svelte-spa-router";
  import {
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
  } from "flowbite-svelte";
  import {
    ComputerDesktop,
    GlobeAlt,
    ServerStack
  } from "svelte-heros-v2";

  import { web_origin, host, brokers_info, selected_broker } from '../store';

  let top;
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";

  let redirecting = false;
  let broker_name = "";

  async function select(broker_info) {
    let broker = broker_info[1];
    broker_name = broker_info[0];
    let url;
    if (import.meta.env.DEV && broker.localhost === 1421) {
      // dev mode
      url = "http://localhost:14401/";
    } else if (import.meta.env.NG_DEV && broker.localhost === 14400) {
      // dev mode
      url = "http://localhost:1421/appauth.html";
    } else if (broker.localhost) {
      url = `http://localhost:${broker.localhost}/auth/`;
    } else if (broker.private) {
      //TODO
      url = `http://unimplemented/auth/`;
    } else if (broker.domain) {
      url = `https://${broker.domain}/auth/`;
    } else if (broker.ngbox) {
      url = `https://nextgraph.app/auth/`;
    } else return;

    selected_broker.set(broker);

    redirecting = true;
    await tick();
    let encoded_origin = encodeURIComponent($web_origin);
    window.location.href = url+"#/?o="+encoded_origin;
  }

  onMount(() => {
    if (Object.keys($brokers_info).length == 1) {
      select(Object.entries($brokers_info)[0]);
    }
  });
</script>

{#if redirecting}
  <div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
    {@html $t("pages.login.redirecting")} your Broker at {broker_name},<br/>for logging in to {$host} ...
    <svg
      class="my-10 h-16 w-16 mx-auto"
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
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    </svg>
  </div>
{:else}

{#if Object.keys($brokers_info).length > 1}
<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div class="row mb-5">
      <LogoSimple/>
    </div>
    <div class="row mb-20">
      <Sidebar {nonActiveClass}>
        <SidebarWrapper
          divClass="bg-gray-60 overflow-y-auto py-4 px-3 rounded dark:bg-gray-800"
        >
          <SidebarGroup ulClass="space-y-2" role="menu">
            <li>
              <h2 class="text-xl mb-6">{@html $t("auth.select_broker", {values: { origin:$host }})}</h2>
            </li>
            {#each Object.entries($brokers_info) as broker}
              <li
                tabindex="0"
                role="menuitem"
                class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                on:keypress={()=>select(broker)}
                on:click={()=>select(broker)}
              >
                {#if broker[1].localhost}
                  <ComputerDesktop tabindex="-1"
                    class="w-10 h-10 mr-4 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"/>
                {:else if broker[1].domain}
                  <GlobeAlt tabindex="-1"
                    class="w-10 min-w-10 h-10 mr-4 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"/>
                {:else if broker[1].private}
                  <ServerStack tabindex="-1"
                    class="w-10 h-10 mr-4 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"/>
                {:else if broker[1].ngbox}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                    viewBox="0 0 225 225"
                    class="mr-4 block h-10 w-10"
                    stroke="currentColor"
                    stroke-width="12"
                    fill="none"
                  >
                    <path
                      d="M 88.332599,179.77884 C 72.858008,177.42608 59.581081,170.564 48.8817,159.38898 36.800075,146.77026 30.396139,130.74266 30.396139,113.12381 c 0,-8.81477 1.466462,-16.772273 4.503812,-24.439156 3.697755,-9.333883 8.658122,-16.726264 15.988284,-23.827148 4.07992,-3.952299 5.699054,-5.267377 9.730928,-7.903581 10.263753,-6.710853 20.852276,-10.247623 32.861256,-10.976317 17.083161,-1.036581 33.737521,4.410501 47.100151,15.404873 1.30009,1.069669 2.35446,2.035155 2.34305,2.145524 -0.0114,0.110369 -3.32807,3.135042 -7.37038,6.721489 -4.04229,3.586437 -8.6667,7.731233 -10.27646,9.210635 -1.60975,1.479412 -3.05439,2.689839 -3.21032,2.689839 -0.15591,0 -1.2075,-0.642795 -2.33686,-1.428431 -6.49544,-4.518567 -13.79659,-6.747116 -22.104843,-6.747116 -10.982241,0 -20.054641,3.741852 -27.727158,11.435891 -5.517107,5.532575 -9.233107,12.555305 -10.782595,20.377588 -0.596045,3.00901 -0.594915,11.67153 0.0017,14.67182 3.195984,16.0665 15.801761,28.55358 31.607491,31.30987 3.592183,0.62643 10.334745,0.61437 13.792675,-0.0247 12.10383,-2.2368 22.30712,-9.80603 27.83192,-20.64689 0.66747,-1.30971 1.08703,-2.48825 0.93235,-2.61898 -0.1547,-0.13073 -5.9299,-1.01605 -12.83381,-1.96739 -8.43575,-1.16241 -12.87296,-1.9096 -13.52955,-2.27826 -1.31171,-0.73647 -2.44642,-2.49122 -2.44642,-3.78325 0,-1.012 1.74837,-13.68832 2.1486,-15.57814 0.25598,-1.20873 2.0923,-3.01339 3.3151,-3.25795 0.53677,-0.10735 7.61424,0.73799 15.7688,1.88346 8.13723,1.14303 14.89071,1.97925 15.00772,1.85826 0.11702,-0.12098 0.96445,-5.648553 1.88315,-12.283473 0.95557,-6.900944 1.90122,-12.59548 2.20977,-13.306594 0.29667,-0.683692 0.95765,-1.595052 1.46889,-2.025218 1.77972,-1.497534 2.7114,-1.539742 10.52745,-0.476938 8.31229,1.130266 9.2373,1.347581 10.59333,2.488613 1.41776,1.192951 1.96085,2.424677 1.94866,4.419342 -0.006,0.950347 -0.79507,7.156475 -1.75393,13.791395 -0.95885,6.634933 -1.70069,12.111623 -1.64854,12.170443 0.0522,0.0588 6.18174,0.95872 13.62132,1.99978 9.57969,1.34053 13.80866,2.0595 14.49353,2.46406 1.3199,0.77969 2.13943,2.28402 2.1135,3.87957 -0.0399,2.45278 -2.08103,15.63263 -2.5664,16.57122 -0.57073,1.10369 -2.24485,2.197 -3.38232,2.20889 -0.44831,0.004 -6.79249,-0.82755 -14.09817,-1.84941 -7.3057,-1.02186 -13.34942,-1.79161 -13.43049,-1.71053 -0.0811,0.0811 -1.02469,6.33285 -2.09694,13.89286 -1.24218,8.75802 -2.1547,14.1778 -2.51495,14.93697 -0.62565,1.31846 -2.38302,2.64205 -3.91461,2.94836 -0.8254,0.16509 -9.4024,-0.80047 -11.73007,-1.32049 -0.47193,-0.10544 -1.63157,0.58011 -3.8898,2.29957 -9.71515,7.39729 -20.99725,11.99799 -33.08692,13.49241 -3.79574,0.46921 -13.565667,0.37348 -17.125664,-0.16779 z"
                    />
                    <rect
                      ry="37.596001"
                      y="10.583322"
                      x="14.363095"
                      height="204.86308"
                      width="195.79167"
                    />
                  </svg>
                {/if}
                <span class="text-left text-xl ml-3" style="overflow-wrap: anywhere;">{broker[0]}</span>
              </li>
            {/each}
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
    </div>
  </div>
</CenteredLayout>
{/if}

{/if}