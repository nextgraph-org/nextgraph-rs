// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import {
    writable,
    readable,
    readonly,
    derived,
    get,
    type Writable,
} from "svelte/store";

import { official_classes } from "./classes";
import { official_apps, official_services } from "./zeras";
import { format } from "svelte-i18n";

let loaded_external_apps = {};

export const load_app = async (appName: string) => {

    let app = await get_app(appName);
    return await import(`./apps/${app["ng:b"]}.svelte`);

};

export const load_official_app = async (app) => {
    //console.log(app);
    //console.log(app["ng:b"]);
    let component = await import(`./apps/${app["ng:b"]}.svelte`);
    //console.log(component.default);
    return component.default;
};

export const get_app = (appName: string) => {

    if (appName.startsWith("n:g:z")) {
        let app = official_apps[appName];
        if (!app) throw new Error("Unknown official app");
        return app;
    } else {
        //TODO: load external app from its repo
        // TODO: keep it in cache in loaded_external_apps
    }

};

export const invoke_service = async (serviceName: string, nuri: string, args: object) => {

    if (serviceName.startsWith("n:g:z")) {
        let service = official_services[serviceName];
        if (!service) throw new Error("Unknown official service");
        // TODO: do this in WebWorker
        // TODO: if on native app or CLI: use deno
        //return await ng.app_invoke(serviceName[6..], nuri, args);
    } else {
        // TODO: if on webapp: only allow those invocations from IFrame of external app or from n:g:z:external_service_invoke (which runs in an IFrame) and run it from webworker
        // TODO: if on native app or CLI: use deno
        // TODO: load external service from its repo
    }

};

export const get_class = (class_name) => {
    if (class_name.startsWith("app:") && class_name !== "app:z") {
        //TODO: load external app from its repo
        // cache it in loaded_external_apps
        // return the class
    } else {
        return official_classes[class_name];
    }
};

const find_viewers_for_class = (class_name: string) => {
    let found = [];
    for (const zera of Object.entries(official_apps)) {
        if (zera[0].includes("dump") || zera[0].includes("source")) continue;
        let viewers = zera[1]["ng:o"];
        if (viewers && viewers.includes(class_name)) {
            found.push(zera[0]);
        }
    }
    return found;
}

const find_editors_for_class = (class_name: string) => {
    let found = [];
    for (const zera of Object.entries(official_apps)) {
        let viewers = zera[1]["ng:w"];
        if (viewers && viewers.includes(class_name)) {
            found.push(zera[0]);
        }
    }
    return found;
}

const find_source_viewer_for_class = (class_def) => {
    switch (class_def["ng:crdt"]) {
        case 'Graph':
            return "n:g:z:crdt_source_viewer:rdf";
        case 'YMap':
        case 'YArray':
        case 'Automerge':
        case 'Elmer':
            return "n:g:z:crdt_source_viewer:json";
        case 'YXml':
            return "n:g:z:crdt_source_viewer:xml";
        case 'YText':
            return "n:g:z:crdt_source_viewer:text";
    }
}

const class_to_viewers_editors = (class_name: string) => {
    let class_def = get_class(class_name);
    let has_discrete = class_def["ng:crdt"] !== "Graph";
    let discrete_viewer = has_discrete ? class_def["ng:o"] : undefined;
    let discrete_editor = has_discrete ? class_def["ng:w"] : undefined;

    let graph_viewers = [];
    let graph_editors = [];
    if (!has_discrete) {
        if (class_def["ng:o"]) graph_viewers.push(class_def["ng:o"]);
        if (class_def["ng:w"]) graph_editors.push(class_def["ng:w"]);
    }
    graph_viewers.push.apply(graph_viewers, find_viewers_for_class("data:graph"));
    graph_editors.push.apply(graph_editors, find_editors_for_class("data:graph"));

    let graph_viewer = graph_viewers[0];
    let graph_editor = graph_editors[0];

    let discrete_viewers = [];
    let discrete_editors = [];
    if (has_discrete) {
        if (discrete_viewer) discrete_viewers.push(discrete_viewer);
        if (discrete_editor) discrete_editors.push(discrete_editor);
        for (const v of find_viewers_for_class(class_name)) {
            if (v!==discrete_viewer) discrete_viewers.push(v);
        }
        for (const e of find_editors_for_class(class_name)) {
            if (e!==discrete_editor) discrete_editors.push(e);
        }
        discrete_viewers.push(find_source_viewer_for_class(class_def));
        if (!discrete_viewer) discrete_viewer = discrete_viewers[0];
    }
    return {
        graph_viewers,
        graph_editors,
        discrete_viewers,
        discrete_editors,
        graph_viewer,
        graph_editor,
        discrete_viewer,
        discrete_editor
    }
}

