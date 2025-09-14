# @ldo/solid-type-index

A library to handle [type indexes](https://solid.github.io/type-indexes/index.html) with [LDO](https://ldo.js.org).

## Installation

```
npm i @ldo/solid-type-index @ldo/solid
```

## Usage


```typescript
import { initTypeIndex } from "@ldo/solid-type-index";
import { createSolidLdoDataset } from "@ldo/solid"; 

async function main() {
  const myWebId = "https://example.com/profile/card#me";
  const solidLdoDataset = createSolidLodDataset();

  // Initialize a type index for a webId in case it isn't initialized
  await initTypeIndex(myWebId, { solidLdoDataset });

  // Get Type Registrations
  const typeRegistrations = await getTypeRegistrations(WEB_ID, { 
    solidLdoDataset,
  });

  // Get Instance Uris (the URIs for resources that contain an instance of a
  // class)
  const bookmarkUris: string[] = await getInstanceUris(
    "http://www.w3.org/2002/01/bookmark#Bookmark",
    typeRegistrations,
    { solidLdoDataset }
  );

}
main();
```

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
