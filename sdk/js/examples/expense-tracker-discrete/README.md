# NextGraph Expense Tracker Example with Discrete (JSON) documents

A complete example app demonstrating the **NextGraph Discrete (json) ORM SDK** with React, Vue, and Svelte frontends running side-by-side.
Changes made in one framework instantly sync to the others. All data is encrypted. Data types are generated from a SHEX schema.

You can find the example app in separate repositories for Svelte, Vue, or React and with the RDF (graph) ORM [in the docs](https://docs.nextgraph.org/en/framework/getting-started/).

Note that you can install this example app as standalone as well so that you don't have to install all the other NextGraph-related dependencies. You can find all information [in the docs](https://docs.nextgraph.org/en/framework/getting-started/).

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

> In Chrome, there are new restrictions for a public website including an iframe to localhost. And that's what we do here in third party mode, when you are developing your app with vite on localhost.
> The first time you will load the page, a popup will appear, asking you: "nextgraph.eu wants to look for and connect to any device on your local network". You should click on "Allow". If you get a gray screen, click on the recycle icon that is on the right side of the blue thin banner. Then you should be all good. If not, you have to go to `chrome://flags/#local-network-access-check` and select Disabled. This dev env issue has no impact on your production app deployed on your own domain, specially if you host your app with TLS.

- Open the URL displayed in the console. You'll be redirected to NextGraph to authenticate with your wallet, then your app loads inside NextGraph's secure iframe.
- You can open the app in a second tab to see how the data is propagated.
- **Note:** If the data hasn't loaded yet, the set appears empty.

## Project Structure

```
src/
├── frontends/
│   ├── react/                 # React components
│   ├── vue/                   # Vue components
│   └── svelte/                # Svelte components
│
├── utils/                     # Useful for your own applications utils, too!
│   ├── loadStore.ts           # Creates or loads the CRDT document
│   └── ngSession.ts           # NextGraph session initialization
└── app-wrapper/               # Astro app shell (hosts all frameworks)
```

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
