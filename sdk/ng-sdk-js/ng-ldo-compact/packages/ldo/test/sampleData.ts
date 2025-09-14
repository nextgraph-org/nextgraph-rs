export const sampleTurtle = `
  <https://solidweb.me/jackson/profile/card> a <http://xmlns.com/foaf/0.1/PersonalProfileDocument>;
      <http://xmlns.com/foaf/0.1/maker> <#me>;
      <http://xmlns.com/foaf/0.1/primaryTopic> <#me>.
  <#me> a <http://xmlns.com/foaf/0.1/Person>;
      <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://solidweb.me/>;
      <http://www.w3.org/2006/vcard/ns#fn> "Jackson Morgan";
      <http://www.w3.org/2006/vcard/ns#hasEmail> <#id1651115504716>.
  `;

export const sampleJsonld = [
  {
    "@id": "https://example.com/item",
    "http://xmlns.com/foaf/0.1/name": [{ "@value": "Captain of Coolness" }],
  },
];
