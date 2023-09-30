<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script>
  import { Button, Alert } from "flowbite-svelte";
  import { link } from "svelte-spa-router";
  // @ts-ignore
  import EULogo from "../assets/EU.svg?component";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";

  import { onMount } from "svelte";

  let top;
  function scrollToTop() {
    top.scrollIntoView();
  }

  let display_note_on_local_wallets = false;

  async function bootstrap() {
    scrollToTop();
    let bs;
    try {
      bs = localStorage.getItem("ng_wallets");
    } catch (e) {}
    if (bs) {
      display_note_on_local_wallets = true;
    }
  }

  onMount(() => bootstrap());
</script>

<main class="container3" bind:this={top}>
  <div class="row">
    <a href="#/">
      <Logo class="logo block h-40" alt="NextGraph Logo" />
    </a>
  </div>

  <p class="max-w-sm">
    A <b>NextGraph Wallet</b> is unique to each person.<br /> It stores your
    credentials to access documents. <br />If you already have a wallet, you
    should not create a new one, instead,
    {#if display_note_on_local_wallets}
      <a href="/" use:link>login here with your existing wallet.</a>
    {:else}
      <a href="/wallet/login" use:link>login here with your existing wallet.</a>
    {/if}
    If you never created a NextGraph Wallet before, please choose one of the options
    below to do so now.
  </p>
  {#if display_note_on_local_wallets}
    <Alert color="yellow" class="mt-5">
      Some wallets are saved on this device,<br /> to log in with one of them,
      <a href="/" use:link>click here.</a>
    </Alert>
  {/if}
  <div class="row mt-5">
    <a href="https://nextgraph.eu/#/wallet/create">
      <button
        tabindex="-1"
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        <EULogo class="mr-4 block h-10 w-10" alt="European Union flag" />
        For European Union citizens
      </button>
    </a>
  </div>

  <div class="row mt-5">
    <a href="https://nextgraph.net/#/wallet/create">
      <button
        tabindex="-1"
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        <svg
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          class="mr-4 block h-10 w-10"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        For the rest of the world
      </button>
    </a>
  </div>
  <div class="row mt-5">
    <a href="/install" use:link>
      <button
        tabindex="-1"
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        <svg
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          class=" block h-10 w-10"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
          />
        </svg>
        or

        <svg
          class="mr-4 ml-2 block h-10 w-10"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 64 50"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <defs />
          <g id="Page-1" stroke-width="1" fill="none" fill-rule="evenodd">
            <g
              id="Laptop"
              transform="translate(1.000000, 1.000000)"
              stroke-width="2"
            >
              <path
                d="M56,27 C56,28.1 55.1,29 54,29 L8,29 C6.9,29 6,28.1 6,27 L6,2 C6,0.9 6.9,0 8,0 L54,0 C55.1,0 56,0.9 56,2 L56,26.5 L56,27 L56,27 Z"
                id="Shape"
              />
              <path
                d="M57,31 C57,29.9 56.1,29 55,29 L7,29 C5.9,29 5,29.9 5,31 L0,46 C0,47.1 0.9,48 2,48 L60,48 C61.1,48 62,47.1 62,46 L57,31 L57,31 Z"
                id="Shape"
              />
              <path d="M2,42.9 L61,42.9" id="Shape" />
              <path
                d="M52.1,24 C52.1,25.1 51.2,26 50.1,26 L12,26 C10.9,26 10,25.1 10,24 L10,6 C10,4.9 10.9,4 12,4 L50,4 C51.1,4 52,4.9 52,6 L52.1,24 L52.1,24 Z"
                id="Shape"
              />
              <path d="M22,39 L40,39" id="Shape" />
              <path d="M17.2,39 L20,39" id="Shape" />
              <path d="M12.1,39 L15,39" id="Shape" />
              <path d="M7,39 L10,39" id="Shape" />
              <path d="M9.2,35 L12,35" id="Shape" />
              <path d="M14,35 L17,35" id="Shape" />
              <path d="M19,35 L22,35" id="Shape" />
              <path d="M24,35 L27,35" id="Shape" />
              <path d="M29,35 L32,35" id="Shape" />
              <path d="M34,35 L37,35" id="Shape" />
              <path d="M39,35 L42,35" id="Shape" />
              <path d="M45,35 L48,35" id="Shape" />
              <path d="M50,35 L53,35" id="Shape" />
              <path d="M47,32 L50,32" id="Shape" />
              <path d="M42,32 L45,32" id="Shape" />
              <path d="M37,32 L40,32" id="Shape" />
              <path d="M32,32 L35,32" id="Shape" />
              <path d="M27,32 L30,32" id="Shape" />
              <path d="M22,32 L25,32" id="Shape" />
              <path d="M17.1,32 L20,32" id="Shape" />
              <path d="M12,32 L15,32" id="Shape" />
              <path d="M42,39 L44.8,39" id="Shape" />
              <path d="M47,39 L49.9,39" id="Shape" />
              <path d="M52,39 L55,39" id="Shape" />
            </g>
          </g>
        </svg>
        Install the app
      </button>
    </a>
  </div>
  <div class="row mt-5">
    <a href="https://nextgraph.org/self-host">
      <button
        tabindex="-1"
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        <svg
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          class="mr-4 block h-10 w-10"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
          />
        </svg>
        Self-hosted or local install
      </button>
    </a>
  </div>
  <div class="row mt-5 mb-12">
    <a href="https://nextgraph.org/ng-box/">
      <button
        tabindex="-1"
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
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
        On an NG Box (owned or invited)
      </button>
    </a>
  </div>
</main>
