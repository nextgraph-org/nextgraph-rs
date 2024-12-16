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

pub mod types;

#[doc(hidden)]
pub mod app_protocol;

pub mod broker;

pub mod server_broker;

#[doc(hidden)]
pub mod connection;

pub mod actor;

pub mod actors;

pub mod utils;

#[doc(hidden)]
pub mod tests;

#[doc(hidden)]
pub static NG_BOOTSTRAP_LOCAL_PATH: &str = "/.ng_bootstrap";

#[cfg(debug_assertions)]
#[doc(hidden)]
pub static WS_PORT: u16 = 14400;

#[cfg(not(debug_assertions))]
#[doc(hidden)]
pub static WS_PORT: u16 = 80;

#[doc(hidden)]
pub static WS_PORT_ALTERNATE: [u16; 4] = [14400, 28800, 43200, 57600];

#[doc(hidden)]
pub static WS_PORT_ALTERNATE_SUPERUSER: u16 = 144;

#[doc(hidden)]
pub static WS_PORT_REVERSE_PROXY: u16 = 1440;
