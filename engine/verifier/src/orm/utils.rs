// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

/// `~` is encoded as ~0, `/` is encoded as ~1.
pub fn escape_json_pointer_segment(path_segment: &String) -> String {
    path_segment.replace("~", "~0").replace("/", "~1")
}
/// `~` is encoded as ~0, `/` is encoded as ~1.
pub fn decode_json_pointer(path: &String) -> String {
    path.replace("~1", "/").replace("~0", "~")
}
