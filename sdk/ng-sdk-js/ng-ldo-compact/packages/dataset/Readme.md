# Dataset

An implementation of the full [RDF/JS Dataset API](https://rdf.js.org/dataset-spec/)

## Installation

```
npm i @ldo/dataset
```

## Simple Example

```typescript
import { createDataset } from "@ldo/dataset";
import { quad, namedNode } from "@ldo/rdf-utils";

imports: quad, namedNode as MyNamedNode
const dataset = createDataset();
dataset.add(
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Firebender")
  )
);
/*
Prints:
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> .
*/
console.log(dataset.toString());
```

## Advanced Example

The extended dataset implements all the [additional methods](https://rdf.js.org/dataset-spec/#dataset-interface) of the RDFJS dataset spec.

Usage:
```typescript
import { createDataset } from "@ldo/dataset";
import { quad, namedNode, literal } as rdfdm from '@ldo/rdf-utils';
// Required for advanced features:
import * as rdfds from "@rdfjs/dataset";
import { ExtendedDatasetFactory } from "@ldo/dataset";
import { Dataset, Quad, DatasetCoreFactory, DatasetCore } from "@rdfjs/types";

const { dataset: initializeDatasetCore } = rdfds;

/**
 * Create a dataset with default settings
 */
const defaultDataset = createDataset();

/**
 * Create a dataset with default settings and initialized values
 */
const initializedQuads = [
  quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat")
  ),
  quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://example.org/cartoons#name"),
    literal("Tom")
  ),
];
const defaultDataset2 = createDataset(initializedQuads);

/**
 * (Advanced Feature) Create a dataset by injecting a chosen datasetCore and datasetCoreFactory
 */
const datasetFactory: DatasetCoreFactory = {
  dataset: (quads?: Dataset<Quad> | Quad[]): DatasetCore => {
    return initializeDatasetCore(
      Array.isArray(quads) ? quads : quads?.toArray()
    );
  },
};
const extendedDatasetFactory = new ExtendedDatasetFactory(datasetFactory);
const customDataset = extendedDatasetFactory.dataset(initializedQuads);

/**
 * Do all the methods of the RDFJS Dataset interface. For a full list of methods, go to
 * https://rdf.js.org/dataset-spec/#data-interfaces
 */
defaultDataset.add(
  quad(
    namedNode("http://example.org/cartoons#Miuki"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat")
  )
);
const combinedDataset = defaultDataset.union(defaultDataset2);
const differenceDataset = combinedDataset.difference(customDataset);
// Prints true because "defaultDataset2" and "customDataset" have equal values
// combinedDataset = defaultDataset ∪ defaultDataset2
// differenceDatasset = defaultDataset \ customDataset
// Therefore differenceDataset == defaultDataset
console.log(differenceDataset.equals(defaultDataset));
```

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT