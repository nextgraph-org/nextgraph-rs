# NextGraph Expense Tracker Example with Graph/RDF documents

A complete example app demonstrating the **NextGraph RDF ORM SDK** with React, Vue, and Svelte frontends running side-by-side.
Changes made in one framework instantly sync to the others. All data is encrypted. Data types are generated from a SHEX schema.

This README walks you through the features of the SDK and how to build your own NextGraph-powered application.

## Table of Contents

- [NextGraph Expense Tracker Example with Graph/RDF documents](#nextgraph-expense-tracker-example-with-graphrdf-documents)
    - [Table of Contents](#table-of-contents)
    - [Quick Start](#quick-start)
    - [Repository Structure](#repository-structure)
    - [Building Your Own App](#building-your-own-app)
        - [Step 1: Dependencies](#step-1-dependencies)
        - [Step 2: NextGraph Initialization](#step-2-nextgraph-initialization)
        - [Step 3: Defining Data Shapes (Schema)](#step-3-defining-data-shapes-schema)
    - [Frontend Framework-Specific Notes](#frontend-framework-specific-notes)
        - [React](#react)
        - [Vue](#vue)
        - [Svelte](#svelte)
    - [About NextGraph](#about-nextgraph)
    - [License](#license)

## Quick Start

Create a wallet at https://nextgraph.eu and log in once with your password.

Clone the example expense tracker app:

```bash
# Install dependencies
pnpm install

# Generate TypeScript types from SHEX schemas
pnpm build:orm

# Run the development server
pnpm dev
```

- Open in your browser the URL displayed in console. You'll be redirected to NextGraph to authenticate with your wallet, then your app loads inside NextGraph's secure iframe.
- You can open the app in a second tab to see how the data is propagated

## Repository Structure

```
src/
├── shapes/                    # Data model definitions
│   ├── shex/
│   │   └── expenseShapes.shex           # SHEX schema (source of truth)
│   └── orm/
│       ├── expenseShapes.typings.ts     # Generated TypeScript interfaces
│       ├── expenseShapes.shapeTypes.ts  # Generated shape type objects
│       └── expenseShapes.schema.ts      # Generated schema metadata
├── frontends/
│   ├── react/                 # React components
│   ├── vue/                   # Vue components
│   └── svelte/                # Svelte components
├── utils/
│   └── ngSession.ts           # NextGraph session initialization
└── app-wrapper/               # Astro app shell (hosts all frameworks)
```

---

## Building Your Own App

If you want to create your own app, you can walk through the following steps.

### Step 1: Dependencies

Install the required NextGraph packages:

```bash
pnpm add @ng-org/web@latest @ng-org/orm@latest @ng-org/shex-orm@latest
```

| Package            | Purpose                                 |
| ------------------ | --------------------------------------- |
| `@ng-org/web`      | Core NextGraph SDK for web applications |
| `@ng-org/orm`      | Reactive ORM with framework adapters    |
| `@ng-org/shex-orm` | SHEX-to-TypeScript code generation      |

You probably won't need to load 3 different frontend frameworks (React, Vue, Svelte) not Astro in your app. Just choose one of those framework.

### Step 2: NextGraph Initialization

Your app runs inside a NextGraph-controlled iframe. To make things easier for you, we created a utility file that handles this, see [`src/utils/ngSession.ts`](src/utils/ngSession.ts).

The file exports an `init()` function. Call this as early as possible.

### Step 3: Defining Data Shapes (Schema)

NextGraph uses [SHEX (Shape Expressions)](https://shex.io/) to define your data model.
SHEX is a language to define RDF shapes. RDF (Resource Description Framework) is a way to represent data in a format that makes **application interoperability** easier. Under the hood, NextGraph comes with an RDF graph database. The ORM handles all interaction with the RDF database for you.

You can find the SHEX definitions in [`src/shapes/shex`](src/shapes/shex) and they are converted to ShapeTypes using the script `pnpm build:orm`.

For more information, see the READMEs of `@ng-org/shex-orm` (and `@ng-org/orm`.)

> **Watch Out:** If you modify an object in a way that breaks any of the shape's constraints, e.g. by modifying the `@type`, the object will "disappear" from ORM perspective. The data is not deleted (in RDF all data is stored atomically) but since it does not match the shape anymore, it is not shown in the frontend. You can still modify the data with SPARQL queries.
>
> The ORM supports nested objects as well. When you delete a nested object from a parent object, **the nested object is not deleted**. Only the link from the parent object to the nested object is removed.

## Frontend Framework-Specific Notes

### React

For an example, see [`src/frontends/react/Expenses.tsx](src/frontends/react/Expenses.tsx)

**Note:**

- Changes to `expense.title` automatically re-render the component, no `setState()`
    - Changes of nested objects cause a rerender in child components too, since the
      nested JS objects in the hierarchy are "replaced", meaning that an equality check (==) returns false.
- If your environment does not support [iterator objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator) yet, you can use the spread `[...expenses]` to convert Set to array for `.map()`. Otherwise, you can call `map()` directly on the returned set.
- If the data hasn't loaded, the set appears empty.

### Vue

For an example, see [`src/frontends/vue/Expenses.vue](src/frontends/vue/Expenses.vue)

### Svelte

For an example, see [`src/frontends/svelte/Expenses.svelte](src/frontends/svelte/Expenses.svelte)

**Note:**

- We have 2 versions for Svelte: the newest Runes/Svelte5 version (which is the default), and the backward compatible Svelte4/3 version

---

## About NextGraph

> **NextGraph** brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy.
>
> Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info: [https://nextgraph.org](https://nextgraph.org)

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.
