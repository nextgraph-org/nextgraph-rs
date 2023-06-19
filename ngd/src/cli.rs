// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub(crate) struct Cli {
    /// List all network interfaces available on the host
    #[arg(short('i'), long)]
    pub list_interfaces: bool,

    /// Increase the logging output. once : info, twice : debug, 3 times : trace
    #[arg(short, long, action = clap::ArgAction::Count)]
    pub verbose: u8,

    /// Base path for server home folder containing all persistent files
    #[arg(short, long, default_value = ".ng")]
    pub base: String,

    /// Master key of the server. Should be a base64-url encoded serde serialization of a [u8; 32]. if not provided, a new key will be generated for you
    #[arg(short, long, env = "NG_SERVER_KEY")]
    pub key: Option<String>,

    /// Saves to disk the provided or automatically generated key. Only used if file storage is secure. Alternatives are passing the key at every start with --key or NG_SERVER_KEY env var.
    #[arg(long)]
    pub save_key: bool,
}
