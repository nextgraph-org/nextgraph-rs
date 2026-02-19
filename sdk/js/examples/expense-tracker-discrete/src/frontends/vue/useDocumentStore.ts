// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { computed, ref, type ComputedRef } from "vue";
import { useDiscrete } from "@ng-org/orm/vue";
import type { DocumentStore } from "../../types";
import { ormConnection, ormConnectionPromise } from "../../utils/ngSession";

export function useDocumentStore() {
    const documentId = ref<string | undefined>(ormConnection?.documentId);

    if (!documentId.value) {
        ormConnectionPromise.then((con) => {
            documentId.value = con.documentId;
        });
    }

    return useDiscrete(documentId) as {
        doc: ComputedRef<DocumentStore | undefined>;
    };
}
