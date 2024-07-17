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

let loaded_external_apps = {};

export const load_app = async (appName: string) => {

    if (appName.startsWith("n:g:z")) {
        let app = official_apps[appName];
        if (!app) throw new Error("Unknown official app");
        return await import(`./apps/${app["ng:b"]}.svelte`);
    } else {
        //TODO: load external app from its repo
        // TODO: return IFrame component
    }

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
    if (class_name.startsWith("app/") && class_name !== "app/z") {
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
    graph_viewers.push.apply(graph_viewers, find_viewers_for_class("data/graph"));
    graph_editors.push.apply(graph_editors, find_editors_for_class("data/graph"));

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

export const open_branch = async (nuri: string) => {
    let class_name = "post/rich";

    
}

export const open_doc = async (nuri: string) => {
    //let class_name = "doc/viz/plotly";
    let class_name = "post/md";

    cur_tab.update(ct => {
        return {...ct, ...class_to_viewers_editors(class_name)};
    });

}

export const cur_tab = writable({
    cur_store: {
        has_outer: {
            nuri_trail: ":v:l"
        },
        type: "public", // "protected", "private", "group", "dialog",
        favicon: "",
        title: "Group B",
        is_member: true,
    },
    cur_branch: {
        b: "b:xxx", //branch id (can be null if not of type "branch")
        c: "c:xxx", //commit(s) id
        type: "main", // "stream", "detached", "branch", "in_memory" (does not save)
        display: "c:X", // or main or stream or a:xx or branch:X (only 7 chars)
        attachments: 1,
        files: 1,
        comments: 2,
        class: "post/rich",
        title: false,
        icon: false,
        description: "",
        app: "n:g:z:json_ld_editor", // current app being used
    },
    view_or_edit: true,
    graph_viewer: "", // selected viewer
    graph_editor: "", // selected editor
    discrete_viewer: "", // selected viewer
    discrete_editor: "", // selected editor
    graph_viewers: [], // list of available viewers
    graph_editors: [], // list of available editors
    discrete_viewers: [], // list of available viewers
    discrete_editors: [], // list of available editors
    find: false,//or string to find
    graph_or_discrete: false, // set to cur_branch.class === "Graph"
    read_cap: 'r:',
    doc: {
        is_store: false,
        is_member: true,
        can_edit: true,
        live_edit: false,
        title: "Doc A",
        authors: "",
        icon: "",
        description: "",
        stream: {
            notif: 1,
            last: "",
        },
        live_editors: {

        },
    },
    folders_pane: false,
    toc_pane: false,
    right_pane: false, // "folders", "toc", "branches", "files", "history", "comments", "info", "chat", "mc"
    action: false, // "repost", "dm", "react",  "author", "copy", "forward", "links", "qr", "download", "embed", "new_block", "notifs", "schema", "signature", "permissions", "settings", "print", "console", "source", "services", "dev",

});

export const has_editor_chat = derived(cur_tab, ($cur_tab) => {
    return $cur_tab.doc.can_edit && $cur_tab.cur_store.type !== "private" && $cur_tab.cur_store.type !== "dialog";
});

export const toggle_live_edit = () => {
    cur_tab.update(ct => {
        ct.doc.live_edit = !ct.doc.live_edit;
        return ct;
    });
}

export const set_viewer = (app_name: string) => {
    if (get(cur_tab).graph_or_discrete) {
        cur_tab.update(ct => {ct.graph_viewer = app_name; ct.cur_branch.app = app_name; return ct;});
    } else {
        cur_tab.update(ct => {ct.discrete_viewer = app_name; ct.cur_branch.app = app_name; return ct;});
    }
}

export const set_editor = (app_name: string) => {
    if (get(cur_tab).graph_or_discrete) {
        cur_tab.update(ct => {ct.graph_editor = app_name; ct.cur_branch.app = app_name; return ct;});
    } else {
        cur_tab.update(ct => {ct.discrete_editor = app_name; ct.cur_branch.app = app_name; return ct;});
    }
}

export const toggle_graph_discrete = () => {
    cur_tab.update(ct => {
        ct.graph_or_discrete = !ct.graph_or_discrete;
        return ct;
    });
}

export const set_graph_discrete = (val:boolean) => {
    cur_tab.update(ct => {
        ct.graph_or_discrete = val;
        return ct;
    });
}

export const set_view_or_edit = (val:boolean) => {
    cur_tab.update(ct => {
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

export const cur_branch_has_discrete = derived(cur_tab, ($cur_tab) => (get_class($cur_tab.cur_branch.class)["ng:crdt"]) !== "Graph");
