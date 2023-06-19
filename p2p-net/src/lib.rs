/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/
#[macro_use]
extern crate p2p_repo;

pub mod types;

pub mod errors;

pub mod broker_connection;

pub mod broker;

pub mod connection;

pub mod actor;

pub mod actors;

pub mod utils;

pub mod tests;

pub static WS_PORT: u16 = 1025;
