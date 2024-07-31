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
  import { link, location, push } from "svelte-spa-router";
  import MobileBottomBarItem from "./MobileBottomBarItem.svelte";
  import MobileBottomBar from "./MobileBottomBar.svelte";
  import Pane from "./Pane.svelte";
  // @ts-ignore
  import Logo from "./components/Logo.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  import PaneHeader from "./components/PaneHeader.svelte";
  import BranchIcon from "./components/BranchIcon.svelte";
  import Message from "./components/Message.svelte";
  // @ts-ignore
  import { t } from "svelte-i18n";
  import { onMount, onDestroy, tick } from "svelte";
  import { cur_tab, cur_viewer, cur_editor, toggle_graph_discrete, cur_tab_update,
          available_editors, available_viewers, set_editor, set_viewer, set_view_or_edit, toggle_live_edit,
          has_editor_chat, all_files_count, all_comments_count, nav_bar, save, hideMenu, show_modal_menu } from "../tab";
  import {
    active_session, redirect_after_login, toasts
  } from "../store";
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
    PaperClip,
    XMark,
    ArrowLeft,
    ArchiveBox,
    CheckCircle,
    XCircle,
    ExclamationCircle,
  } from "svelte-heros-v2";
    import NavBar from "./components/NavBar.svelte";

  export let withoutNavBar = false;

  let width: number;
  let breakPoint: number = 662;
  let mobile = false;
  let open_view_as = false;
  let open_edit_with = false;
  let open_share = false;
  let open_tools = false;

  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }

  let panes_available;
  $: if (width < 983) {
    panes_available = 0;
  } else if (width >= 983 && width < 1304) {
    panes_available = 1;
  } else if (width >= 1304 && width < 1625) {
    panes_available = 2;
  } else if (width >= 1625) {
    panes_available = 3;
  };

  let pane_left1_used: boolean | string = false;
  let pane_left2_used: boolean | string = false;
  let pane_right_used: boolean | string = false;
  let pane_lefts_used = 0;
  $: if (pane_left1_used && pane_left2_used) {
    pane_lefts_used = 2;
  } else if (pane_left1_used || pane_left2_used) {
    pane_lefts_used = 1;
  } else {
    pane_lefts_used = 0;
  };

  $: if (panes_available == 0) {
    pane_left1_used = false;
    pane_left2_used = false;
    pane_right_used = false;
    if ($cur_tab.right_pane || $cur_tab.folders_pane || $cur_tab.toc_pane) {
      $show_modal_menu = true;
    }
  }
  $: if (panes_available > 0) {
    if ($show_modal_menu && !$cur_tab.show_menu) {
      $show_modal_menu = false;
    }
    if (panes_available == 1) {
      if ($cur_tab.right_pane) {
        pane_right_used = $cur_tab.right_pane;
        pane_left1_used = false;
        pane_left2_used = false;
      } else if ($cur_tab.folders_pane) {
        pane_left1_used = "folders";
        pane_right_used = false;
        pane_left2_used = false;
      } else if ($cur_tab.toc_pane) {
        pane_left1_used = "toc";
        pane_right_used = false;
        pane_left2_used = false;
      } else {
        pane_left1_used = false;
        pane_left2_used = false;
        pane_right_used = false;
      }
    } else if (panes_available == 2) {
      if ($cur_tab.right_pane) {
        pane_right_used = $cur_tab.right_pane;
        pane_left2_used = false;
        if ($cur_tab.folders_pane) {
          pane_left1_used = "folders";
        } else if ($cur_tab.toc_pane) {
          pane_left1_used = "toc";
        } else {
          pane_left1_used = false;
        }
      } else {
        pane_right_used = false;
        if ($cur_tab.folders_pane) {
          pane_left1_used = "folders";
          if ($cur_tab.toc_pane) {
            pane_left2_used = "toc";
          } else {
            pane_left2_used = false;
          }
        } else if ($cur_tab.toc_pane) {
          pane_left1_used = "toc";
          pane_left2_used = false;
        } else {
          pane_left1_used = false;
          pane_left2_used = false;
        }
      }
    } else if (panes_available == 3) {
      if ($cur_tab.right_pane) {
        pane_right_used = $cur_tab.right_pane;
      } else {
        pane_right_used = false;
      }
      if ($cur_tab.folders_pane) {
        pane_left1_used = "folders";
        if ($cur_tab.toc_pane) {
          pane_left2_used = "toc";
        } else {
          pane_left2_used = false;
        }
      } else if ($cur_tab.toc_pane) {
        pane_left1_used = "toc";
        pane_left2_used = false;
      } else {
        pane_left1_used = false;
        pane_left2_used = false;
      }
    }
  }

  let top;
  let shareMenu;
  let toolsMenu;
  let unsub;
  async function scrollToTop() {
    await tick();
    if (top) top.scrollIntoView();
  }
  async function scrollToMenuShare() {
    await tick();
    if (shareMenu) shareMenu.scrollIntoView();
  }
  async function scrollToMenuTools() {
    await tick();
    if (toolsMenu) toolsMenu.scrollIntoView();
  }
  onMount(async () => {
    await scrollToTop();

    unsub = show_modal_menu.subscribe((new_val) => {
      if (!new_val) {
          cur_tab_update(ct => {
              ct.show_menu = false;
              if (panes_available === 0) {
                ct.right_pane = "";
                ct.folders_pane = false;
                ct.toc_pane = false;
              }
              return ct;
          });
      }
    });
  });

  onDestroy(() => {
    if (unsub) unsub();
  });

  active_session.subscribe((as) => { if(!as) {
    console.log($location);
    if ($location!="/user") {
      $redirect_after_login = $location;
    }
    push("#/");
  } })

  $: activeUrl = "#" + $location;

  const launchAppStore = (class_name:string) => {
    //TODO
    hideMenu();
  };

  const openAction = (action:string) => {
    // TODO
    hideMenu();
  }

  const openPane = (pane:string) => {
    cur_tab_update((ct) => {
      if ( pane == "folders") {
        ct.folders_pane = !ct.folders_pane;
        if (ct.folders_pane) {
          if (panes_available <= 1 ) {
            ct.right_pane = "";
          }
        }
      } else if ( pane == "toc") {
        ct.toc_pane = !ct.toc_pane;
        if (ct.toc_pane) {
          if (panes_available <= 1 ) {
            ct.folders_pane = false;
            ct.right_pane = "";
          } else if (panes_available == 2) {
            if (ct.folders_pane && ct.right_pane)
              ct.folders_pane = false;
          }
        }
      } else {
        if (ct.right_pane == pane) 
          ct.right_pane = "";
        else {
          ct.right_pane = pane;
        }
      }
      if (panes_available > 0) {
        ct.show_menu = false;
        $show_modal_menu = false;
      } else {
        $show_modal_menu = true;
        ct.show_menu = false;
      }
      return ct;
    });
  }

  const openShare = (share:string) => {
    // TODO
    hideMenu();
  }

  const find = () => {
    // TODO
    hideMenu();
  }

  const bookmark = () => {
    // TODO
    hideMenu();
  }

  const annotate = () => {
    // TODO
    hideMenu();
  }

  const openArchive = () => {
    // TODO
    hideMenu();
  }

  const closeModal = () => {
    $show_modal_menu = false;
    // cur_tab_update(ct => {
    //     ct.show_menu = false;
    //     if (panes_available === 0) {
    //       ct.right_pane = "";
    //       ct.folders_pane = false;
    //       ct.toc_pane = false;
    //     }
    //     return ct;
    // });
  }

  const closePaneInModal = () => {
    cur_tab_update(ct => {
        ct.show_menu = true;
        ct.right_pane = "";
        ct.folders_pane = false;
        ct.toc_pane = false;
        return ct;
    });
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

  const pane_items = {
    "folders":FolderOpen,
    "toc":BookOpen,
    "branches":BranchIcon,
    "files":PaperClip,
    "history":Clock,
    "comments":ChatBubbleOvalLeft,
    "info":InformationCircle,
    "chat":ChatBubbleLeftRight,
    "mc":Sparkles,
  };

  const customEv = new CustomEvent('loaded', {});

	async	function addLoaded(node) {
		await tick()
		node.dispatchEvent(customEv)
	}

  let asideClass = "w-48";
  let spanClass = "flex-1 ml-3 whitespace-nowrap";
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
</script>

<svelte:window bind:innerWidth={width} />

<Modal id="menu-modal"
    outsideclose
    bind:open={$show_modal_menu}
    size = 'xs'
    placement = 'top-right'
    backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80 menu-bg-modal"
  >
  <div class="static">
    <div class="absolute top-2 right-4 w-10 h-10 bg-white" role="button" aria-label="Close menu" title="Close menu" 
      on:click={closeModal}
      on:keypress={closeModal}
      tabindex="0">
      <XMark class="w-10 h-10 text-gray-700  focus:outline-none  dark:text-white"/>
    </div>
    {#if !$cur_tab.show_menu}
      <div class="m-3 flex items-center" role="button" aria-label="Back to menu" title="Back to menu" 
        on:click={closePaneInModal}
        on:keypress={closePaneInModal}
        tabindex="0">
        <ArrowLeft class="w-8 h-8 text-gray-700 focus:outline-none dark:text-white"/>
        <span class="ml-2 inline-block text-gray-700 select-none dark:text-white">Back to menu</span>
      </div>
    {/if}
    {#if $cur_tab.show_menu || (!$cur_tab.folders_pane && !$cur_tab.toc_pane && !$cur_tab.right_pane)}
      <aside style="width:305px; padding:5px;" class="bg-white" aria-label="Sidebar">
        <div class="bg-gray-60 overflow-y-auto dark:bg-gray-800">
          <ul class="space-y-1 space-x-0 mb-10">
            {#if $cur_tab.branch.has_discrete}
            <li>
              <div class="inline-flex graph-discrete-toggle mb-2 ml-2" role="group">
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
              <MenuItem selected={$cur_tab.view_or_edit} title={$cur_viewer["ng:a"]} clickable={($available_viewers.length > 1 || !$cur_tab.view_or_edit) && function () { if ($available_viewers.length > 1) { open_view_as = !open_view_as; } else { set_view_or_edit(true); hideMenu(); } open_edit_with=false;} }>
                <Eye
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                />
                <span class="ml-3">{$t("doc.menu.view_as")} {#if $cur_tab.view_or_edit || $available_viewers.length == 1 }{$cur_viewer["ng:n"]}{/if}</span>
              </MenuItem>
              {#if open_view_as && $available_viewers.length > 1 }
                {#each $available_viewers as viewer}
                  <MenuItem title={viewer["ng:a"]} extraClass="submenu" clickable={(viewer["ng:g"] !== $cur_viewer["ng:g"] || !$cur_tab.view_or_edit) && function () { set_view_or_edit(true); set_viewer(viewer["ng:g"]); hideMenu(); open_view_as = false} }>
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
                <MenuItem title={$cur_editor["ng:a"]} selected={!$cur_tab.view_or_edit} clickable={ ($available_editors.length > 1 || $cur_tab.view_or_edit) && function () { if ($available_editors.length > 1) { open_edit_with = !open_edit_with;  } else { set_view_or_edit(false); hideMenu(); } open_view_as=false;} }>
                  <PencilSquare
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                  />
                  <span class="ml-3">{$t("doc.menu.edit_with")} {#if !$cur_tab.view_or_edit || $available_editors.length == 1 }{$cur_editor["ng:n"]}{/if}</span>
                </MenuItem>
                {#if open_edit_with && $available_editors.length > 1 }
                  {#each $available_editors as editor}
                    <MenuItem title={editor["ng:a"]} extraClass="submenu" clickable={(editor["ng:g"] !== $cur_editor["ng:g"] || $cur_tab.view_or_edit) && function () { set_view_or_edit(false); set_editor(editor["ng:g"]); hideMenu(); open_edit_with = false} }>
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
                <MenuItem clickable={()=>launchAppStore($cur_tab.branch.class)}>
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
              <MenuItem title={$t("doc.menu.items.editor_chat.desc")} selected={$cur_tab.right_pane == "chat"} clickable={ ()=> openPane("chat") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["chat"]} />
                <span class="ml-3">{$t("doc.menu.items.editor_chat.label")}</span>
              </MenuItem>
            {/if}

            {#if $cur_tab.branch.id}
              <MenuItem title={$t("doc.menu.items.folders.desc")} selected={$cur_tab.folders_pane} clickable={ ()=> openPane("folders") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["folders"]} />
                <span class="ml-3">{$t("doc.menu.items.folders.label")}</span>
              </MenuItem>
              <MenuItem title={$t("doc.menu.items.toc.desc")} selected={$cur_tab.toc_pane} clickable={ ()=> openPane("toc") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["toc"]} />
                <span class="ml-3">{$t("doc.menu.items.toc.label")}</span>
              </MenuItem>
              <MenuItem title={$t("doc.menu.items.files.desc")} selected={$cur_tab.right_pane == "files"} clickable={ ()=> openPane("files") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["files"]} />
                <span class="ml-3">{$t("doc.menu.items.files.label")} {$all_files_count}</span>
              </MenuItem>
              <div style="padding:0;" bind:this={shareMenu}></div>
              <MenuItem title={$t("doc.menu.items.share.desc")} clickable={ () => { open_share = !open_share; scrollToMenuShare(); } }>
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

              <MenuItem title={$t("doc.menu.items.comments.desc")} selected={$cur_tab.right_pane == "comments"} clickable={ ()=> openPane("comments") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["comments"]} />
                <span class="ml-3">{$t("doc.menu.items.comments.label")} {$all_comments_count}</span>
              </MenuItem>

              {#if $cur_tab.doc.is_member}
              <MenuItem title={$t("doc.menu.items.branches.desc")} selected={$cur_tab.right_pane == "branches"} clickable={ ()=> openPane("branches") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["branches"]} />
                <span class="ml-3">{$t("doc.menu.items.branches.label")}</span>
              </MenuItem>
              {/if}

              <MenuItem title={$t("doc.menu.items.history.desc")} selected={$cur_tab.right_pane == "history"} clickable={ ()=> openPane("history") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["history"]} />
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

              <MenuItem title={$t("doc.menu.items.info.desc")} selected={$cur_tab.right_pane == "info"} clickable={ ()=> openPane("info") }>
                <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["info"]} />
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
              <div style="padding:0;" bind:this={toolsMenu}></div>
              <MenuItem title={$t("doc.menu.items.tools.desc")} clickable={ () => {open_tools = !open_tools; scrollToMenuTools();} } >
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
            {/if}
            <MenuItem title={$t("doc.menu.items.mc.desc")} selected={$cur_tab.right_pane == "mc"} clickable={ ()=> openPane("mc") }>
              <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["mc"]} />
              <span class="ml-3">{$t("doc.menu.items.mc.label")}</span>
            </MenuItem>
            <MenuItem title={$t("doc.menu.items.archive.desc")} selected={$cur_tab.right_pane == "mc"} clickable={ ()=> openArchive() }>
              <ArchiveBox
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
              <span class="ml-3">{$t("doc.menu.items.archive.label")}</span>
            </MenuItem>
          </ul>
        </div>
      </aside>
    {:else if $cur_tab.right_pane}
      <div style="height:44px; background-color: rgb(251, 251, 251);" class="flex items-center">
        <Icon tabindex="-1" class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none " variation="outline" color="currentColor" icon={pane_items[$cur_tab.right_pane]} />
        <span class="ml-2 inline-block text-gray-500 select-none dark:text-white">{$t(`doc.menu.items.${$cur_tab.right_pane}.label`)}</span>
      </div>
      <Pane pane_name={$cur_tab.right_pane}/>
    {:else if $cur_tab.folders_pane}
      <div style="height:44px; background-color: rgb(251, 251, 251);" class="flex items-center">
        <Icon tabindex="-1" class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none " variation="outline" color="currentColor" icon={pane_items["folders"]} />
        <span class="ml-2 inline-block text-gray-500 select-none dark:text-white">{$t("doc.menu.items.folders.label")}</span>
      </div>
      <Pane pane_name="folders"/>
    {:else if $cur_tab.toc_pane}
      <div style="height:44px; background-color: rgb(251, 251, 251);" class="flex items-center">
        <Icon tabindex="-1" class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none " variation="outline" color="currentColor" icon={pane_items["toc"]} />
        <span class="ml-2 inline-block text-gray-500 select-none dark:text-white">{$t("doc.menu.items.toc.label")}</span>
      </div>
      <Pane pane_name="toc"/>
    {/if}
  </div>
</Modal>

{#each $toasts as toast, i}
  <Message {toast} {i}/>
{/each}
{#if mobile}
  <div class="full-layout">
    {#if !withoutNavBar} 
      <div class="fixed top-0 left-0 right-0" style="z-index:39;">
        <NavBar {scrollToTop}/>
      </div>
    {/if}
    <div bind:this={top}></div>
    <main class:mt-11={!withoutNavBar} class="pb-14 bg-white dark:bg-black">
      <slot />
    </main>
    <MobileBottomBar {activeUrl}>
      <MobileBottomBarItem href="#/" icon={Home} on:click={scrollToTop} >
        <span
          class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
        >
          13
        </span>
      </MobileBottomBarItem>
      <MobileBottomBarItem href="#/stream" icon={Bolt}  />
      <MobileBottomBarItem
        href="#/search"
        icon={MagnifyingGlass}
        
      />
      <MobileBottomBarItem href="#/create" icon={PlusCircle} />
      <MobileBottomBarItem href="#/shared" icon={Users} on:click={scrollToTop}  />
    </MobileBottomBar>
  </div>
{:else}
  <div class="full-layout">
    <Sidebar {activeUrl} {asideClass} {nonActiveClass} style="background-color: #f6f6f6;" class="fixed h-full">
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
            on:click={scrollToTop} on:keypress={scrollToTop} 
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
            on:click={scrollToTop} on:keypress={scrollToTop} 
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
            on:click={scrollToTop} on:keypress={scrollToTop} 
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
            on:click={scrollToTop} on:keypress={scrollToTop}
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
            on:click={scrollToTop} on:keypress={scrollToTop}
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
  </div>
  {#if pane_left1_used}
    <div class="left-[192px] w-[321px;] full-layout h-full absolute top-0 bg-white border-r border-r-1 border-gray-200">
      <div class="static">
        <PaneHeader class="left-[472px]" pane_name={pane_left1_used} {pane_items}/>
      
      </div>
    </div>
  {/if}
  {#if pane_left2_used}
    <div class="left-[513px] w-[321px;] full-layout h-full absolute top-0 bg-white border-r border-r-1 border-gray-200">
      <div class="static">
        <PaneHeader class="left-[793px]" pane_name={pane_left2_used} {pane_items}/>
        
      </div>
    </div>
  {/if}
  <div class:left-[192px]={pane_lefts_used==0} class:left-[513px]={pane_lefts_used==1} class:left-[834px]={pane_lefts_used==2} class:right-0={!pane_right_used} class:right-[321px]={pane_right_used} class="full-layout absolute top-0">
    <div  style="z-index:39;" class:left-[192px]={pane_lefts_used==0} class:left-[513px]={pane_lefts_used==1} class:left-[834px]={pane_lefts_used==2} class:right-0={!pane_right_used} class:right-[321px]={pane_right_used} class="fixed top-0">
      <NavBar {scrollToTop}/>
    </div>
    <div bind:this={top}></div>
    <main class="mt-11 bg-white dark:bg-black" >
      
      <slot />
    </main>
  </div>
  {#if pane_right_used}
    <div class="w-[321px;] full-layout h-full absolute top-0 right-0 bg-white border-l border-l-1 border-gray-200">
      <div class="static">
        <PaneHeader class="right-0" pane_name={pane_right_used} {pane_items}/>
        <Pane pane_name={pane_right_used}/>
      </div>
    </div>
  {/if}
{/if}

<style>

  .full-layout {
    height: 100vh;
    overflow: auto;
  }
  main {
    overflow-x: clip;
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
