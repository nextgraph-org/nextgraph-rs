/// <reference types="svelte" />
/// <reference types="vite/client" />

/**
 * Declares the Svelte component type for TypeScript.
 * This allows you to import .svelte files into your .ts files.
 */
declare module "*.svelte" {
  import type { ComponentType, SvelteComponent } from "svelte";
  // Define the SvelteComponent type more generically or specifically if needed.
  // For general use, ComponentType<SvelteComponent> is a good start.
  const component: ComponentType<SvelteComponent>;
  export default component;
}
