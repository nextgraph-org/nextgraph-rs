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
  import {
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
    Modal,
    Toggle,
    Radio,
  } from "flowbite-svelte";
  import { link, location, push } from "svelte-spa-router";
  import MobileBottomBarItem from "./MobileBottomBarItem.svelte";
  import MobileBottomBar from "./MobileBottomBar.svelte";
  import Pane from "./Pane.svelte";
  import DataClassIcon from "./icons/DataClassIcon.svelte";
  import MarkdownIcon from "./icons/MarkdownIcon.svelte";
  import TxtIcon from "./icons/TxtIcon.svelte";
  // @ts-ignore
  import Logo from "./components/Logo.svelte";
  import Spinner from "./components/Spinner.svelte";
  import MenuItem from "./components/MenuItem.svelte";
  import PaneHeader from "./components/PaneHeader.svelte";
  import BranchIcon from "./icons/BranchIcon.svelte";
  import Message from "./components/Message.svelte";

  import { get } from "svelte/store";

  // @ts-ignore
  import { t } from "svelte-i18n";
  import { onMount, onDestroy, tick } from "svelte";
  import {
    cur_tab,
    cur_viewer,
    cur_editor,
    toggle_graph_discrete,
    cur_tab_update,
    get_class,
    get_app,
    all_tabs,
    live_editing,
    available_editors,
    available_viewers,
    set_editor,
    set_viewer,
    set_view_or_edit,
    toggle_live_edit,
    has_editor_chat,
    all_files_count,
    all_comments_count,
    hideMenu,
    show_modal_menu,
    show_modal_create,
    cur_tab_branch_nuri,
    cur_tab_doc_can_edit,
    cur_tab_doc_is_member,
    cur_tab_right_pane,
    cur_tab_folders_pane,
    cur_tab_toc_pane,
    cur_tab_show_menu,
    cur_tab_branch_has_discrete,
    cur_tab_graph_or_discrete,
    cur_tab_view_or_edit,
    show_spinner,
    in_private_store,
    show_doc_popup,
    cur_doc_popup,
  } from "../tab";
  import {
    active_session,
    redirect_after_login,
    toasts,
    check_has_camera,
    toast_error,
    reset_toasts,
    redirect_if_wallet_is,
    active_wallet,
    display_error,
    openModalCreate,
    open_doc_popup,
  } from "../store";
  import ZeraIcon from "./icons/ZeraIcon.svelte";
  import ng from "../api";

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
    Square3Stack3d,
    UserGroup,
    Briefcase,
    DocumentArrowUp,
    Language,
    Camera,
    VideoCamera,
    Microphone,
    ChevronUp,
    ChevronDown,
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
  }

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
  }

  $: if (panes_available == 0) {
    pane_left1_used = false;
    pane_left2_used = false;
    pane_right_used = false;
    if ($cur_tab_right_pane || $cur_tab_folders_pane || $cur_tab_toc_pane) {
      $show_modal_menu = true;
    }
  }
  $: if (panes_available > 0) {
    if ($show_modal_menu && !$cur_tab_show_menu) {
      $show_modal_menu = false;
    }
    if (panes_available == 1) {
      if ($cur_tab_right_pane) {
        pane_right_used = $cur_tab_right_pane;
        pane_left1_used = false;
        pane_left2_used = false;
      } else if ($cur_tab_folders_pane) {
        pane_left1_used = "folders";
        pane_right_used = false;
        pane_left2_used = false;
      } else if ($cur_tab_toc_pane) {
        pane_left1_used = "toc";
        pane_right_used = false;
        pane_left2_used = false;
      } else {
        pane_left1_used = false;
        pane_left2_used = false;
        pane_right_used = false;
      }
    } else if (panes_available == 2) {
      if ($cur_tab_right_pane) {
        pane_right_used = $cur_tab_right_pane;
        pane_left2_used = false;
        if ($cur_tab_folders_pane) {
          pane_left1_used = "folders";
        } else if ($cur_tab_toc_pane) {
          pane_left1_used = "toc";
        } else {
          pane_left1_used = false;
        }
      } else {
        pane_right_used = false;
        if ($cur_tab_folders_pane) {
          pane_left1_used = "folders";
          if ($cur_tab_toc_pane) {
            pane_left2_used = "toc";
          } else {
            pane_left2_used = false;
          }
        } else if ($cur_tab_toc_pane) {
          pane_left1_used = "toc";
          pane_left2_used = false;
        } else {
          pane_left1_used = false;
          pane_left2_used = false;
        }
      }
    } else if (panes_available == 3) {
      if ($cur_tab_right_pane) {
        pane_right_used = $cur_tab_right_pane;
      } else {
        pane_right_used = false;
      }
      if ($cur_tab_folders_pane) {
        pane_left1_used = "folders";
        if ($cur_tab_toc_pane) {
          pane_left2_used = "toc";
        } else {
          pane_left2_used = false;
        }
      } else if ($cur_tab_toc_pane) {
        pane_left1_used = "toc";
        pane_left2_used = false;
      } else {
        pane_left1_used = false;
        pane_left2_used = false;
      }
    }
  }

  let createMenu = {
    social: undefined,
    pro: undefined,
    media: undefined,
    chart: undefined,
    viz: undefined,
    diagram: undefined,
    doc: undefined,
    data: undefined,
    code: undefined,
    apps: undefined,
  };
  async function scrollToCreateMenu(menu) {
    await tick();
    if (createMenu[menu]) createMenu[menu].scrollIntoView();
  }

  let createMenuOpened = {
    social: false,
    pro: false,
    media: false,
    chart: false,
    viz: false,
    diagram: false,
    doc: false,
    data: false,
    code: false,
    apps: false,
  };

  const create_social_items = [
    "social:contact",
    "social:chatroom",
    "social:event",
    "social:channel",
    "social:scheduler",
    "social:calendar",
    "social:live",
    "social:query:skills:programming",
  ];

  const create_pro_items = [
    "prod:project",
    "prod:task",
    "prod:issue",
    "prod:form",
    "prod:slides",
    "prod:spreadsheet",
    "contract",
    "prod:question",
    "prod:poll",
    "prod:cad",
  ];

  const create_media_items = [
    "media:image",
    "media:reel",
    "media:video",
    "media:album",
    "media:audio",
    "media:song",
    "media:overlay",
  ];

  const create_chart_items = [
    "chart:frappecharts",
    "chart:financial",
    "chart:apexcharts",
    "chart:billboard",
    "chart:echarts",
    "chart:chartjs",
  ];

  const create_viz_items = [
    "viz:cytoscape",
    "viz:vega",
    "viz:vizzu",
    "viz:plotly",
    "viz:avail",
  ];

  const create_diagram_items = [
    "diagram:mermaid",
    "diagram:drawio",
    "diagram:graphviz",
    "diagram:excalidraw",
    "diagram:gantt",
    "diagram:flowchart",
    "diagram:sequence",
    "diagram:markmap",
    "diagram:mymind",
    "diagram:jsmind",
  ];

  const create_doc_items = [
    "doc:pdf",
    "doc:odf",
    "file",
    "doc:music:abc",
    "doc:music:guitar",
    "doc:maths",
    "doc:chemistry",
    "doc:ancientscript",
    "doc:braille",
  ];

  const create_data_items = [
    "data:graph",
    "data:container",
    "data:collection",
    "data:table",
    "data:geomap",
    "data:board",
    "data:grid",
    "data:json",
    "data:map",
    "data:array",
    "data:xml",
  ];

  const create_code_items = [
    "code:rust",
    "code:js",
    "code:ts",
    "code:svelte",
    "code:react",
  ];

  const create_apps_items = ["app:n:xxx.xx.xx"];

  import Signature from "./popups/Signature.svelte";
  import Header from "./popups/Header.svelte";

  const doc_popups = {
    signature: Signature,
    header: Header,
  };

  const doc_popups_size = {
    signature: "xs",
    header: "md",
  };

  let top;
  let shareMenu;
  let toolsMenu;
  let unsub;
  let unsub2;
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
        cur_tab_update((ct) => {
          ct.show_menu = false;
          if (panes_available === 0) {
            ct.right_pane = "";
            ct.folders_pane = false;
            ct.toc_pane = false;
          }
          return ct;
        });
      } else {
        reset_toasts();
      }
    });

    unsub2 = active_session.subscribe((as) => {
      if (!as) {
        $redirect_after_login = $location;
        $redirect_if_wallet_is = get(active_wallet)?.id;
        push("#/");
      }
    });
  });

  onDestroy(() => {
    if (unsub) unsub();
    if (unsub2) unsub2();
  });

  $: activeUrl = "#" + $location;

  const launchAppStore = (class_name: string) => {
    //TODO
    hideMenu();
  };

  const openAction = (action: string) => {
    hideMenu();
    open_doc_popup(action);
  };

  const openPane = (pane: string) => {
    cur_tab_update((ct) => {
      if (pane == "folders") {
        ct.folders_pane = !ct.folders_pane;
        if (ct.folders_pane) {
          if (panes_available <= 1) {
            ct.right_pane = "";
          }
        }
      } else if (pane == "toc") {
        ct.toc_pane = !ct.toc_pane;
        if (ct.toc_pane) {
          if (panes_available <= 1) {
            ct.folders_pane = false;
            ct.right_pane = "";
          } else if (panes_available == 2) {
            if (ct.folders_pane && ct.right_pane) ct.folders_pane = false;
          }
        }
      } else {
        if (ct.right_pane == pane) ct.right_pane = "";
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
  };

  const openShare = (share: string) => {
    // TODO
    hideMenu();
  };

  const find = () => {
    // TODO
    hideMenu();
  };

  const bookmark = () => {
    // TODO
    hideMenu();
  };

  const annotate = () => {
    // TODO
    hideMenu();
  };

  const openArchive = () => {
    // TODO
    hideMenu();
  };

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
  };

  const closeModalCreate = () => {
    $show_modal_create = false;
  };

  const closePaneInModal = () => {
    cur_tab_update((ct) => {
      ct.show_menu = true;
      ct.right_pane = "";
      ct.folders_pane = false;
      ct.toc_pane = false;
      return ct;
    });
  };
  const openSpinner = () => {
    $show_spinner = true;
  };
  const closeSpinner = () => {
    $show_spinner = false;
  };

  const share_items = [
    { n: "repost", i: Bolt },
    { n: "dm", i: PaperAirplane },
    { n: "react", i: Heart },
    { n: "author", i: Envelope },
    { n: "quote", i: AtSymbol },
    { n: "forward", i: Forward },
    { n: "link", i: Link },
    { n: "qr", i: QrCode },
    { n: "download", i: DocumentArrowDown },
  ];

  const tools_items = [
    { n: "copy", i: DocumentDuplicate },
    { n: "embed", i: CodeBracketSquare },
    { n: "schema", i: ArrowsPointingOut },
    { n: "signature", i: ShieldCheck },
    { n: "translations", i: Language },
    { n: "services", i: Cube },
    { n: "print", i: Printer },
    { n: "console", i: CommandLine },
    { n: "source", i: CodeBracket },
    { n: "dev", i: Beaker },
  ];

  const pane_items = {
    folders: FolderOpen,
    toc: BookOpen,
    branches: BranchIcon,
    files: PaperClip,
    history: Clock,
    comments: ChatBubbleOvalLeft,
    info: InformationCircle,
    chat: ChatBubbleLeftRight,
    mc: Sparkles,
  };

  let destination = "store";

  $: destination =
    $cur_tab_branch_nuri === ""
      ? "mc"
      : destination == "mc"
        ? "store"
        : destination;

  let config = {
    tabindex: "-1",
    class: "w-7 h-7 text-gray-700  focus:outline-none  dark:text-white",
  };

  const new_document = async (class_name) => {
    closeModalCreate();
    openSpinner();
    try {
      await reset_toasts();
      let store_repo = $cur_tab.store.repo;
      // if (!store_repo) {
      //   store_repo = $all_tabs[$active_session.private_store_id].store.repo
      // }
      let nuri = await ng.doc_create(
        $active_session.session_id,
        get_class(class_name)["ng:crdt"],
        class_name,
        destination,
        store_repo
      );
      closeSpinner();
      push("#/" + nuri);
    } catch (e) {
      closeSpinner();
      toast_error(display_error(e));
    }
  };

  const new_group = () => {
    closeModalCreate();
  };

  const new_app = () => {
    closeModalCreate();
  };

  const scan_qr = () => {
    closeModalCreate();
  };

  const take_picture = () => {
    closeModalCreate();
  };

  const record_reel = () => {
    closeModalCreate();
  };

  const record_voice = () => {
    closeModalCreate();
  };

  let asideClass = "w-48";
  let spanClass = "flex-1 ml-3 whitespace-nowrap";
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
</script>

<svelte:window bind:innerWidth={width} />
<Modal
  class="menu-modal"
  outsideclose
  bind:open={$show_modal_menu}
  size="xs"
  placement="top-right"
  backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80 menu-bg-modal"
>
  <div class="static">
    <div
      class="absolute top-2 right-4 w-10 h-10 bg-white"
      role="button"
      aria-label="Close menu"
      title="Close menu"
      on:click={closeModal}
      on:keypress={closeModal}
      tabindex="0"
    >
      <XMark
        class="w-10 h-10 text-gray-700  focus:outline-none  dark:text-white"
      />
    </div>
    {#if !$cur_tab_show_menu}
      <div
        class="m-3 flex items-center"
        role="button"
        aria-label="Back to menu"
        title="Back to menu"
        on:click={closePaneInModal}
        on:keypress={closePaneInModal}
        tabindex="0"
      >
        <ArrowLeft
          class="w-8 h-8 text-gray-700 focus:outline-none dark:text-white"
        />
        <span
          class="ml-2 inline-block text-gray-700 select-none dark:text-white"
          >Back to menu</span
        >
      </div>
    {/if}
    {#if $cur_tab_show_menu || (!$cur_tab_folders_pane && !$cur_tab_toc_pane && !$cur_tab_right_pane)}
      <aside
        style="width:305px; padding:5px;"
        class="bg-white"
        aria-label="Sidebar"
      >
        <div class="bg-gray-60 overflow-y-auto dark:bg-gray-800">
          <ul class="mb-10">
            {#if $cur_tab_branch_has_discrete}
              <li>
                <div
                  class="inline-flex graph-discrete-toggle mb-2 ml-2"
                  role="group"
                >
                  <button
                    on:click={toggle_graph_discrete}
                    disabled={$cur_tab_graph_or_discrete}
                    type="button"
                    style="border-top-left-radius: 0.375rem;border-bottom-left-radius: 0.375rem;"
                    class:selected-toggle={$cur_tab_graph_or_discrete}
                    class:unselected-toggle={!$cur_tab_graph_or_discrete}
                    class="common-toggle"
                  >
                    <Sun class="mr-2 focus:outline-none" />
                    {$t("doc.graph")}
                  </button>
                  <button
                    on:click={toggle_graph_discrete}
                    disabled={!$cur_tab_graph_or_discrete}
                    type="button"
                    style="border-top-right-radius: 0.375rem;border-bottom-right-radius: 0.375rem;"
                    class:selected-toggle={!$cur_tab_graph_or_discrete}
                    class:unselected-toggle={$cur_tab_graph_or_discrete}
                    class="common-toggle"
                  >
                    <Cloud class="mr-2 focus:outline-none" />
                    {$t("doc.discrete")}
                  </button>
                </div>
              </li>
            {/if}
            {#if $cur_viewer}
              <MenuItem
                offset={!$cur_tab_branch_has_discrete}
                selected={$cur_tab_view_or_edit}
                title={$cur_viewer["ng:a"]}
                dropdown={$available_viewers.length > 1
                  ? open_view_as
                  : undefined}
                clickable={($available_viewers.length > 1 ||
                  !$cur_tab_view_or_edit) &&
                  function () {
                    if ($available_viewers.length > 1) {
                      open_view_as = !open_view_as;
                    } else {
                      set_view_or_edit(true);
                      hideMenu();
                    }
                    open_edit_with = false;
                  }}
              >
                <Eye
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                />
                <span class="ml-3"
                  >{$t("doc.menu.view_as")}
                  {#if $cur_tab_view_or_edit || $available_viewers.length == 1}{$cur_viewer[
                      "ng:n"
                    ]}{/if}</span
                >
              </MenuItem>
              {#if open_view_as && $available_viewers.length > 1}
                {#each $available_viewers as viewer}
                  <MenuItem
                    title={viewer["ng:a"]}
                    extraClass="submenu"
                    clickable={viewer["implemented"]
                      ? (viewer["ng:g"] !== $cur_viewer["ng:g"] ||
                          !$cur_tab_view_or_edit) &&
                        function () {
                          set_view_or_edit(true);
                          set_viewer(viewer["ng:g"]);
                          hideMenu();
                          open_view_as = false;
                        }
                      : undefined}
                  >
                    <ZeraIcon
                      zera={viewer["ng:u"]}
                      config={{
                        tabindex: "-1",
                        class:
                          "w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  ",
                      }}
                    />
                    <span class="ml-3">{viewer["ng:n"]}</span>
                  </MenuItem>
                {/each}
              {/if}
            {/if}
            {#if $cur_tab_doc_can_edit}
              {#if $cur_editor}
                <MenuItem
                  title={$cur_editor["ng:a"]}
                  selected={!$cur_tab_view_or_edit}
                  dropdown={$available_editors.length > 1
                    ? open_edit_with
                    : undefined}
                  clickable={($available_editors.length > 1 ||
                    $cur_tab_view_or_edit) &&
                    function () {
                      if ($available_editors.length > 1) {
                        open_edit_with = !open_edit_with;
                      } else {
                        set_view_or_edit(false);
                        hideMenu();
                      }
                      open_view_as = false;
                    }}
                >
                  <PencilSquare
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                  />
                  <span class="ml-3"
                    >{$t("doc.menu.edit_with")}
                    {#if !$cur_tab_view_or_edit || $available_editors.length == 1}{$cur_editor[
                        "ng:n"
                      ]}{/if}</span
                  >
                </MenuItem>
                {#if open_edit_with && $available_editors.length > 1}
                  {#each $available_editors as editor}
                    <MenuItem
                      title={editor["ng:a"]}
                      extraClass="submenu"
                      clickable={editor["implemented"]
                        ? (editor["ng:g"] !== $cur_editor["ng:g"] ||
                            $cur_tab_view_or_edit) &&
                          function () {
                            set_view_or_edit(false);
                            set_editor(editor["ng:g"]);
                            hideMenu();
                            open_edit_with = false;
                          }
                        : undefined}
                    >
                      <ZeraIcon
                        zera={editor["ng:u"]}
                        config={{
                          tabindex: "-1",
                          class:
                            "w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  ",
                        }}
                      />
                      <span class="ml-3">{editor["ng:n"]}</span>
                    </MenuItem>
                  {/each}
                {/if}
                {#if open_edit_with || $available_editors.length === 1}
                  <MenuItem
                    title={get_app("n:g:z:upload_file")["ng:a"]}
                    extraClass="submenu"
                    clickable={() => {
                      openPane("files");
                    }}
                  >
                    <ZeraIcon
                      zera={get_app("n:g:z:upload_file")["ng:u"]}
                      config={{
                        tabindex: "-1",
                        class:
                          "w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  ",
                      }}
                    />
                    <span class="ml-3"
                      >{get_app("n:g:z:upload_file")["ng:n"]}</span
                    >
                  </MenuItem>
                {/if}
                {#if (!$cur_tab_view_or_edit || open_edit_with) && !$cur_tab_graph_or_discrete}
                  <li
                    title={$t("doc.menu.live_editing_description")}
                    style="margin: 7px 0; padding-left: 32px;"
                    class="toggle"
                  >
                    <Toggle on:change={toggle_live_edit} checked={$live_editing}
                      ><span class="text-gray-700 text-base"
                        >{$t("doc.menu.live_editing")}</span
                      >
                    </Toggle>
                  </li>
                {/if}
              {:else}
                <MenuItem
                  clickable={() => launchAppStore($cur_tab.branch.class)}
                >
                  <ZeraIcon
                    zera="app_store"
                    config={{
                      tabindex: "-1",
                      class:
                        "w-7 h-7 text-gray-700  focus:outline-none  dark:text-white ",
                    }}
                  />
                  <span class="ml-3">{$t("doc.menu.install_app_to_edit")}</span>
                </MenuItem>
              {/if}
            {/if}

            {#if $cur_tab_doc_can_edit}
              <!-- ()=> openAction("new_block") -->
              <MenuItem
                title={$t("doc.menu.items.new_block.desc")}
                clickable={undefined}
              >
                <PlusCircle
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.new_block.label")}</span>
              </MenuItem>
            {/if}
            {#if $has_editor_chat}
              <!-- ()=> openPane("chat") -->
              <MenuItem
                title={$t("doc.menu.items.editor_chat.desc")}
                selected={$cur_tab_right_pane == "chat"}
                clickable={undefined}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["chat"]}
                />
                <span class="ml-3"
                  >{$t("doc.menu.items.editor_chat.label")}</span
                >
              </MenuItem>
            {/if}

            {#if $cur_tab_branch_nuri}
              <MenuItem
                title={$t("doc.menu.items.folders.desc")}
                selected={$cur_tab_folders_pane}
                clickable={() => openPane("folders")}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["folders"]}
                />
                <span class="ml-3">{$t("doc.menu.items.folders.label")}</span>
              </MenuItem>
              <MenuItem
                title={$t("doc.menu.items.toc.desc")}
                selected={$cur_tab_toc_pane}
                clickable={() => openPane("toc")}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["toc"]}
                />
                <span class="ml-3">{$t("doc.menu.items.toc.label")}</span>
              </MenuItem>
              <MenuItem
                title={$t("doc.menu.items.files.desc")}
                selected={$cur_tab_right_pane == "files"}
                clickable={() => openPane("files")}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["files"]}
                />
                <span class="ml-3"
                  >{$t("doc.menu.items.files.label")} {$all_files_count}</span
                >
              </MenuItem>
              {#if !$in_private_store}
                <div style="padding:0;" bind:this={shareMenu}></div>
                <MenuItem
                  title={$t("doc.menu.items.share.desc")}
                  dropdown={open_share}
                  clickable={() => {
                    open_share = !open_share;
                    scrollToMenuShare();
                  }}
                >
                  <Share
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                  />
                  <span class="ml-3">{$t("doc.menu.items.share.label")}</span>
                </MenuItem>
                {#if open_share}
                  {#each share_items as share}
                    <!-- () => openShare(share.n) -->
                    <MenuItem
                      title={$t(`doc.menu.items.${share.n}.desc`)}
                      extraClass="submenu"
                      clickable={undefined}
                    >
                      <Icon
                        tabindex="-1"
                        class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                        variation="outline"
                        color="currentColor"
                        icon={share.i}
                      />
                      <span class="ml-3"
                        >{$t(`doc.menu.items.${share.n}.label`)}</span
                      >
                    </MenuItem>
                  {/each}
                {/if}
              {:else}
                <!-- () => openShare("download") -->
                <MenuItem
                  title={$t(`doc.menu.items.download.desc`)}
                  clickable={undefined}
                >
                  <Icon
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                    variation="outline"
                    color="currentColor"
                    icon={DocumentArrowDown}
                  />
                  <span class="ml-3">{$t(`doc.menu.items.download.label`)}</span
                  >
                </MenuItem>
              {/if}

              <MenuItem
                title={$t("doc.menu.items.comments.desc")}
                selected={$cur_tab_right_pane == "comments"}
                clickable={() => openPane("comments")}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["comments"]}
                />
                <span class="ml-3"
                  >{$t("doc.menu.items.comments.label")}
                  {$all_comments_count}</span
                >
              </MenuItem>

              {#if $cur_tab_doc_is_member}
                <MenuItem
                  title={$t("doc.menu.items.branches.desc")}
                  selected={$cur_tab_right_pane == "branches"}
                  clickable={() => openPane("branches")}
                >
                  <Icon
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                    variation="outline"
                    color="currentColor"
                    icon={pane_items["branches"]}
                  />
                  <span class="ml-3">{$t("doc.menu.items.branches.label")}</span
                  >
                </MenuItem>
              {/if}

              <MenuItem
                title={$t("doc.menu.items.history.desc")}
                selected={$cur_tab_right_pane == "history"}
                clickable={() => openPane("history")}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["history"]}
                />
                <span class="ml-3">{$t("doc.menu.items.history.label")}</span>
              </MenuItem>
              <!-- find -->
              <MenuItem
                title={$t("doc.menu.items.find.desc")}
                clickable={undefined}
              >
                <MagnifyingGlass
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.find.label")}</span>
              </MenuItem>
              <!-- bookmark -->
              <MenuItem
                title={$t("doc.menu.items.bookmark.desc")}
                clickable={undefined}
              >
                <Bookmark
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.bookmark.label")}</span>
              </MenuItem>
              <!-- annotate -->
              <MenuItem
                title={$t("doc.menu.items.annotate.desc")}
                clickable={undefined}
              >
                <ChatBubbleLeftEllipsis
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.annotate.label")}</span>
              </MenuItem>
              <!-- ()=> openPane("info") -->
              <MenuItem
                title={$t("doc.menu.items.info.desc")}
                selected={$cur_tab_right_pane == "info"}
                clickable={undefined}
              >
                <Icon
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
                  variation="outline"
                  color="currentColor"
                  icon={pane_items["info"]}
                />
                <span class="ml-3">{$t("doc.menu.items.info.label")}</span>
              </MenuItem>
              <!-- ()=> openAction("notifs") -->
              <MenuItem
                title={$t("doc.menu.items.notifs.desc")}
                clickable={undefined}
              >
                <Bell
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.notifs.label")}</span>
              </MenuItem>
              {#if $cur_tab_doc_is_member && !$in_private_store}
                <!-- ()=>  openAction("permissions") -->
                <MenuItem
                  title={$t("doc.menu.items.permissions.desc")}
                  clickable={undefined}
                >
                  <LockOpen
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                  />
                  <span class="ml-3"
                    >{$t("doc.menu.items.permissions.label")}</span
                  >
                </MenuItem>
              {/if}
              <!-- ()=>  openAction("settings") -->
              <MenuItem
                title={$t("doc.menu.items.settings.desc")}
                clickable={undefined}
              >
                <Cog6Tooth
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.settings.label")}</span>
              </MenuItem>
              <div style="padding:0;" bind:this={toolsMenu}></div>
              <MenuItem
                title={$t("doc.menu.items.tools.desc")}
                dropdown={open_tools}
                clickable={() => {
                  open_tools = !open_tools;
                  scrollToMenuTools();
                }}
              >
                <WrenchScrewdriver
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                />
                <span class="ml-3">{$t("doc.menu.items.tools.label")}</span>
              </MenuItem>
              {#if open_tools}
                {#each tools_items as tool}
                  {#if !$in_private_store || tool.n !== "signature"}
                    <!-- () => openAction(tool.n)  -->
                    <MenuItem
                      title={$t(`doc.menu.items.${tool.n}.desc`)}
                      extraClass="submenu"
                      clickable={tool.n === "signature"
                        ? () => openAction(tool.n)
                        : undefined}
                    >
                      <Icon
                        tabindex="-1"
                        class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white  "
                        variation="outline"
                        color="currentColor"
                        icon={tool.i}
                      />
                      <span class="ml-3"
                        >{$t(`doc.menu.items.${tool.n}.label`)}</span
                      >
                    </MenuItem>
                  {/if}
                {/each}
              {/if}
            {/if}
            <!-- ()=> openPane("mc") -->
            <!-- <MenuItem title={$t("doc.menu.items.mc.desc")} selected={$cur_tab_right_pane == "mc"} clickable={ undefined }>
              <Icon tabindex="-1" class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white" variation="outline" color="currentColor" icon={pane_items["mc"]} />
              <span class="ml-3">{$t("doc.menu.items.mc.label")}</span>
            </MenuItem> -->
            <!-- ()=> openArchive() -->
            <MenuItem
              title={$t("doc.menu.items.archive.desc")}
              clickable={undefined}
            >
              <ArchiveBox
                tabindex="-1"
                class="w-7 h-7 text-gray-700  focus:outline-none dark:text-white"
              />
              <span class="ml-3">{$t("doc.menu.items.archive.label")}</span>
            </MenuItem>
          </ul>
        </div>
      </aside>
    {:else if $cur_tab_right_pane}
      <div
        style="height:44px; background-color: rgb(251, 251, 251);"
        class="flex items-center"
      >
        <Icon
          tabindex="-1"
          class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none "
          variation="outline"
          color="currentColor"
          icon={pane_items[$cur_tab_right_pane]}
        />
        <span
          class="ml-2 inline-block text-gray-500 select-none dark:text-white"
          >{$t(`doc.menu.items.${$cur_tab_right_pane}.label`)}</span
        >
      </div>
      <Pane pane_name={$cur_tab_right_pane} />
    {:else if $cur_tab_folders_pane}
      <div
        style="height:44px; background-color: rgb(251, 251, 251);"
        class="flex items-center"
      >
        <Icon
          tabindex="-1"
          class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none "
          variation="outline"
          color="currentColor"
          icon={pane_items["folders"]}
        />
        <span
          class="ml-2 inline-block text-gray-500 select-none dark:text-white"
          >{$t("doc.menu.items.folders.label")}</span
        >
      </div>
      <Pane pane_name="folders" />
    {:else if $cur_tab_toc_pane}
      <div
        style="height:44px; background-color: rgb(251, 251, 251);"
        class="flex items-center"
      >
        <Icon
          tabindex="-1"
          class="ml-3 w-8 h-8 text-gray-400 dark:text-white focus:outline-none "
          variation="outline"
          color="currentColor"
          icon={pane_items["toc"]}
        />
        <span
          class="ml-2 inline-block text-gray-500 select-none dark:text-white"
          >{$t("doc.menu.items.toc.label")}</span
        >
      </div>
      <Pane pane_name="toc" />
    {/if}
  </div>
</Modal>
<Modal
  class="spinner-overlay"
  dismissable={false}
  bind:open={$show_spinner}
  size="xs"
  placement="center"
  backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80"
>
  <p>{$t("doc.creating")}...</p>
  <div class="w-full flex justify-center">
    <Spinner className="w-10 h-10" />
  </div>
</Modal>
<Modal
  class="document-popup"
  outsideclose
  bind:open={$show_doc_popup}
  size={doc_popups_size[$cur_doc_popup]}
  placement="center"
  defaultClass="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-400 rounded-lg border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md relative flex flex-col mx-auto w-full"
  backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80 popup-bg-modal"
>
  {#if doc_popups[$cur_doc_popup]}<svelte:component
      this={doc_popups[$cur_doc_popup]}
    />{/if}
</Modal>
<Modal
  class="menu-modal"
  outsideclose
  bind:open={$show_modal_create}
  size="xs"
  placement="top-left"
  backdropClass="bg-gray-900 bg-opacity-50 dark:bg-opacity-80 menu-bg-modal"
>
  <div class="static">
    <div
      class="absolute top-2 right-4 w-10 h-10 bg-white"
      role="button"
      aria-label="Close menu"
      title="Close menu"
      on:click={closeModalCreate}
      on:keypress={closeModalCreate}
      tabindex="0"
    >
      <XMark
        class="w-10 h-10 text-gray-700  focus:outline-none  dark:text-white"
      />
    </div>

    <aside
      style="width:305px; padding:5px;"
      class="bg-white"
      aria-label="Sidebar"
    >
      <div class="bg-gray-60 overflow-y-auto dark:bg-gray-800">
        <ul class="mb-10">
          <Radio
            class="clickable m-2 text-base font-normal"
            name="destination"
            disabled={!$cur_tab_branch_nuri}
            value="store"
            bind:group={destination}
          >
            <Square3Stack3d
              class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white mr-2"
            />
            {$t("doc.destination.store")}
          </Radio>
          <Radio
            class="clickable m-2 text-base font-normal"
            name="destination"
            disabled={!$cur_tab_branch_nuri}
            value="stream"
            bind:group={destination}
          >
            <Bolt
              class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white mr-2"
            />
            {#if $cur_tab.store.store_type !== "dialog"}{$t(
                "doc.destination.stream"
              )}{:else}{$t("doc.destination.dialog")}{/if}
          </Radio>
          <Radio
            class="clickable m-2 text-base font-normal"
            name="destination"
            value="mc"
            bind:group={destination}
          >
            <Sparkles
              class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white mr-2"
            />
            {$t("doc.destination.mc")}
          </Radio>
          <h2 class="ml-2 my-4">{$t("doc.select_class")}</h2>
          <MenuItem
            title={$t("doc.rich")}
            clickable={() => new_document("post:rich")}
          >
            <DataClassIcon dataClass="post:rich" {config} />
            <span class="ml-3">{$t("doc.rich")}</span>
          </MenuItem>
          <MenuItem
            title={$t("doc.markdown")}
            clickable={() => new_document("post:md")}
          >
            <MarkdownIcon
              class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
            />
            <span class="ml-3">{$t("doc.markdown")}</span>
          </MenuItem>
          <MenuItem
            title={$t("doc.text")}
            clickable={() => new_document("post:text")}
          >
            <TxtIcon
              class="w-7 h-7 text-gray-700 focus:outline-none dark:text-white"
            />
            <span class="ml-3">{$t("doc.text")}</span>
          </MenuItem>
          <!--new_group-->
          <MenuItem title={$t("doc.group")} clickable={undefined}>
            <UserGroup
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
            />
            <span class="ml-3">{$t("doc.group")}</span>
          </MenuItem>
          <!-- ()=> new_document("doc:compose") -->
          <MenuItem
            title={get_class("doc:compose")["ng:a"]}
            clickable={undefined}
          >
            <DataClassIcon dataClass="doc:compose" {config} />
            <span class="ml-3">{get_class("doc:compose")["ng:n"]}</span>
          </MenuItem>
          <div style="padding:0;" bind:this={createMenu.social}></div>
          <MenuItem
            title={$t("doc.social")}
            dropdown={createMenuOpened.social}
            clickable={() => {
              createMenuOpened.social = !createMenuOpened.social;
              scrollToCreateMenu("social");
            }}
          >
            <Users
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
            />
            <span class="ml-3">{$t("doc.social")}</span>
          </MenuItem>
          {#if createMenuOpened.social}
            {#each create_social_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={get_class(item)["implemented"]
                  ? () => new_document(item)
                  : undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.apps}></div>
          <MenuItem
            title={$t("doc.apps")}
            dropdown={createMenuOpened.apps}
            clickable={() => {
              createMenuOpened.apps = !createMenuOpened.apps;
              scrollToCreateMenu("apps");
            }}
          >
            <DataClassIcon dataClass="app:z" {config} />
            <span class="ml-3">{$t("doc.apps")}</span>
          </MenuItem>
          {#if createMenuOpened.apps}
            <!-- () => new_app() -->
            <MenuItem
              title={$t("doc.new_app")}
              extraClass="submenu"
              clickable={undefined}
            >
              <Beaker
                tabindex="-1"
                class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
              />
              <span class="ml-3">{$t("doc.new_app")}</span>
            </MenuItem>
            {#each create_apps_items as item}
              <!-- () => new_document(item) -->
              <MenuItem title="" extraClass="submenu" clickable={undefined}>
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">3rd party app Class</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.pro}></div>
          <MenuItem
            title={$t("doc.pro")}
            dropdown={createMenuOpened.pro}
            clickable={() => {
              createMenuOpened.pro = !createMenuOpened.pro;
              scrollToCreateMenu("pro");
            }}
          >
            <Briefcase
              tabindex="-1"
              class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
            />
            <span class="ml-3">{$t("doc.pro")}</span>
          </MenuItem>
          {#if createMenuOpened.pro}
            {#each create_pro_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          {#await check_has_camera() then has_camera}
            {#if has_camera}
              <!-- ()=> scan_qr() -->
              <MenuItem title={$t("buttons.scan_qr")} clickable={undefined}>
                <QrCode
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                />
                <span class="ml-3">{$t("buttons.scan_qr")}</span>
              </MenuItem>
              <!-- ()=> take_picture() -->
              <MenuItem title={$t("doc.take_picture")} clickable={undefined}>
                <Camera
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                />
                <span class="ml-3">{$t("doc.take_picture")}</span>
              </MenuItem>
              <!-- ()=> record_reel() -->
              <MenuItem title={$t("doc.record_reel")} clickable={undefined}>
                <VideoCamera
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                />
                <span class="ml-3">{$t("doc.record_reel")}</span>
              </MenuItem>
              <!-- ()=> record_voice() -->
              <MenuItem title={$t("doc.record_voice")} clickable={undefined}>
                <Microphone
                  tabindex="-1"
                  class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                />
                <span class="ml-3">{$t("doc.record_voice")}</span>
              </MenuItem>
            {/if}

            <div style="padding:0;" bind:this={createMenu.media}></div>
            <MenuItem
              title={$t("doc.media")}
              dropdown={createMenuOpened.media}
              clickable={() => {
                createMenuOpened.media = !createMenuOpened.media;
                scrollToCreateMenu("media");
              }}
            >
              <DocumentArrowUp
                tabindex="-1"
                class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
              />
              <span class="ml-3">{$t("doc.media")}</span>
            </MenuItem>
            {#if createMenuOpened.media}
              {#each create_media_items as item}
                <!-- () => new_document(item) -->
                <MenuItem
                  title={get_class(item)["ng:a"]}
                  extraClass="submenu"
                  clickable={undefined}
                >
                  <DataClassIcon dataClass={item} {config} />
                  <span class="ml-3">{get_class(item)["ng:n"]}</span>
                </MenuItem>
              {/each}
              {#if !has_camera}
                <!-- ()=> record_voice() -->
                <MenuItem
                  title={$t("doc.record_voice")}
                  extraClass="submenu"
                  clickable={undefined}
                >
                  <Microphone
                    tabindex="-1"
                    class="w-7 h-7 text-gray-700  focus:outline-none  dark:text-white"
                  />
                  <span class="ml-3">{$t("doc.record_voice")}</span>
                </MenuItem>
              {/if}
            {/if}
          {/await}

          <div style="padding:0;" bind:this={createMenu.chart}></div>
          <MenuItem
            title={$t("doc.chart")}
            dropdown={createMenuOpened.chart}
            clickable={() => {
              createMenuOpened.chart = !createMenuOpened.chart;
              scrollToCreateMenu("chart");
            }}
          >
            <DataClassIcon dataClass="chart" {config} />
            <span class="ml-3">{$t("doc.chart")}</span>
          </MenuItem>
          {#if createMenuOpened.chart}
            {#each create_chart_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.viz}></div>
          <MenuItem
            title={$t("doc.viz")}
            dropdown={createMenuOpened.viz}
            clickable={() => {
              createMenuOpened.viz = !createMenuOpened.viz;
              scrollToCreateMenu("viz");
            }}
          >
            <DataClassIcon dataClass="viz" {config} />
            <span class="ml-3">{$t("doc.viz")}</span>
          </MenuItem>
          {#if createMenuOpened.viz}
            {#each create_viz_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.diagram}></div>
          <MenuItem
            title={$t("doc.diagram")}
            dropdown={createMenuOpened.diagram}
            clickable={() => {
              createMenuOpened.diagram = !createMenuOpened.diagram;
              scrollToCreateMenu("diagram");
            }}
          >
            <DataClassIcon dataClass="diagram" {config} />
            <span class="ml-3">{$t("doc.diagram")}</span>
          </MenuItem>
          {#if createMenuOpened.diagram}
            {#each create_diagram_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.doc}></div>
          <MenuItem
            title={$t("doc.other")}
            dropdown={createMenuOpened.doc}
            clickable={() => {
              createMenuOpened.doc = !createMenuOpened.doc;
              scrollToCreateMenu("doc");
            }}
          >
            <DataClassIcon dataClass="doc:" {config} />
            <span class="ml-3">{$t("doc.other")}</span>
          </MenuItem>
          {#if createMenuOpened.doc}
            {#each create_doc_items as item}
              <!-- () => new_document(item) -->
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.data}></div>
          <MenuItem
            title={$t("doc.data")}
            dropdown={createMenuOpened.data}
            clickable={() => {
              createMenuOpened.data = !createMenuOpened.data;
              scrollToCreateMenu("data");
            }}
          >
            <DataClassIcon dataClass="data:" {config} />
            <span class="ml-3">{$t("doc.data")}</span>
          </MenuItem>
          {#if createMenuOpened.data}
            {#each create_data_items as item}
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={get_class(item)["implemented"]
                  ? () => new_document(item)
                  : undefined}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <div style="padding:0;" bind:this={createMenu.code}></div>
          <MenuItem
            title={$t("doc.code")}
            dropdown={createMenuOpened.code}
            clickable={() => {
              createMenuOpened.code = !createMenuOpened.code;
              scrollToCreateMenu("code");
            }}
          >
            <DataClassIcon dataClass="code" {config} />
            <span class="ml-3">{$t("doc.code")}</span>
          </MenuItem>
          {#if createMenuOpened.code}
            {#each create_code_items as item}
              <MenuItem
                title={get_class(item)["ng:a"]}
                extraClass="submenu"
                clickable={() => new_document(item)}
              >
                <DataClassIcon dataClass={item} {config} />
                <span class="ml-3">{get_class(item)["ng:n"]}</span>
              </MenuItem>
            {/each}
          {/if}

          <!-- ()=> new_document("e:link") -->
          <MenuItem title={get_class("e:link")["ng:a"]} clickable={undefined}>
            <DataClassIcon dataClass="e:link" {config} />
            <span class="ml-3">{get_class("e:link")["ng:n"]}</span>
          </MenuItem>
        </ul>
      </div>
    </aside>
  </div>
</Modal>

{#each $toasts as toast, i}
  <Message {toast} {i} />
{/each}
{#if mobile}
  <div class="full-layout mt-safe h-vh-safe">
    {#if !withoutNavBar}
      <div class="fixed top-safe left-0 right-0" style="z-index:39;">
        <NavBar {scrollToTop} />
      </div>
    {/if}
    <div bind:this={top}></div>
    <main class:mt-11={!withoutNavBar} class="pb-14 bg-white dark:bg-black">
      <slot />
    </main>
    <MobileBottomBar {activeUrl}>
      <MobileBottomBarItem href="#/" icon={Home} on:click={scrollToTop}>
        <!-- <span
          class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
        >
          13
        </span> -->
      </MobileBottomBarItem>
      <MobileBottomBarItem href="#/stream" icon={Bolt} />
      <MobileBottomBarItem href="#/search" icon={MagnifyingGlass} />
      <div
        class="flex items-center"
        on:click={openModalCreate}
        on:keypress={openModalCreate}
        tabindex="0"
        role="button"
      >
        <PlusCircle
          tabindex="-1"
          class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
        />
      </div>
      <MobileBottomBarItem
        href="#/shared"
        icon={Users}
        on:click={scrollToTop}
      />
    </MobileBottomBar>
  </div>
{:else}
  <div class="full-layout">
    <Sidebar
      {activeUrl}
      {asideClass}
      {nonActiveClass}
      style="background-color: #f6f6f6;"
      class="fixed h-full"
    >
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
            on:keypress={scrollToTop}
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
          <li>
            <div
              on:click={openModalCreate}
              on:keypress={openModalCreate}
              role="button"
              tabindex="0"
              class="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 hover:text-[#535bf2] dark:hover:bg-gray-700 py-1 tall-xs:p-2"
            >
              <PlusCircle
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
              <span class="ml-3">{$t("pages.full_layout.create")}</span>
            </div>
          </li>

          <SidebarItem
            label={$t("pages.full_layout.shared")}
            href="#/shared"
            on:click={scrollToTop}
            on:keypress={scrollToTop}
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
            on:click={scrollToTop}
            on:keypress={scrollToTop}
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
            on:click={scrollToTop}
            on:keypress={scrollToTop}
          >
            <svelte:fragment slot="icon">
              <PaperAirplane
                tabindex="-1"
                class="-rotate-45 w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
              <!-- <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                3
              </span> -->
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.notifications")}
            href="#/notifications"
            class="mt-1 py-1 tall-xs:p-2"
            on:click={scrollToTop}
            on:keypress={scrollToTop}
          >
            <svelte:fragment slot="icon">
              <Bell
                tabindex="-1"
                class="w-7 h-7 text-black  focus:outline-none dark:text-white group-hover:text-gray-900 "
              />
              <!-- <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                10
              </span> -->
            </svelte:fragment>
          </SidebarItem>
        </SidebarGroup>
      </SidebarWrapper>
    </Sidebar>
  </div>
  {#if pane_left1_used}
    <div
      class="left-[192px] w-[321px;] full-layout h-full absolute top-0 bg-white border-r border-r-1 border-gray-200"
    >
      <div class="static">
        <PaneHeader
          class="left-[472px]"
          pane_name={pane_left1_used}
          {pane_items}
        />
      </div>
    </div>
  {/if}
  {#if pane_left2_used}
    <div
      class="left-[513px] w-[321px;] full-layout h-full absolute top-0 bg-white border-r border-r-1 border-gray-200"
    >
      <div class="static">
        <PaneHeader
          class="left-[793px]"
          pane_name={pane_left2_used}
          {pane_items}
        />
      </div>
    </div>
  {/if}
  <div
    class:left-[192px]={pane_lefts_used == 0}
    class:left-[513px]={pane_lefts_used == 1}
    class:left-[834px]={pane_lefts_used == 2}
    class:right-0={!pane_right_used}
    class:right-[321px]={pane_right_used}
    class="full-layout absolute top-0"
  >
    <div
      style="z-index:39;"
      class:left-[192px]={pane_lefts_used == 0}
      class:left-[513px]={pane_lefts_used == 1}
      class:left-[834px]={pane_lefts_used == 2}
      class:right-0={!pane_right_used}
      class:right-[321px]={pane_right_used}
      class="fixed top-0"
    >
      <NavBar {scrollToTop} />
    </div>
    <div bind:this={top}></div>
    <main class="mt-11 bg-white dark:bg-black">
      <slot />
    </main>
  </div>
  {#if pane_right_used}
    <div
      class="w-[321px;] full-layout h-full absolute top-0 right-0 bg-white border-l border-l-1 border-gray-200"
    >
      <div class="static">
        <PaneHeader class="right-0" pane_name={pane_right_used} {pane_items} />
        <Pane pane_name={pane_right_used} />
      </div>
    </div>
  {/if}
{/if}

<style>
  .full-layout {
    overflow: auto;
  }
  main {
    overflow-x: clip;
    overflow-wrap: break-word;
  }
  .graph-discrete-toggle button {
    border-radius: 0;
    border: 0;
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
