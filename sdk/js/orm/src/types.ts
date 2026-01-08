// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/** The Scope of a shape request.
 * `subjects` maybe set to `undefined` or `[]` to indicate no filtering by subject.
 * If `graphs` is `undefined`, the scope is all available graphs.
 * **If `graphs` is `[]`, the scope is none and no objects are returned.
 */
export type Scope = { graphs?: string[]; subjects?: string[] };
