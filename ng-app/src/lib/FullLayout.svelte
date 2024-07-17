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
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
    Modal,
    Toggle,
  } from "flowbite-svelte";
  import { link, location } from "svelte-spa-router";
  import MobileBottomBarItem from "./MobileBottomBarItem.svelte";
  import MobileBottomBar from "./MobileBottomBar.svelte";
  // @ts-ignore
  import Logo from "./components/Logo.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  // @ts-ignore
  import { t } from "svelte-i18n";
  import { onMount, tick } from "svelte";
  import { cur_branch_has_discrete, cur_tab, cur_viewer, cur_editor, toggle_graph_discrete, open_doc, 
          available_editors, available_viewers, set_editor, set_viewer, set_view_or_edit, toggle_live_edit,
          has_editor_chat } from "../tab";
  import ZeraIcon from "./ZeraIcon.svelte";
  import {
    Home,
    Bolt,
    MagnifyingGlass,
    PlusCircle,
    PaperAirplane,
    Bell,
    User,
    Users,
    Sun,
    Cloud,
    Eye,
    PencilSquare,
    ChatBubbleLeftEllipsis,
    FolderOpen,
    BookOpen,
    Share,
    Envelope,
    Heart,
    AtSymbol,
    Forward,
    Link,
    QrCode,
    DocumentArrowDown,
    ChatBubbleOvalLeft,
    Clock,
    InformationCircle,
    Bookmark,
    Icon,
    ChatBubbleLeftRight,
    LockOpen,
    Cog6Tooth,
    DocumentDuplicate,
    CodeBracketSquare,
    ArrowsPointingOut,
    ShieldCheck,
    Cube,
    Printer,
    CommandLine,
    CodeBracket,
    Beaker,
    WrenchScrewdriver,
    Sparkles,
  } from "svelte-heros-v2";

  let width: number;
  let breakPoint: number = 662;
  let mobile = false;
  let show_menu = true;
  let open_view_as = false;
  let open_edit_with = false;
  let open_share = false;
  let open_tools = false;

  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }

  let top;
  let topMenu;
  async function scrollToTop() {
    await tick();
    top.scrollIntoView();
  }
  async function scrollToTopMenu() {
    await tick();
    topMenu.scrollIntoView();
  }
  onMount(async () => {await open_doc(""); await scrollToTop()});

  $: activeUrl = "#" + $location;

  const launchAppStore = (class_name:string) => {
    //TODO
    show_menu = false;
  };

  const openAction = (action:string) => {
    // TODO
    show_menu = false;
  }

  const openPane = (pane:string) => {
    // TODO
    show_menu = false;
  }

  const openShare = (share:string) => {
    // TODO
    show_menu = false;
  }

  const find = (share:string) => {
    // TODO
    show_menu = false;
  }

  const bookmark = (share:string) => {
    // TODO
    show_menu = false;
  }

  const annotate = (share:string) => {
    // TODO
    show_menu = false;
  }

  const share_items = [
    {n:"repost",i:Bolt},
    {n:"dm",i:PaperAirplane},
    {n:"react",i:Heart},
    {n:"author",i:Envelope},
    {n:"quote",i:AtSymbol},
    {n:"forward",i:Forward},
    {n:"link",i:Link},
    {n:"qr",i:QrCode},
    {n:"download",i:DocumentArrowDown},
  ];

  const tools_items = [
    {n:"copy",i:DocumentDuplicate},
    {n:"embed",i:CodeBracketSquare},
    {n:"schema",i:ArrowsPointingOut},
    {n:"signature",i:ShieldCheck},
    {n:"services",i:Cube},
    {n:"print",i:Printer},
    {n:"console",i:CommandLine},
    {n:"source",i:CodeBracket},
    {n:"dev",i:Beaker},
  ];

  let asideClass = "w-48";
  let spanClass = "flex-1 ml-3 whitespace-nowrap";
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
</script>

<svelte:window bind:innerWidth={width} />

