// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { register, init, locale, format } from "svelte-i18n";
import { default as ng } from "../.auth-react/api";

// Make sure that a file named `locales/<lang>.json` exists when adding it here.
export const available_languages = {
    en: "English",
    //de: "Deutsch",
    //fr: "Français",
    //ru: "Русский",
    //es: "Español",
    //it: "Italiano",
    //zh: "中文",
    //pt: "Português",
};

export const select_default_lang = async () => {

    for (const lang of Object.keys(available_languages)) {
        let json = await import(`./locales/${lang}.json`);
        register(lang, async ()=>{return json})
    }
    
    init({
        fallbackLocale: "en",
        initialLocale: "en",
    });

    let locales = await ng.locales();
    for (let lo of locales) {
        if (available_languages[lo]) {
            // exact match (if locales is a 2 chars lang code, or if we support regionalized translations)
            locale.set(lo);
            return;
        }
        lo = lo.substr(0, 2);
        if (available_languages[lo]) {
            locale.set(lo);
            return;
        }
    }
};