export const open_branch = (nuri: string, in_tab: boolean) => {
    all_tabs.update((old) => {
        if (!old[nuri]) {
            //console.log("creating tab for ",nuri)
            old[nuri] = JSON.parse(JSON.stringify(old[""]));
            old[nuri].branch.nuri = nuri;
        }
        return old;
    });
    if (in_tab) {
        cur_branch.set(nuri);
        let store_type = get(all_tabs)[nuri].store.store_type;
        if (store_type) change_nav_bar(`nav:${store_type}`,get(format)(`doc.${store_type}_store`), undefined); 
    }
}

export const update_class = (cur_tab, class_name) => {
    cur_tab.branch.class = class_name;
    cur_tab.graph_or_discrete = get_class(class_name)["ng:crdt"] === "Graph";
    cur_tab.branch.has_discrete = !cur_tab.graph_or_discrete;
    return {...cur_tab, ...class_to_viewers_editors(class_name)};
}

export const update_branch_display = (cur_tab) => {
    if (cur_tab.doc.nuri == cur_tab.branch.nuri) {
        cur_tab.branch.type = "main";
        cur_tab.branch.display = "main";
    }
}

export const show_modal_menu = writable(false);

export const in_memory_graph = writable("");
export const in_memory_discrete = writable("");

//TODO: call it also when switching branches inside same repo
export const reset_in_memory = () => {
    //console.log("reset_in_memory");
    in_memory_graph.update((d)=> {return "";});
    in_memory_discrete.update((d)=> {return "";});
    //console.log(get(in_memory_graph));
    //console.log(get(in_memory_discrete));
};

export const all_tabs = writable({
    "":{
        store: {
            overlay: "", // "v:"
            has_outer: "", // "l:"
            store_type: "", //"public" "protected", "private", "group", "dialog",
            readcap: "", // "r:" readcap of main
            is_member: "", // "r:" readcap of store root branch
            inner: "", // "w:l:"
            
            // comes from main branch of store
            title: "",
            icon: "",
            description: "",
        },
        plato: {
            nuri: "",
            can_edit: false,
        },
        branch: {
            nuri: "", // :o or :o:b
            readcap: "", // "r:"
            comment_branch: "", // nuri
            class: "",
            has_discrete: false,
            id: "", //"b:xxx" branch id (can be null if not of type "branch")
            
            c: "", //"c:xxx" commit(s) id
            type: "", // "main", "stream", "detached", "branch", "in_memory" (does not save)
            display: "", // or main or stream or a:xx or branch:X or c:X (only 7 chars)
            attachments: 0,
            files: 0,
            comments: 0,
            
            title: "",
            icon: "",
            description: "",
    
            app: "", // current app being used
        },
        view_or_edit: true, // true=> view, false=> edit
        graph_viewer: "", // selected viewer
        graph_editor: "", // selected editor
        discrete_viewer: "", // selected viewer
        discrete_editor: "", // selected editor
        graph_viewers: [], // list of available viewers
        graph_editors: [], // list of available editors
        discrete_viewers: [], // list of available viewers
        discrete_editors: [], // list of available editors
        find: "",//or string to find
        graph_or_discrete: false, // set to branch.crdt === "data/graph"
        doc: {
            nuri: "",// :o
            is_store: false,
            is_member: "", // ":r" readcap of root branch
            authors: [],
            inbox: "",
            can_edit: false,
    
            live_edit: false,
            
            title: "",
            icon: "",
            description: "",
    
            stream: { // only if is_store
                notif: 0,
                last: "",
                nuri: "",
            },
            live_editors: {
    
            },
            branches : {},
            
        },
        folders_pane: false,
        toc_pane: false,
        messenger_pane: false,
        right_pane: "", // "branches", "files", "history", "comments", "info", "chat", "mc"
        action: false, // "repost", "dm", "react",  "author", "copy", "forward", "link", "qr", "download", "embed", "new_block", "notifs", "schema", "signature", "permissions", "settings", "print", "console", "source", "services", "dev",
    
        show_menu: false,
        persistent_error: false,
        header_in_view: true,
    }
});

