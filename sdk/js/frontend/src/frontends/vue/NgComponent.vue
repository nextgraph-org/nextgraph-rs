<!--
// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script setup lang="ts">
import {
    type Component,
    inject,
    onBeforeUnmount,
    onUnmounted,
    ref,
    watch,
} from "vue";
import Parcel from "@ng-org/single-spa-vue/parcel";
import { ngComponentContextKey } from "./ngComponentContext.ts";
import type {
    ComponentFactoryParams,
    NgComponentContext,
    NgComponentProps,
    ParentCallbacks,
} from "../../utils/types.ts";
import { mountRootParcel } from "single-spa";
import { deepSignal } from "@ng-org/alien-deepsignals";

type VueComponentProps = NgComponentProps & {
    /** Component to show while the NgComponent is not loaded. E.g. a spinner. Default is none. */
    loadingIndicator?: Component;
};

const {
    componentId,
    component: componentFactory,
    initialPathName,
    props = {},
    loadingIndicator,
} = defineProps<VueComponentProps>();

const componentContext = inject<NgComponentContext>(ngComponentContextKey);
if (!componentContext) {
    throw new Error(
        "Mounting a component from Vue root without a component context. If this is intentional, set the ReactComponentContext."
    );
}

if (componentContext.childComponentIds.has(componentId)) {
    throw new Error(`The component with id ${componentId} is already mounted.`);
} else {
    componentContext.childComponentIds.add(componentId);
    onBeforeUnmount(() =>
        componentContext.childComponentIds.delete(componentId)
    );
}

// Create callbacks the new component can call to register and unregister children.
const parentCallbacks: ParentCallbacks = {
    registerChild(ids, reactivePayload) {
        componentContext.parentCallbacks.registerChild(
            [componentId, ...ids],
            reactivePayload
        );
    },
    unRegisterChild(ids) {
        componentContext.parentCallbacks.unRegisterChild([componentId, ...ids]);
    },
};

const componentFactoryParams: ComponentFactoryParams = {
    parentCallbacks,
    assignedId: componentId,
    shared: deepSignal({ pathName: initialPathName }),
};

// Register new component.
componentContext.parentCallbacks.registerChild(
    [componentId],
    componentFactoryParams.shared
);
onUnmounted(() => {
    componentContext.parentCallbacks.unRegisterChild([componentId]);
});

const loadLifecycles = async () => {
    let lifecycleHooks: any = await componentFactory;
    if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
    }
    if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
    }

    return {
        name: componentId,
        ...lifecycleHooks,
    };
};

let resolvedConfig = ref(undefined);

Promise.try(async () => {
    if (!componentFactory) {
        // wait until componentFactory becomes defined
        await new Promise<void>((resolve) => {
            const stop = watch(
                () => componentFactory,
                (v) => {
                    if (v) {
                        stop();
                        resolve();
                    }
                }
            );
        });
    }

    resolvedConfig.value = await loadLifecycles();
});
</script>

<template>
    <Parcel
        v-if="resolvedConfig"
        :config="resolvedConfig"
        :mountParcel="mountRootParcel"
        :parcelProps="props"
    />
    <component v-else-if="loadingIndicator" :is="loadingIndicator" />
</template>
