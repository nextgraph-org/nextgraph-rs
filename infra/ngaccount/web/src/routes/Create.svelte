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

<script>
  import { Button } from "flowbite-svelte";
  // @ts-ignore
  import EULogo from "../assets/EU.svg?component";
  // @ts-ignore
  import Logo from "../assets/allelo.svg?component";
  import { link, querystring } from "svelte-spa-router";

  import { onMount } from "svelte";
  let domain = import.meta.env.NG_ACCOUNT_DOMAIN;
  const param = new URLSearchParams($querystring);
  let web = param.get("web");
  let ca = param.get("ca");
  let go_back = true;
  let wait = false;

  let top;
  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://127.0.0.1:3031/api/v1/";
    
  async function register() {
    wait = true;
    const opts = {
      method: "get",
    };
    try {
      const response = await fetch(api_url + "register/" + ca, opts);

      const result = await response.json();
      console.log("Result:", response.status, result); // 400 is error with redirect, 200 ok, 406 is error without known redirect
      if (response.status == 406) {
        await close();
      } else if (response.status == 400) {
        await close(result);
      } else {
        //console.log(result);
        await success(result);
      }
    } catch (e) {
      wait = false;
      error = e.message;
    }
  }

  async function close(result) {
    // @ts-ignore
    if (!web) {
      go_back = false;
      if (result) {
        error = "Closing due to " + (result.error || "an error");
      }
      let event_api = await import("@tauri-apps/api/event");
      wait = true;
      await event_api.emitTo("main", "error", result);
    } else {
      if (result && result.url) {
        error = "We are redirecting you...";
        go_back = false;
        window.location.href = result.url;
      } else {
        wait = true;
        window.location.href = document.referrer;
      }
    }
  }

  async function success(result) {
    // @ts-ignore
    if (!web) {
      let event_api = await import("@tauri-apps/api/event");
      await event_api.emitTo("main", "accepted", result);
    } else {
      window.location.href = result.url;
    }
  }

  async function bootstrap() {
    if (!web) {
      try {
        let window_api = await import("@tauri-apps/api/window");
        const unlisten = await window_api.getCurrentWindow().onCloseRequested(async (event) => {
          let event_api = await import("@tauri-apps/api/event");
          await event_api.emitTo("main", "close");
          //event.preventDefault();
        });
      } catch (e) {
        console.error(e)
      }
    }
  }
  let error;

  onMount(() => bootstrap());

  const accept = async (event) => {
    await register();
  };
  const refuse = (event) => {
    close();
  };
</script>