<Modal id="menu-modal"
    outsideclose
    bind:open={show_menu}
    size = 'xs'
    placement = 'top-right'
    backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80 menu-bg-modal"
  >

  <aside style="width:295px;" class="bg-white" aria-label="Sidebar">
    <div class="bg-gray-60 overflow-y-auto dark:bg-gray-800" bind:this={topMenu}>
      <ul class="space-y-1 space-x-0 mb-10">
        {#if $cur_branch_has_discrete}
        <li>
          <div class="inline-flex graph-discrete-toggle mb-2" role="group">
            <button on:click={toggle_graph_discrete} disabled={$cur_tab.graph_or_discrete} type="button" style="border-top-left-radius: 0.375rem;border-bottom-left-radius: 0.375rem;" class:selected-toggle={$cur_tab.graph_or_discrete} class:unselected-toggle={!$cur_tab.graph_or_discrete}  class="common-toggle"  >
              <Sun class="mr-2 focus:outline-none"/> {$t("doc.graph")}
            </button>
            <button on:click={toggle_graph_discrete} disabled={!$cur_tab.graph_or_discrete} type="button" style="border-top-right-radius: 0.375rem;border-bottom-right-radius: 0.375rem;" class:selected-toggle={!$cur_tab.graph_or_discrete} class:unselected-toggle={$cur_tab.graph_or_discrete} class="common-toggle">
              <Cloud class="mr-2 focus:outline-none"/> {$t("doc.discrete")}
            </button>
          </div>
        </li>
        {/if}
        {#if $cur_viewer}
          <MenuItem selected={$cur_tab.view_or_edit} title={$cur_viewer["ng:a"]} clickable={($available_viewers.length > 1 || !$cur_tab.view_or_edit) && function () { if ($available_viewers.length > 1) { open_view_as = !open_view_as; } else { set_view_or_edit(true); show_menu = false; } open_edit_with=false;} }>
            <Eye
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
            />
            <span class="ml-3">{$t("doc.menu.view_as")} {#if $cur_tab.view_or_edit || $available_viewers.length == 1 }{$cur_viewer["ng:n"]}{/if}</span>
          </MenuItem>
          {#if open_view_as && $available_viewers.length > 1 }
            {#each $available_viewers as viewer}
              <MenuItem title={viewer["ng:a"]} extraClass="submenu" clickable={(viewer["ng:g"] !== $cur_viewer["ng:g"] || !$cur_tab.view_or_edit) && function () { set_view_or_edit(true); set_viewer(viewer["ng:g"]); show_menu = false; open_view_as = false} }>
                <ZeraIcon
                  zera={viewer["ng:u"]}
                  config={{
                      tabindex:"-1",
                      class:"w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                    }}
                />
                <span class="ml-3">{viewer["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}
        {/if}
        {#if $cur_tab.doc.can_edit}
          {#if $cur_editor}
            <MenuItem title={$cur_editor["ng:a"]} selected={!$cur_tab.view_or_edit} clickable={ ($available_editors.length > 1 || $cur_tab.view_or_edit) && function () { if ($available_editors.length > 1) { open_edit_with = !open_edit_with;  } else { set_view_or_edit(false); show_menu = false; } open_view_as=false;} }>
              <PencilSquare
                tabindex="-1"
                class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
              />
              <span class="ml-3">{$t("doc.menu.edit_with")} {#if !$cur_tab.view_or_edit || $available_editors.length == 1 }{$cur_editor["ng:n"]}{/if}</span>
            </MenuItem>
            {#if open_edit_with && $available_editors.length > 1 }
              {#each $available_editors as editor}
                <MenuItem title={editor["ng:a"]} extraClass="submenu" clickable={(editor["ng:g"] !== $cur_editor["ng:g"] || $cur_tab.view_or_edit) && function () { set_view_or_edit(false); set_editor(editor["ng:g"]); show_menu = false; open_edit_with = false} }>
                  <ZeraIcon
                    zera={editor["ng:u"]}
                    config={{
                        tabindex:"-1",
                        class:"w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                      }}
                  />
                  <span class="ml-3">{editor["ng:n"]}</span>
                 
                </MenuItem>
              {/each}
            {/if}
            {#if !$cur_tab.view_or_edit || open_edit_with }
              <li title={$t("doc.menu.live_editing_description")} style="margin: 7px 0; padding-left: 32px;" class="toggle">
                <Toggle
                  on:change={ toggle_live_edit }
                  checked={  $cur_tab.doc.live_edit }
                  ><span class="text-gray-700 text-base">{$t("doc.menu.live_editing")}</span>
                </Toggle>
              </li>
            {/if}
          {:else}
            <MenuItem clickable={()=>launchAppStore($cur_tab.cur_branch.class)}>
              <ZeraIcon
                zera="app_store"
                config={{tabindex:"-1",
                class:"w-7 h-7 text-gray-700  focus:outline-none  dark:text-white "}}
              />
              <span class="ml-3">{$t("doc.menu.install_app_to_edit")}</span>
            </MenuItem>
          {/if}
        {/if}
        {#if $cur_tab.doc.can_edit}
          <MenuItem title={$t("doc.menu.items.new_block.desc")} clickable={ ()=> openAction("new_block") }>
            <PlusCircle
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
            />
            <span class="ml-3">{$t("doc.menu.items.new_block.label")}</span>
          </MenuItem>
        {/if}
        {#if $has_editor_chat}
          <MenuItem title={$t("doc.menu.items.editor_chat.desc")} clickable={ ()=> openPane("chat") }>
            <ChatBubbleLeftRight
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
            />
            <span class="ml-3">{$t("doc.menu.items.editor_chat.label")}</span>
          </MenuItem>
        {/if}
        <MenuItem title={$t("doc.menu.items.folders.desc")} clickable={ ()=> openPane("folders") }>
          <FolderOpen
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.folders.label")}</span>
        </MenuItem>
        <MenuItem title={$t("doc.menu.items.toc.desc")} clickable={ ()=> openPane("toc") }>
          <BookOpen
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.toc.label")}</span>
        </MenuItem>
        <MenuItem title={$t("doc.menu.items.mc.desc")} clickable={ ()=> openPane("mc") }>
          <Sparkles
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.mc.label")}</span>
        </MenuItem>
        
        <MenuItem title={$t("doc.menu.items.share.desc")} clickable={ () => open_share = !open_share }>
          <Share
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.share.label")}</span>
        </MenuItem>
        {#if open_share }
          {#each share_items as share}
            <MenuItem title={$t(`doc.menu.items.${share.n}.desc`)} extraClass="submenu" clickable={ () => openShare(share.n) }>
              <Icon tabindex="-1" class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  " variation="outline" color="currentColor" icon={share.i} />
              <span class="ml-3">{$t(`doc.menu.items.${share.n}.label`)}</span>
            </MenuItem>
          {/each}
        {/if}

        <MenuItem title={$t("doc.menu.items.comments.desc")} clickable={ ()=> openPane("comments") }>
          <ChatBubbleOvalLeft
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.comments.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.branches.desc")} clickable={ ()=> openPane("branches") }>
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512" fill="currentColor" width="24" height="24" tabindex="-1" class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white" >
            <path d="M365.1,74.6c-43.8,0-80.2,36.4-80.2,80.2c0,38.2,27,70.9,64.3,78.3c-0.9,21.4-12.1,33.6-30.8,48.5
              c-23.3,17.7-53.2,23.3-74.6,27c-46.6,8.4-71.8,30.8-83,45.7V159.5c16.8-2.8,32.6-12.1,44.8-25.2c13.1-14.9,20.5-33.6,20.5-54.1
              C226.2,36.4,189.8,0,146,0S65.7,36.4,65.7,80.2c0,19.6,7.5,38.2,19.6,53.2c11.2,13.1,26.1,21.4,42.9,25.2v195.8
              c-16.8,3.7-31.7,13.1-42.9,25.2c-13.1,14.9-19.6,33.6-19.6,52.2c0,43.8,36.4,80.2,80.2,80.2s80.2-36.4,80.2-80.2
              c0-27-13.1-51.3-35.4-66.2c10.3-11.2,28-22.4,58.8-28c25.2-4.7,60.6-11.2,88.6-32.6c27-20.5,42-42,43.8-73.7
              c37.3-7.5,64.3-40.1,64.3-78.3C445.3,110,408.9,74.6,365.1,74.6L365.1,74.6z M97.5,81.1c0-26.1,21.4-48.5,48.5-48.5
              c26.1,0,48.5,21.4,48.5,48.5S173,129.6,146,129.6C118.9,129.6,97.5,107.2,97.5,81.1z M193.5,433.7c0,26.1-21.4,48.5-48.5,48.5
              c-26.1,0-48.5-21.4-48.5-48.5s21.4-48.5,48.5-48.5C172.1,386.1,193.5,407.5,193.5,433.7z M365.1,202.4c-26.1,0-48.5-21.4-48.5-48.5
              c0-26.1,21.4-48.5,48.5-48.5c26.1,0,48.5,21.4,48.5,48.5C412.7,180.9,391.2,202.4,365.1,202.4z"/>
          </svg>
          <span class="ml-3">{$t("doc.menu.items.branches.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.history.desc")} clickable={ ()=> openPane("history") }>
          <Clock
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.history.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.find.desc")} clickable={ find }>
          <MagnifyingGlass
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.find.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.bookmark.desc")} clickable={ bookmark }>
          <Bookmark
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.bookmark.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.annotate.desc")} clickable={ annotate }>
          <ChatBubbleLeftEllipsis
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.annotate.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.info.desc")} clickable={ ()=> openPane("info") }>
          <InformationCircle
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.info.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.notifs.desc")} clickable={ ()=> openAction("notifs") }>
          <Bell
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.notifs.label")}</span>
        </MenuItem>
        {#if $cur_tab.doc.is_member}
          <MenuItem title={$t("doc.menu.items.permissions.desc")} clickable={ ()=>  openAction("permissions") }>
            <LockOpen
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
            />
            <span class="ml-3">{$t("doc.menu.items.permissions.label")}</span>
          </MenuItem>
        {/if}
        <MenuItem title={$t("doc.menu.items.settings.desc")} clickable={ ()=>  openAction("settings") }>
          <Cog6Tooth
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.settings.label")}</span>
        </MenuItem>

        <MenuItem title={$t("doc.menu.items.tools.desc")} clickable={ () => open_tools = !open_tools }>
          <WrenchScrewdriver
            tabindex="-1"
            class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
          />
          <span class="ml-3">{$t("doc.menu.items.tools.label")}</span>
        </MenuItem>
        {#if open_tools }
          {#each tools_items as tool}
            <MenuItem title={$t(`doc.menu.items.${tool.n}.desc`)} extraClass="submenu" clickable={ () => openAction(tool.n) }>
              <Icon tabindex="-1" class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  " variation="outline" color="currentColor" icon={tool.i} />
              <span class="ml-3">{$t(`doc.menu.items.${tool.n}.label`)}</span>
            </MenuItem>
          {/each}
        {/if}
      </ul>
    </div>
  </aside>
</Modal>

{#if mobile}
  <div class="full-layout">
    <main class="pb-14" bind:this={top}>
      <slot />
    </main>
    <MobileBottomBar {activeUrl}>
      <MobileBottomBarItem href="#/" icon={Home} on:click={scrollToTop}>
        <span
          class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
        >
          13
        </span>
      </MobileBottomBarItem>
      <MobileBottomBarItem href="#/stream" icon={Bolt} on:click={scrollToTop} />
      <MobileBottomBarItem
        href="#/search"
        icon={MagnifyingGlass}
        on:click={scrollToTop}
      />
      <MobileBottomBarItem href="#/create" icon={PlusCircle} />
      <MobileBottomBarItem href="#/site" icon={User} on:click={scrollToTop} />
    </MobileBottomBar>
  </div>
{:else}
  <div class="full-layout">
    <Sidebar {activeUrl} {asideClass} {nonActiveClass} class="fixed">
      <SidebarWrapper
        divClass="bg-gray-60 overflow-y-auto tall-xs:py-4 px-3 rounded dark:bg-gray-800"
      >
        <SidebarGroup ulClass="space-y-1 tall-xs:space-y-2">
          <SidebarItem label="NextGraph" href="#/user" class="mt-1">
            <svelte:fragment slot="icon">
              <Logo className="w-7 h-7 tall:w-10 tall:h-10" />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.home")}
            href="#/"
            on:click={scrollToTop}
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Home
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none  dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.stream")}
            href="#/stream"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Bolt
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.search")}
            href="#/search"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <MagnifyingGlass
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.create")}
            href="#/create"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <PlusCircle
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.shared")}
            href="#/shared"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Users
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.site")}
            href="#/site"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <User
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.messages")}
            href="#/messages"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <PaperAirplane
                tabindex="-1"
                class="-rotate-45 w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
              <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                3
              </span>
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.notifications")}
            href="#/notifications"
            class="mt-1 py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Bell
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
              <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                10
              </span>
            </svelte:fragment>
          </SidebarItem>
        </SidebarGroup>
      </SidebarWrapper>
    </Sidebar>

    <main class="ml-48" bind:this={top}>
      <slot />
    </main>
  </div>
{/if}

<style>

  .full-layout {
    height: 100vh;
    overflow: auto;
  }
  main {
    overflow: hidden;
    overflow-wrap: break-word;
  }
  .graph-discrete-toggle button {
    border-radius: 0 ;
    border: 0 ;
  }

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer components {
    .selected-toggle {
      @apply bg-primary-700 text-white;
              
    }
    .unselected-toggle {
      @apply text-gray-900 hover:bg-gray-100 hover:text-blue-700;
    }
    .common-toggle {
      @apply inline-flex items-center border border-gray-200  text-base font-medium px-2 py-2 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 pr-3;
    }
  }

</style>
