// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_broker::server_ws::run_server;
use p2p_net::WS_PORT;

#[async_std::main]
async fn main() -> std::io::Result<()> {
    println!("Starting NextGraph daemon...");

    run_server(format!("127.0.0.1:{}", WS_PORT).as_str()).await?;

    Ok(())
}