export const set_header_in_view = function(val) {
    cur_tab_update((old) => { old.header_in_view = val; return old;});
}

export const cur_branch = writable("");

export const cur_tab = derived([cur_branch, all_tabs], ([cb, all]) => all[cb]);

export const can_have_header = derived(cur_tab, ($cur_tab) => {
    return !($cur_tab.doc.is_store && ( $cur_tab.store.store_type === "private" || $cur_tab.store.store_type === "dialog"));
});

export const edit_header_button = derived(cur_tab, ($cur_tab) => {
    return ($cur_tab.doc.is_store && ( $cur_tab.store.store_type === "public" || $cur_tab.store.store_type === "protected"))? "doc.header.buttons.edit_profile" : "doc.header.buttons.edit";
});

export const header_title = derived(cur_tab, ($cur_tab) => {
    if ($cur_tab.doc.is_store) {
        if ($cur_tab.store.store_type !== "private" && $cur_tab.store.store_type !== "dialog") {
            return $cur_tab.store.title;
        }
    } else {
        let title = $cur_tab.branch.title || $cur_tab.doc.title;
        if (title) return title;
        let app = get_app($cur_tab.branch.class);
        if (app) return app["ng:n"];
    }
    return false;
});

/* to be used with <NavIcon img={$cur_tab_store_icon_override || $nav_bar.icon} config={{
            tabindex:"-1",
            class:"w-8 h-8 focus:outline-none"
        }}/>
        */
export const header_icon = derived(cur_tab, ($cur_tab) => {
    if ($cur_tab.doc.is_store) {
        if ($cur_tab.store.store_type !== "private") {
            return $cur_tab.store.icon;// TODO: fetch image and return blob:
        }
    } else {
        let icon = $cur_tab.branch.icon || $cur_tab.doc.icon;
        if (icon) return icon;// TODO: fetch image and return blob:
        let app = get_app($cur_tab.branch.class);
        if (app) return "class:" + app["ng:n"];
    }
    return false;
});

export const header_description = derived(cur_tab, ($cur_tab) => {
    if ($cur_tab.doc.is_store) {
        if ($cur_tab.store.store_type !== "private") {
            return $cur_tab.store.description;
        }
    } else {
        let description = $cur_tab.branch.description || $cur_tab.doc.description;
        if (description) return description;
    }
    return false;
});

export const cur_tab_store_name_override = derived(cur_tab, ($cur_tab) => { if ($cur_tab.doc.is_store && $cur_tab.store.store_type !== "private" && $cur_tab.store.title && !$cur_tab.header_in_view) return $cur_tab.store.title; else return false; });

export const cur_tab_store_icon_override = derived(cur_tab, ($cur_tab) => { if ($cur_tab.doc.is_store && $cur_tab.store.store_type !== "private" && $cur_tab.store.icon && !$cur_tab.header_in_view) return $cur_tab.store.icon; else return false; });

export const tab_update = function( tab, fn ) {
    all_tabs.update((all) => {
        all[tab] = fn(all[tab]);
        return all;
    });
};

export const cur_tab_update = function( fn ) {
    all_tabs.update((all) => {
        all[get(cur_branch)] = fn(all[get(cur_branch)]);
        return all;
    });
};

export const showMenu = () => {
    show_modal_menu.set(true);
    cur_tab_update(ct => {
        ct.show_menu = true;
        return ct;
    });
}

export const hideMenu = () => {
    show_modal_menu.set(false);
    cur_tab_update(ct => {
        ct.show_menu = false;
        return ct;
    });
}

export const nav_bar = writable({
    //icon: "class:post:rich",
    icon: "",
    //icon: "blob:http://localhost:1421/be6f968f-ff51-4e8f-bd32-36c60b7af49a",
    title: "",
    back: false,
    newest: 0,
    save: undefined,
    toasts: [],
});

