import { serializedToDataset } from "../src/index.js";
import { turtleData, jsonLdData, turtleData2 } from "./sampleData.js";

describe("createExtendedDatasetFromSerializedInput", () => {
  it("creates a dataset with turtle", async () => {
    const dataset = await serializedToDataset(turtleData);
    expect(dataset.size).toBe(9);
    expect(dataset.toString()).toBe(
      '<#id1604448082795> <http://www.w3.org/2002/12/cal/ical#dtstart> "2020-11-04T00:01:22Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .\n<#id1604448082795> <http://www.w3.org/2005/01/wf/flow#participant> <undefined/profile/card#me> .\n<#id1604448082795> <http://www.w3.org/ns/ui#backgroundColor> "#e1f7cd" .\n<#this> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/pim/meeting#LongChat> .\n<#this> <http://purl.org/dc/elements/1.1/author> <undefined/profile/card#me> .\n<#this> <http://purl.org/dc/elements/1.1/created> "2020-11-04T00:01:20Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .\n<#this> <http://purl.org/dc/elements/1.1/title> "Chat channel" .\n<#this> <http://www.w3.org/2005/01/wf/flow#participation> <#id1604448082795> .\n<#this> <http://www.w3.org/ns/ui#sharedPreferences> <#SharedPreferences> .\n',
    );
  });

  it.skip("creates a dataset with json-ld", async () => {
    const dataset = await serializedToDataset(JSON.stringify(jsonLdData), {
      format: "application/ld+json",
    });
    expect(dataset.size).toBe(9);
  });

  it("Should create a dataset with some more turtle", async () => {
    const dataset = await serializedToDataset(turtleData2);
    expect(dataset.toString()).toBe(
      '<http://a.example/Employee7> <http://xmlns.com/foaf/0.1/givenName> "Robert" .\n<http://a.example/Employee7> <http://xmlns.com/foaf/0.1/givenName> "Taylor" .\n<http://a.example/Employee7> <http://xmlns.com/foaf/0.1/familyName> "Johnson" .\n<http://a.example/Employee7> <http://www.w3.org/2002/12/cal/ical#dtstart> "2020-11-04T00:01:22Z" .\n<http://a.example/Employee7> <http://xmlns.com/foaf/0.1/mbox> <mailto:rtj@example.com> .\n',
    );
  });

  it.skip("Should error when given invalid JSON", async () => {
    await expect(
      serializedToDataset('{ bad" json', { format: "application/ld+json" }),
    ).rejects.toThrow("Unexpected token b in JSON at position 2");
  });
});
