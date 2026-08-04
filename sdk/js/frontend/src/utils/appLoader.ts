// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

let registry : Record<string, {port: number, package: string, dev: boolean, entries: Record<string, string>}> = {};

let isTauri: boolean = false;

export function initRegistry(tauri: boolean) {
    isTauri = tauri;
}

export async function registerApps(reg: Record<string, {port: number, package: string, dev: boolean, entries: Record<string, string>}> ) {
    registry = reg;
}

export async function loadApp(zera: string, entry: string) {

    const app = registry[zera];
    if (!app) throw new Error(`app ${zera} not found`);
    let url;
    const path = app.entries[entry];
    if (!path) throw new Error(`entry ${entry} not found in ${zera}`);
    if (app.dev) {
        url = `http://localhost:${app.port}/${path}`;
    } else {
        let parts = path.split("/");
        let filename = parts[parts.length - 1];
        filename = filename.replace(/\.tsx?/, ".js");
        //url = `http://localhost:5001/${filename}`;
        url = `/z/${zera}/dist/${filename}`;
        if (!isTauri) {
            url = new URL(url, window.location.href).href;
        } else {
            // ng://localhost/${url}
            // win or android http://ng.localhost/${url} 
        }
    }
    return import(/* @vite-ignore */ url).then(
        (mod) => mod.default ?? mod,
    );
}