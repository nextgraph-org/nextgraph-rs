/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

#![cfg(target_arch = "wasm32")]
#![allow(unused_imports)]

use serde::{Deserialize, Serialize};

use wasm_bindgen::prelude::*;

use ng_wallet::permissions::{AppManifest, *};

use sys_locale::get_locales;

#[wasm_bindgen]
pub fn encode_manifest_v0(origin: String, singleton: bool, access_requests: JsValue) -> Result<JsValue, JsValue> {
    let access_requests = serde_wasm_bindgen::from_value::<Vec<AccessRequestV0>>(access_requests).map_err(|_| "Invalid access_requests list")?;
    let url_param = if access_requests.len() == 0 {
        AppManifest::new_for_origin_all_access_v0(origin)
    } else {
        AppManifest::new_v0(origin, singleton, access_requests)
    }.to_url_param();
    Ok(serde_wasm_bindgen::to_value(&url_param).unwrap())
}

#[wasm_bindgen]
pub fn locales() -> Result<JsValue, JsValue> {
    Ok(serde_wasm_bindgen::to_value(&get_locales().collect::<Vec<_>>()).unwrap())
}