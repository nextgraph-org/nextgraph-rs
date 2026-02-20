// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { DocumentStore } from "../../types";
import { ormSubscriptionPromise } from "../../utils/ngSession";
import type { DeepSignal } from "@ng-org/orm";
import { useDiscrete } from "@ng-org/orm/svelte";

export function useDocumentStore() {
    const documentIdPromise = ormSubscriptionPromise.then(
        (connection) => connection.documentId
    );

    return useDiscrete(documentIdPromise) as {
        doc: DeepSignal<DocumentStore> | undefined;
    };
}
