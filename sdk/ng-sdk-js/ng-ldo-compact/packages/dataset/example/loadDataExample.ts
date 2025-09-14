import { serializedToDataset } from "../src/index.js";

async function run(): Promise<void> {
  // Create an ExtendedDataset using Turtle
  const turtleData = `
    @prefix : <#>.
    @prefix elem: <http://purl.org/dc/elements/1.1/>.
    @prefix card: </profile/card#>.
    
    :this
        elem:author card:me.
  `;
  const turtleDataset = await serializedToDataset(turtleData, {
    baseIRI:
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#",
    // NOTE: the "format" field isn't required because Turtle is the default parser
  });

  // Create a SubcribableDataset using JSON-LD
  const jsonLdData = [
    {
      "@id":
        "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#this",
      "http://purl.org/dc/elements/1.1/author": [
        {
          "@id": "https://jackson.solidcommunity.net/profile/card#me",
        },
      ],
    },
    {
      "@id": "https://jackson.solidcommunity.net/profile/card#me",
    },
  ];
  const jsonLdDataset = await serializedToDataset(JSON.stringify(jsonLdData), {
    baseIRI:
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#",
    format: "application/ld+json",
  });
  // Returns true because the input data describes the same triple.
  console.log(turtleDataset.equals(jsonLdDataset));
}
run();
