// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { SvelteURL } from "svelte/reactivity";
import { HistoryApi, LocationState, State } from "@svelte-router/core";

class MemoryHistory {
  #entries: { url: string; state: any }[] = [];
  #index = 0;
  #window: MemoryWindow;

  scrollRestoration: ScrollRestoration = "auto";

  constructor(
    window: MemoryWindow,
    initialUrl: string,
    initialState: any = null,
  ) {
    this.#window = window;
    this.#entries = [{ url: initialUrl, state: initialState }];
  }

  get length(): number {
    return this.#entries.length;
  }

  get state(): any {
    return this.#entries[this.#index]?.state ?? null;
  }

  pushState(data: any, _unused: string, url?: string | URL | null): void {
    const newUrl = this.#normalizeUrl(url);
    if (this.#index < this.#entries.length - 1) {
      this.#entries = this.#entries.slice(0, this.#index + 1);
    }
    this.#entries.push({ url: newUrl, state: data });
    this.#index = this.#entries.length - 1;
    this.#window.location = newUrl;
  }

  replaceState(data: any, _unused: string, url?: string | URL | null): void {
    const newUrl = this.#normalizeUrl(url);
    this.#entries[this.#index] = { url: newUrl, state: data };
    this.#window.location = newUrl;
  }

  back(): void {
    this.go(-1);
  }

  forward(): void {
    this.go(1);
  }

  go(delta: number = 0): void {
    if (!delta) {
      return;
    }
    const nextIndex = this.#index + delta;
    if (nextIndex < 0 || nextIndex >= this.#entries.length) {
      return;
    }
    this.#index = nextIndex;
    const entry = this.#entries[this.#index];
    this.#window.location = entry.url;
  }

  #normalizeUrl(url: string | undefined | URL | null) {
    return new URL(url ?? "", this.#window.location.href).href;
  }
}

class MemoryWindow {
  #location: SvelteURL;
  #history: MemoryHistory;

  constructor(svelteUrl: SvelteURL, initialState?: State) {
    this.#location = svelteUrl;
    this.#history = new MemoryHistory(
      this,
      this.#location.href,
      initialState ?? null,
    );
  }

  get location(): SvelteURL {
    return this.#location;
  }
  set location(href: string) {
    this.#location.href = href;
  }

  get history(): MemoryHistory {
    return this.#history;
  }
}

/**
 * Standard implementation of HistoryApi that uses the browser's native History API
 * and window.location. This is the default implementation used in normal browser environments.
 */
export class MemoryStockHistoryApi extends LocationState implements HistoryApi {
  #window: MemoryWindow;
  constructor(initialUrl?: string, initialState?: State) {
    super(initialUrl ?? "http://localhost/", initialState);

    this.#window = new MemoryWindow(this.url, initialState);
  }

  get length(): number {
    return this.#window?.history?.length ?? 0;
  }

  get scrollRestoration(): ScrollRestoration {
    return this.#window?.history?.scrollRestoration ?? "auto";
  }

  set scrollRestoration(value: ScrollRestoration) {
    if (this.#window?.history) {
      this.#window.history.scrollRestoration = value;
    }
  }

  back(): void {
    this.#window?.history?.back();
  }

  forward(): void {
    this.#window?.history?.forward();
  }

  go(delta?: number): void {
    this.#window?.history?.go(delta);
  }

  #updateHistory(
    historyMethod: "replaceState" | "pushState",
    data: any,
    unused: string,
    url?: string | URL | null,
  ): void {
    const normalizedState = this.normalizeState(data);
    this.#window?.history[historyMethod](normalizedState, unused, url);

    this.state = normalizedState;
  }

  pushState(data: any, unused: string, url?: string | URL | null): void {
    this.#updateHistory("pushState", data, unused, url);
  }

  replaceState(data: any, unused: string, url?: string | URL | null): void {
    this.#updateHistory("replaceState", data, unused, url);
  }

  dispose(): void {
    // No-op for in-memory history.
  }
}
