export const turtleData = `
      @prefix : <#>.
      @prefix mee: <http://www.w3.org/ns/pim/meeting#>.
      @prefix XML: <http://www.w3.org/2001/XMLSchema#>.
      @prefix n5: <http://purl.org/dc/elements/1.1/>.
      @prefix c6: </profile/card#>.
      @prefix ui: <http://www.w3.org/ns/ui#>.
      @prefix ic: <http://www.w3.org/2002/12/cal/ical#>.
      @prefix flow: <http://www.w3.org/2005/01/wf/flow#>.
      
      :id1604448082795
          ic:dtstart "2020-11-04T00:01:22Z"^^XML:dateTime;
          flow:participant c6:me;
          ui:backgroundColor "#e1f7cd".
      :this
          a mee:LongChat;
          n5:author c6:me;
          n5:created "2020-11-04T00:01:20Z"^^XML:dateTime;
          n5:title "Chat channel";
          flow:participation :id1604448082795;
          ui:sharedPreferences :SharedPreferences.
    `;

export const turtleData2 = `
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      @prefix ic: <http://www.w3.org/2002/12/cal/ical#>.
      <http://a.example/Employee7>
        foaf:givenName  "Robert"^^xsd:string, "Taylor"^^xsd:string ;
        foaf:familyName "Johnson"^^xsd:string ;
        ic:dtstart "2020-11-04T00:01:22Z"^^xsd:string ;
        # no phone number needed
        foaf:mbox       <mailto:rtj@example.com>
        .
    `;

export const jsonLdData = [
  {
    "@id": "http://www.w3.org/ns/pim/meeting#LongChat",
  },
  {
    "@id":
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#SharedPreferences",
  },
  {
    "@id":
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#id1604448082795",
    "http://www.w3.org/2002/12/cal/ical#dtstart": [
      {
        "@value": "2020-11-04T00:01:22Z",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    ],
    "http://www.w3.org/2005/01/wf/flow#participant": [
      {
        "@id": "https://jackson.solidcommunity.net/profile/card#me",
      },
    ],
    "http://www.w3.org/ns/ui#backgroundColor": [
      {
        "@value": "#e1f7cd",
      },
    ],
  },
  {
    "@id":
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#this",
    "@type": ["http://www.w3.org/ns/pim/meeting#LongChat"],
    "http://purl.org/dc/elements/1.1/author": [
      {
        "@id": "https://jackson.solidcommunity.net/profile/card#me",
      },
    ],
    "http://purl.org/dc/elements/1.1/created": [
      {
        "@value": "2020-11-04T00:01:20Z",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    ],
    "http://purl.org/dc/elements/1.1/title": [
      {
        "@value": "Chat channel",
      },
    ],
    "http://www.w3.org/2005/01/wf/flow#participation": [
      {
        "@id":
          "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#id1604448082795",
      },
    ],
    "http://www.w3.org/ns/ui#sharedPreferences": [
      {
        "@id":
          "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#SharedPreferences",
      },
    ],
  },
  {
    "@id": "https://jackson.solidcommunity.net/profile/card#me",
  },
];