export const change_nav_bar = (icon, title, back) => {
    nav_bar.update((old) => {
        if (icon !== undefined) {
            old.icon = icon;
        }
        if (title !== undefined) {
            old.title = title;
        }
        if (back !== undefined) {
            old.back = back;
        }
        return old;
    });
};

export const persistent_error = (nuri, pe) => {
    tab_update(nuri, tab => {
        tab.persistent_error = pe;
        return tab;
    });
}

export const save = async () => {
    // saving the doc
}

export const all_files_count = derived(cur_tab, ($cur_tab) => {
    let total = $cur_tab.branch.attachments + $cur_tab.branch.files;
    return total ? `(${total})` : "";
});

export const all_comments_count = derived(cur_tab, ($cur_tab) => {
    let total = $cur_tab.branch.comments;
    return total ? `(${total})` : "";
});

export const has_editor_chat = derived(cur_tab, ($cur_tab) => {
    return $cur_tab.doc.can_edit && $cur_tab.store.store_type !== "private" && $cur_tab.store.store_type !== "dialog";
});

export const toggle_live_edit = () => {
    cur_tab_update(ct => {
        ct.doc.live_edit = !ct.doc.live_edit;
        return ct;
    });
}

export const set_viewer = (app_name: string) => {
    if (get(cur_tab).graph_or_discrete) {
        cur_tab_update(ct => {ct.graph_viewer = app_name; ct.branch.app = app_name; return ct;});
    } else {
        cur_tab_update(ct => {ct.discrete_viewer = app_name; ct.branch.app = app_name; return ct;});
    }
}

export const set_editor = (app_name: string) => {
    if (get(cur_tab).graph_or_discrete) {
        cur_tab_update(ct => {ct.graph_editor = app_name; ct.branch.app = app_name; return ct;});
    } else {
        cur_tab_update(ct => {ct.discrete_editor = app_name; ct.branch.app = app_name; return ct;});
    }
}

export const toggle_graph_discrete = () => {
    cur_tab_update(ct => {
        ct.graph_or_discrete = !ct.graph_or_discrete;
        return ct;
    });
}

export const set_graph_discrete = (val:boolean) => {
    cur_tab_update(ct => {
        ct.graph_or_discrete = val;
        return ct;
    });
}

export const set_view_or_edit = (val:boolean) => {
    cur_tab_update(ct => {
        ct.view_or_edit = val;
        return ct;
    });
}

export const cur_viewer = derived(cur_tab, ($cur_tab) => {
    let app_name = $cur_tab.graph_or_discrete ? $cur_tab.graph_viewer : $cur_tab.discrete_viewer;
    if (app_name) {
        let app = get_app(app_name);
        return app;
    }
});

export const cur_editor = derived(cur_tab, ($cur_tab) => {
    let app_name = $cur_tab.graph_or_discrete ? $cur_tab.graph_editor : $cur_tab.discrete_editor;
    if (app_name) {
        let app = get_app(app_name);
        return app;
    }
});

export const cur_app = derived(cur_tab, ($cur_tab) => {
    let app_name = $cur_tab.view_or_edit ?  $cur_tab.graph_or_discrete ? $cur_tab.graph_viewer : $cur_tab.discrete_viewer : $cur_tab.graph_or_discrete ? $cur_tab.graph_editor : $cur_tab.discrete_editor;
    if (app_name) {
        let app = get_app(app_name);
        return app;
    }
});

export const available_viewers = derived(cur_tab, ($cur_tab) => {
    let list = $cur_tab.graph_or_discrete ? $cur_tab.graph_viewers : $cur_tab.discrete_viewers;
    return list.map((viewer) => { 
        let app = { ...get_app(viewer) }; 
        if (!app["ng:u"]) app["ng:u"] = "view";
        return app 
    });
});

export const available_editors = derived(cur_tab, ($cur_tab) => {
    let list = $cur_tab.graph_or_discrete ? $cur_tab.graph_editors : $cur_tab.discrete_editors;
    return list.map((editor) => { 
        let app = { ...get_app(editor) }; 
        if (!app["ng:u"]) app["ng:u"] = "edit";
        return app 
    });
});

