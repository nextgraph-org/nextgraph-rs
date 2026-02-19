// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useDiscrete } from "@ng-org/orm/react";
import type { DeepSignal } from "@ng-org/orm";
import type { DocumentStore } from "../../types";
import { ormConnection, ormConnectionPromise } from "../../utils/ngSession";
import { useEffect, useState } from "react";

export function useDocumentStore() {
    const [documentId, setDocumentId] = useState(ormConnection?.documentId);

    useEffect(() => {
        // If the connection hasn't been established, wait for it.
        if (!documentId) {
            ormConnectionPromise.then((con) => setDocumentId(con.documentId));
        }
    });

    const { doc } = useDiscrete(documentId);

    return doc as DeepSignal<DocumentStore> | undefined;
}
