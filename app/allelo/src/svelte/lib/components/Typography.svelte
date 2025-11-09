<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  type Variant =
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "subtitle1"
    | "subtitle2"
    | "body1"
    | "body2"
    | "caption"
    | "overline";

  const defaultMapping: Record<Variant, keyof HTMLElementTagNameMap> = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    h6: "h6",
    subtitle1: "h6",
    subtitle2: "h6",
    body1: "p",
    body2: "p",
    caption: "span",
    overline: "span",
  };

  export let variant: Variant = "body1";
  export let component: keyof HTMLElementTagNameMap | undefined = undefined;
  export let align: "inherit" | "left" | "center" | "right" | "justify" = "inherit";
  export let gutterBottom = false;
  export let noWrap = false;
  export let className = "";
  export let style: string | undefined = undefined;

  const alignClasses: Record<typeof align, string> = {
    inherit: "",
    left: "mui-typography-align-left",
    center: "mui-typography-align-center",
    right: "mui-typography-align-right",
    justify: "mui-typography-align-justify",
  };

  $: tag = component ?? defaultMapping[variant] ?? "span";
  $: classes = [
    "mui-typography",
    `mui-typography-${variant}`,
    gutterBottom ? "mui-typography-gutter" : "",
    noWrap ? "mui-typography-nowrap" : "",
    alignClasses[align],
    className,
  ]
    .filter(Boolean)
    .join(" ");
</script>

<svelte:element this={tag} class={classes} {style}>
  <slot />
</svelte:element>

<style>
  .mui-typography {
    font-family: var(--mui-typography-fontFamily);
    color: var(--mui-palette-text-primary);
    margin: 0;
  }

  .mui-typography-h1 {
    font-size: var(--mui-typography-h1-fontSize);
    font-weight: var(--mui-typography-h1-fontWeight);
    line-height: var(--mui-typography-h1-lineHeight);
    letter-spacing: var(--mui-typography-h1-letterSpacing);
  }

  .mui-typography-h2 {
    font-size: var(--mui-typography-h2-fontSize);
    font-weight: var(--mui-typography-h2-fontWeight);
    line-height: var(--mui-typography-h2-lineHeight);
    letter-spacing: var(--mui-typography-h2-letterSpacing);
  }

  .mui-typography-h3 {
    font-size: var(--mui-typography-h3-fontSize);
    font-weight: var(--mui-typography-h3-fontWeight);
    line-height: var(--mui-typography-h3-lineHeight);
    letter-spacing: var(--mui-typography-h3-letterSpacing);
  }

  .mui-typography-h4 {
    font-size: var(--mui-typography-h4-fontSize);
    font-weight: var(--mui-typography-h4-fontWeight);
    line-height: var(--mui-typography-h4-lineHeight);
    letter-spacing: var(--mui-typography-h4-letterSpacing);
  }

  .mui-typography-h5 {
    font-size: var(--mui-typography-h5-fontSize);
    font-weight: var(--mui-typography-h5-fontWeight);
    line-height: var(--mui-typography-h5-lineHeight);
    letter-spacing: var(--mui-typography-h5-letterSpacing);
  }

  .mui-typography-h6 {
    font-size: var(--mui-typography-h6-fontSize);
    font-weight: var(--mui-typography-h6-fontWeight);
    line-height: var(--mui-typography-h6-lineHeight);
    letter-spacing: var(--mui-typography-h6-letterSpacing);
  }

  .mui-typography-subtitle1 {
    font-size: var(--mui-typography-subtitle1-fontSize);
    font-weight: var(--mui-typography-subtitle1-fontWeight);
    line-height: var(--mui-typography-subtitle1-lineHeight);
    letter-spacing: var(--mui-typography-subtitle1-letterSpacing);
  }

  .mui-typography-subtitle2 {
    font-size: var(--mui-typography-subtitle2-fontSize);
    font-weight: var(--mui-typography-subtitle2-fontWeight);
    line-height: var(--mui-typography-subtitle2-lineHeight);
    letter-spacing: var(--mui-typography-subtitle2-letterSpacing);
  }

  .mui-typography-body1 {
    font-size: var(--mui-typography-body1-fontSize);
    font-weight: var(--mui-typography-body1-fontWeight);
    line-height: var(--mui-typography-body1-lineHeight);
    letter-spacing: var(--mui-typography-body1-letterSpacing);
  }

  .mui-typography-body2 {
    font-size: var(--mui-typography-body2-fontSize);
    font-weight: var(--mui-typography-body2-fontWeight);
    line-height: var(--mui-typography-body2-lineHeight);
    letter-spacing: var(--mui-typography-body2-letterSpacing);
  }

  .mui-typography-caption {
    font-size: var(--mui-typography-caption-fontSize);
    font-weight: var(--mui-typography-caption-fontWeight);
    line-height: var(--mui-typography-caption-lineHeight);
    letter-spacing: var(--mui-typography-caption-letterSpacing);
  }

  .mui-typography-overline {
    font-size: var(--mui-typography-overline-fontSize);
    font-weight: var(--mui-typography-overline-fontWeight);
    line-height: var(--mui-typography-overline-lineHeight);
    letter-spacing: var(--mui-typography-overline-letterSpacing);
    text-transform: var(--mui-typography-overline-textTransform);
  }

  .mui-typography-gutter {
    margin-bottom: calc(var(--mui-spacing) * 1.5);
  }

  .mui-typography-nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mui-typography-align-left {
    text-align: left;
  }

  .mui-typography-align-center {
    text-align: center;
  }

  .mui-typography-align-right {
    text-align: right;
  }

  .mui-typography-align-justify {
    text-align: justify;
  }
</style>