{#if wait}
  <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
    Please wait...
    <svg
      class="animate-spin mt-10 h-14 w-14 mx-auto"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
{:else}
  <main class="container3" bind:this={top}>
    <div class="row">
      <Logo class="logo block h-24" alt="Allelo Logo" />
      {#if domain == "nextgraph.eu"}
        <EULogo
          class="logo block h-20"
          style="margin-top: 0.5em;"
          alt="European Union Logo"
        />
      {/if}
    </div>
    {#if error}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
        <svg
          class="animate-bounce mt-10 h-16 w-16 mx-auto"
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>

        <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
          An error occurred while registering on this broker:<br />{error}
        </p>
        {#if go_back}
          <button
            on:click|once={close}
            class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
          >
            Go back
          </button>
        {/if}
      </div>
    {:else}
      {#if ca}
        <div class=" max-w-6xl lg:px-8 mx-auto px-4">
          <p class="max-w-xl md:mx-auto lg:max-w-2xl">
            You have selected <b>{domain}</b> as your Broker Service
            Provider.<br />Please read carefully the Terms of Service below,
            before accepting them.
          </p>
        </div>
      {/if}
      <div
        class="px-4 pt-5 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800"
      >
        <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
          <h2 class="pb-5 text-3xl">{domain} Terms of Service</h2>

          <ul class="list-discmb-8 space-y-4 text-left text-gray-500 dark:text-gray-400">
            
          </ul>
          <div class="text-left space-y-4 ">
            <p class=""><span class=" ">Effective date: 2025-10-30</span></p><p class=""><span class=" ">Provider: NAO Cooperative Capital, Inc, a company incorporated in Delaware (&quot;we&quot;, &quot;us&quot;, &quot;Provider&quot;)</span></p><p class=""><span class=" ">Contact: info@allelo.eco</span></p><p class=""><span>These Terms of Service (&quot;Terms&quot;) govern your use of the software, services, and related components provided by Provider (the &quot;Service&quot;). The Service consists of (a) software that can run locally on your device and (b) a server component hosted in the United States that holds </span><span class="">only encrypted user data</span><span class="">. By installing, accessing, or using the Service you agree to these Terms. If you do not agree, do not use the Service.</span></p><hr><p class=""><span class=""></span></p><h1 class="text-2xl" ><span class="">1. Prototype / Beta status</span></h1><p class=""><span>The Service is provided in a </span><span class="">prototype / beta</span><span class="">&nbsp;phase. This means:</span></p><ul class="list-disc"><li class="mb-3 "><span class="">The Service is experimental and may contain bugs, incomplete features, or security imperfections.<br></span></li><li class="mb-3 "><span class="">We may modify, suspend, or discontinue features at any time without prior notice.<br></span></li><li class="mb-3 "><span class="">These Terms are temporary and may be updated more frequently than in a production release. We will attempt to notify users of material changes where practicable.<br></span></li></ul><h1 class="text-2xl" ><span class="">2. Scope of the Service and data handling</span></h1><ul class="list-disc"><li class="mb-3 "><span>The server component operated by Provider is located in the United States and stores </span><span class="">only encrypted data</span><span class="">.<br></span></li><li class="mb-3 "><span class="">You are responsible for maintaining control of any encryption keys, passwords, and secrets used to encrypt/decrypt your data unless otherwise specified in product documentation. Provider does not have access to your unencrypted data unless you explicitly provide it.<br></span></li><li class="mb-3 "><span class="">We use industry-standard encryption algorithms and best practices where reasonably possible. No system is immune to attack; we cannot guarantee absolute security.<br></span></li></ul><h1 class="text-2xl" ><span class="">3. Acceptable use and prohibited conduct</span></h1><p class=""><span class="">You agree not to use the Service, or allow others to use it, for any unlawful or harmful purpose. Prohibited conduct includes (without limitation):</span></p><ul class="list-disc"><li class="mb-3 "><span class="">Attempting to gain unauthorized access to the Service, other accounts, systems, or networks (hacking, brute force, exploitation, bypassing authentication).<br></span></li><li class="mb-3 "><span class="">Introducing malware, viruses, trojans, ransomware, spyware, or other harmful code.<br></span></li><li class="mb-3 "><span class="">Interfering with, degrading, or disrupting any part of the Service, or attempting denial-of-service attacks.<br></span></li><li class="mb-3 "><span class="">Reverse-engineering, decompiling, disassembling, or attempting to extract server-side code or encrypted data in ways not permitted by law.<br></span></li><li class="mb-3 "><span class="">Using the Service to violate privacy, commit fraud, or engage in harassment, stalking, threats, or other abusive behavior.<br></span></li><li class="mb-3 "><span class="">Circumventing limitations, monitoring, or security of the Service.<br></span></li></ul><p class=""><span class="">Violation of the above may result in suspension or termination of access, reporting to law enforcement, and civil or criminal prosecution.</span></p><h1 class="text-2xl" ><span class="">4. User responsibilities</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">Keep account credentials, private keys, and devices secure. Immediately report suspected compromise to info@allelo.eco<br></span></li><li class="mb-3 "><span class="">Use strong, unique passwords and follow any security guidance provided in product documentation.<br></span></li><li class="mb-3 "><span class="">Back up your local data. As a beta product, data loss is possible; Provider is not responsible for loss when caused by factors outside Provider&rsquo;s control.<br></span></li><li class="mb-3 "><span class="">Obtain and maintain all rights, permissions, and consents required to upload and process any content or personal data through the Service.<br></span></li></ul><h1 class="text-2xl" ><span class="">5. Security commitments and limitations</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">We will implement and maintain reasonable administrative, technical, and physical safeguards designed to protect encrypted data in our custody.<br></span></li><li class="mb-3 "><span class="">We will promptly investigate suspected security incidents and, where required by law, provide notifications in accordance with applicable legal requirements.<br></span></li><li class="mb-3 "><span class="">Important:</span><span class="">&nbsp;No security measure or encryption is impenetrable. Provider DOES NOT WARRANT that the Service is immune to hacking, unauthorized access, or data loss. You acknowledge and accept the inherent risks of using a beta software product.<br></span></li></ul><h1 class="text-2xl"><span class="">6. Feedback and improvements</span></h1><ul class="list-disc "><li class="mb-3 "><span class="">If you provide feedback, bug reports, or suggestions (&quot;Feedback&quot;), you grant Provider a worldwide, non-exclusive, royalty-free, perpetual license to use, modify, and incorporate the Feedback into the Service without obligation to you.<br></span></li></ul><h1 class="text-2xl" ><span class="">7. Intellectual property</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">Provider retains all rights, title, and interest in the Service, including software, documentation, and trademarks, except for content you own and upload.<br></span></li><li class="mb-3 "><span class="">You retain rights to the content you upload; however, you grant Provider the limited rights needed to perform the Service (store, encrypt, transmit, and backup your content).<br></span></li></ul><h1 class="text-2xl" ><span class="">8. Disclaimers &mdash; no warranties</span></h1><ul class="list-disc"><li class="mb-3 "><span>THE SERVICE IS PROVIDED </span><span class="">AS IS</span><span>&nbsp;AND </span><span class="">AS AVAILABLE</span><span>, </span><span class="">WITHOUT WARRANTY OF ANY KIND</span><span class="">. TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.<br></span></li><li class="mb-3 "><span class="">Provider does not warrant that encrypted data cannot be decrypted by unauthorized parties or that the Service will prevent hacking or other malicious acts.<br></span></li></ul><h1 class="text-2xl" ><span class="">9. Limitation of liability</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL PROVIDER, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR SUPPLIERS BE LIABLE FOR: (A) INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES; (B) LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS; OR (C) ANY DAMAGES ARISING FROM LOSS OR COMPROMISE OF DATA, EVEN IF PROVIDER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.<br></span></li><li class="mb-3 "><span class="">Provider&rsquo;s aggregate liability for direct damages arising from or related to these Terms will not exceed the greater of (i) the total amount you paid Provider in the prior 12 months or (ii) $1<br></span></li></ul><h1 class="text-2xl" ><span class="">10. Indemnification</span></h1><p class=""><span class="">You agree to indemnify and hold Provider and its affiliates harmless from claims, losses, liabilities, costs, and expenses (including reasonable attorneys&rsquo; fees) arising from: (a) your breach of these Terms; (b) your misuse of the Service; or (c) content you upload that infringes third-party rights or violates law.</span></p><h1 class="text-2xl" ><span class="">11. Termination and suspension</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">We may suspend or terminate your access for violations of these Terms or for other reasons, including security concerns, at our discretion.<br></span></li><li class="mb-3 "><span class="">Upon termination, we may delete encrypted data in our systems in accordance with our retention and deletion policies described in product documentation. You are responsible for exporting and backing up your data prior to termination.<br></span></li></ul><h1 class="text-2xl" ><span class="">12. Changes to these Terms</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">We may update these Terms from time to time. For material changes we will provide notice by email or in-app notice where practicable. Continued use after changes constitutes acceptance.<br></span></li><li class="mb-3 "><span class="">Because the Service is in prototype/beta, you should expect updates to these Terms more frequently than for a production service.<br></span></li></ul><h1 class="text-2xl" ><span class="">13. Governing law and disputes</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">These Terms are governed by the laws of the United States and the state of Delaware. To the extent permitted by law, exclusive venue for disputes will be the state and federal courts located in Delaware.<br></span></li><li class="mb-3 "><span class="">If you are located outside the chosen jurisdiction, you agree that this choice does not deprive you of protections required by local mandatory laws.<br></span></li></ul><h1 class="text-2xl" ><span class="">14. Export controls and compliance</span></h1><p class=""><span class="">You will comply with all applicable export and re-export control laws and regulations. You agree not to use or export the Service in violation of those laws.</span></p><h1 class="text-2xl" ><span class="">15. Enforcement and criminal acts</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">Attempting to hack, damage, or unlawfully access Provider systems or other users&rsquo; accounts is prohibited and may be reported to law enforcement.<br></span></li><li class="mb-3 "><span class="">Provider reserves the right to cooperate with law enforcement and to disclose user information as required by law or court order.<br></span></li></ul><h1 class="text-2xl" ><span class="">16. Miscellaneous</span></h1><ul class="list-disc"><li class="mb-3 "><span class="">If any provision of these Terms is held invalid, the remaining provisions will remain in force.<br></span></li><li class="mb-3 "><span class="">These Terms constitute the entire agreement between you and Provider regarding the Service and supersede prior agreements.<br></span></li></ul><hr><p class=""><span class=""></span></p><p class=""><span class="">Acknowledgment:</span><span class="">&nbsp;By using the Service you acknowledge that you have read, understood, and agree to be bound by these Terms.</span></p><p class=""><span class=""></span></p>
          </div>
        </div>
      </div>
      {#if ca}
        <div class="row mb-10">
          <button
            on:click|once={accept}
            class="mr-5 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
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
                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
              />
            </svg>
            I accept
          </button>
          <button
            on:click|once={refuse}
            class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
          >
            I refuse
          </button>
        </div>
      {/if}
    {/if}
  </main>
{/if}
