// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use nextgraph::local_broker::{init_local_broker, LocalBrokerConfig};
use std::env::current_dir;
use std::fs::create_dir_all;

#[async_std::main]
async fn main() -> std::io::Result<()> {
    // get the current working directory
    let mut current_path = current_dir()?;
    current_path.push("ng");
    create_dir_all(current_path.clone())?;

    // initialize the local_broker with config to save to disk in a folder called `ng` in the current directory
    init_local_broker(Box::new(move || {
        LocalBrokerConfig::BasePath(current_path.clone())
    }))
    .await;

    Ok(())
}
