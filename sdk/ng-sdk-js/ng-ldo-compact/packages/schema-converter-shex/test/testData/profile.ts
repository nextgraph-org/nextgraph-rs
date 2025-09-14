import type { TestData } from "./testData.js";

/**
 * Profile
 */
export const profile: TestData = {
  name: "profile",
  shexc: `
PREFIX srs: <https://shaperepo.com/schemas/solidProfile#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schem: <http://schema.org/>
PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX acl: <http://www.w3.org/ns/auth/acl#>
PREFIX cert:  <http://www.w3.org/ns/auth/cert#>
PREFIX ldp: <http://www.w3.org/ns/ldp#>
PREFIX sp: <http://www.w3.org/ns/pim/space#>
PREFIX solid: <http://www.w3.org/ns/solid/terms#>

srs:SolidProfileShape EXTRA a {
  a [ schem:Person ]
    // rdfs:comment  "Defines the node as a Person (from Schema.org)" ;
  a [ foaf:Person ]
    // rdfs:comment  "Defines the node as a Person (from foaf)" ;
  vcard:fn xsd:string ?
    // rdfs:comment  "The formatted name of a person. Example: John Smith" ;
  foaf:name xsd:string ?
    // rdfs:comment  "An alternate way to define a person's name." ;
  vcard:hasAddress @srs:AddressShape *
    // rdfs:comment  "The person's street address." ;
  vcard:hasEmail @srs:EmailShape *
    // rdfs:comment  "The person's email." ;
  vcard:hasPhoto IRI ?
    // rdfs:comment  "A link to the person's photo" ;
  foaf:img xsd:string ?
    // rdfs:comment  "Photo link but in string form" ;
  vcard:hasTelephone @srs:PhoneNumberShape *
    // rdfs:comment  "Person's telephone number" ;
  vcard:phone xsd:string ?
    // rdfs:comment  "An alternative way to define a person's telephone number using a string" ;
  vcard:organization-name xsd:string ?
    // rdfs:comment  "The name of the organization with which the person is affiliated" ;
  vcard:role xsd:string ?
    // rdfs:comment  "The name of the person's role in their organization" ;
  acl:trustedApp @srs:TrustedAppShape *
    // rdfs:comment  "A list of app origins that are trusted by this user" ;
  cert:key @srs:RSAPublicKeyShape *
    // rdfs:comment  "A list of RSA public keys that are associated with private keys the user holds." ;
  ldp:inbox IRI
    // rdfs:comment  "The user's LDP inbox to which apps can post notifications" ;
  sp:preferencesFile IRI ?
    // rdfs:comment  "The user's preferences" ;
  sp:storage IRI *
    // rdfs:comment  "The location of a Solid storage server related to this WebId" ;
  solid:account IRI ?
    // rdfs:comment  "The user's account" ;
  solid:privateTypeIndex IRI *
    // rdfs:comment  "A registry of all types used on the user's Pod (for private access only)" ;
  solid:publicTypeIndex IRI *
    // rdfs:comment  "A registry of all types used on the user's Pod (for public access)" ;
  foaf:knows IRI *
    // rdfs:comment  "A list of WebIds for all the people this user knows." ;
}

srs:AddressShape {
  vcard:country-name xsd:string ?
    // rdfs:comment  "The name of the user's country of residence" ;
  vcard:locality xsd:string ?
    // rdfs:comment  "The name of the user's locality (City, Town etc.) of residence" ;
  vcard:postal-code xsd:string ?
    // rdfs:comment  "The user's postal code" ;
  vcard:region xsd:string ?
    // rdfs:comment  "The name of the user's region (State, Province etc.) of residence" ;
  vcard:street-address xsd:string ?
    // rdfs:comment  "The user's street address" ;
}

srs:EmailShape EXTRA a {
  a [
    vcard:Dom
    vcard:Home
    vcard:ISDN
    vcard:Internet
    vcard:Intl
    vcard:Label
    vcard:Parcel
    vcard:Postal
    vcard:Pref
    vcard:Work
    vcard:X400
  ] ?
    // rdfs:comment  "The type of email." ;
  vcard:value IRI
    // rdfs:comment  "The value of an email as a mailto link (Example <mailto:jane@example.com>)" ;
}

srs:PhoneNumberShape EXTRA a {
  a [
    vcard:Dom
    vcard:Home
    vcard:ISDN
    vcard:Internet
    vcard:Intl
    vcard:Label
    vcard:Parcel
    vcard:Postal
    vcard:Pref
    vcard:Work
    vcard:X400
  ] ?
    // rdfs:comment  "They type of Phone Number" ;
  vcard:value IRI
    // rdfs:comment  "The value of a phone number as a tel link (Example <tel:555-555-5555>)" ;
}

srs:TrustedAppShape {
  acl:mode [acl:Append acl:Control acl:Read acl:Write] +
    // rdfs:comment  "The level of access provided to this origin" ;
  acl:origin IRI
    // rdfs:comment "The app origin the user trusts"
}

srs:RSAPublicKeyShape {
  cert:modulus xsd:string
    // rdfs:comment  "RSA Modulus" ;
  cert:exponent xsd:integer
    // rdfs:comment  "RSA Exponent" ;
}
  `,
  sampleTurtle: `
    @base <https://jackson.solidcommunity.net/profile/card#me> .
    @prefix : <#>.
    @prefix acl: <http://www.w3.org/ns/auth/acl#>.
    @prefix cert: <http://www.w3.org/ns/auth/cert#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix ldp: <http://www.w3.org/ns/ldp#>.
    @prefix meeting: <http://www.w3.org/ns/pim/meeting#>.
    @prefix schema: <http://schema.org/>.
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix space: <http://www.w3.org/ns/pim/space#>.
    @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
    @prefix wf: <http://www.w3.org/2005/01/wf/flow#>.
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
    @prefix pub: <https://jackson.dev.inrupt.net/public/>.
    @prefix c: <https://jackson.dev.inrupt.net/profile/card#>.
    @prefix pro: <./>.
    @prefix inbox: </inbox/>.
    @prefix j: </>.
    @prefix c0: <https://kellyo.inrupt.net/profile/card#>.
    @prefix c1: <https://michielbdejong.inrupt.net/profile/card#>.
    @prefix c2: <https://mitzilaszlo.solid.community/profile/card#>.
    @prefix c3: <https://rowanjacobs.solid.community/profile/card#>.
    @prefix c4: <https://rubeniswc.inrupt.net/profile/card#>.
    @prefix c5: <https://solid.zwifi.eu/profile/card#>.
    @prefix c6: <https://timbl-2018-demo.solid.community/profile/card#>.
    @prefix c7: <https://timbl.solid.community/profile/card#>.
    @prefix pu: </public/>.
    @prefix c8: <https://otherjackson.solid.community/profile/card#>.
    @prefix publ: <https://michielbdejong.inrupt.net/public/>.
    @prefix loc: <http://localhost:3000/>.
    @prefix sol: <https://solidcommunity.net/>.
    @prefix n0: <https://>.
    @prefix n1: <file://>.
    
    pub:fd2af717 a meeting:LongChat; wf:participant c:me.
    
    pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.
    
    :id1538406374276 a vcard:Postal; vcard:value <mailto:jackson@o.team>.
    
    :id1538406392561 a vcard:Home; vcard:value <tel:6786999704>.
    
    :id1555189453000
        vcard:country-name "United States";
        vcard:locality "Alpharetta";
        vcard:postal-code "30022";
        vcard:region "GA";
        vcard:street-address "610 Varina Way".
    :me
        a schema:Person, foaf:Person;
        vcard:fn "Jackson Morgan";
        vcard:hasAddress :id1555189453000;
        vcard:hasEmail :id1538406374276;
        vcard:hasPhoto <_1564002423000_.jpeg>;
        vcard:hasTelephone :id1538406392561;
        vcard:organization-name "O";
        vcard:phone "6786999704";
        vcard:role "Software";
        acl:trustedApp
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin n1:
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://example.org>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:14001>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:19006>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:3001>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:3101>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:5000>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:9000>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <http://localhost:9080>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://api.chat.o.team>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://api.liqid.chat>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://devapi.liqid.chat>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://develop.generator.inrupt.com>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://jackson.localhost:8443>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://jackson2.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://liqidchat.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://localhost:8443>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://localhost:9000>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin n0:localhost
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://melvincarvalho.github.io>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://noeldemartin.github.io>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://podbrowser.inrupt.com>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://scenaristeur.github.io>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://solid.github.io>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://solidarity.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://timbl.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
                    acl:origin <https://uvdsl.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <http://edit.o.team>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <http://localhost:3000>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <http://localhost:8606>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://datasister.5apps.com>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://edit.o.team>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://jackson.dev.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://solidos.solid.community>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://team.inrupt.net>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://timbl.com>
                ],
                [
                    acl:mode acl:Append, acl:Read, acl:Write;
                    acl:origin <https://vinnl.github.io>
                ];
        cert:key
                [
                    a cert:RSAPublicKey;
                    cert:exponent 65537;
                    cert:modulus
                        "AB564BF3F36A712A6D17CE87EE49185D802DAF82313C925D51E82ED618200CFDF1542717F41A6D39C01726967A40A170547B050540A089B61A4143DBD4E360EBAC6F086F37A40CDAE61F33AE2181A187B3BE861D9ABF8A439532D0B4DAAB83686508CFB88627F77A8F0D117231521AE095334B28CAEC8FD2928C8A29CB15C38C27DA8B9426478BFB00CED71FB1904C9B0D27E2C4FF9F37882A917BD54957D4D9215E3625B8E195CCF2E8B18A528F9E4D1A19E525AF54CDB0804599DA9786D210AA04821977C7AF8F9C03BA1094F695A19F3C4B52DE9FC11ED14616559FC1DE0C610FBDC0F0DE5D817C417A4A5E6AC3FCD1C7B3F6B574BAFBD36E4B23164CE7D9"^^xsd:hexBinary
                ];
        ldp:inbox inbox:;
        space:preferencesFile </settings/prefs.ttl>;
        space:storage j:;
        solid:account j:;
        solid:oidcIssuer loc:, sol:;
        solid:oidcIssuerRegistrationToken "gx2hvELxRw5nYeBQMtdKm";
        solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
        solid:publicTypeIndex
        <publicTypeIndex.ttl>, </settings/publicTypeIndex.ttl>;
        foaf:img
        "https://jackson.solid.community/profile/JacksonProfile_1555190418000_.png";
        foaf:knows pro:card, c0:me, c1:me, c2:me, c3:me, c4:me, c5:me, c6:me, c7:me;
        foaf:name "Jackson".
    pu:d3149ef5 a meeting:LongChat; wf:participant c8:me.
    
    publ:ab34c8d2 a meeting:LongChat; wf:participant c1:me, c2:me.
  `,
  baseNode: "https://jackson.solidcommunity.net/profile/card#me",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Person: {
      "@id": "http://schema.org/Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        fn: {
          "@id": "http://www.w3.org/2006/vcard/ns#fn",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        name: {
          "@id": "http://xmlns.com/foaf/0.1/name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        hasAddress: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
          "@type": "@id",
          "@isCollection": true,
        },
        hasEmail: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
          "@type": "@id",
          "@isCollection": true,
        },
        hasPhoto: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
          "@type": "@id",
        },
        img: {
          "@id": "http://xmlns.com/foaf/0.1/img",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        hasTelephone: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
          "@type": "@id",
          "@isCollection": true,
        },
        phone: {
          "@id": "http://www.w3.org/2006/vcard/ns#phone",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        organizationName: {
          "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        role: {
          "@id": "http://www.w3.org/2006/vcard/ns#role",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        trustedApp: {
          "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
          "@type": "@id",
          "@isCollection": true,
        },
        key: {
          "@id": "http://www.w3.org/ns/auth/cert#key",
          "@type": "@id",
          "@isCollection": true,
        },
        inbox: {
          "@id": "http://www.w3.org/ns/ldp#inbox",
          "@type": "@id",
        },
        preferencesFile: {
          "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
          "@type": "@id",
        },
        storage: {
          "@id": "http://www.w3.org/ns/pim/space#storage",
          "@type": "@id",
          "@isCollection": true,
        },
        account: {
          "@id": "http://www.w3.org/ns/solid/terms#account",
          "@type": "@id",
        },
        privateTypeIndex: {
          "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
          "@type": "@id",
          "@isCollection": true,
        },
        publicTypeIndex: {
          "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
          "@type": "@id",
          "@isCollection": true,
        },
        knows: {
          "@id": "http://xmlns.com/foaf/0.1/knows",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Person2: {
      "@id": "http://xmlns.com/foaf/0.1/Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        fn: {
          "@id": "http://www.w3.org/2006/vcard/ns#fn",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        name: {
          "@id": "http://xmlns.com/foaf/0.1/name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        hasAddress: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
          "@type": "@id",
          "@isCollection": true,
        },
        hasEmail: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
          "@type": "@id",
          "@isCollection": true,
        },
        hasPhoto: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
          "@type": "@id",
        },
        img: {
          "@id": "http://xmlns.com/foaf/0.1/img",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        hasTelephone: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
          "@type": "@id",
          "@isCollection": true,
        },
        phone: {
          "@id": "http://www.w3.org/2006/vcard/ns#phone",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        organizationName: {
          "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        role: {
          "@id": "http://www.w3.org/2006/vcard/ns#role",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        trustedApp: {
          "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
          "@type": "@id",
          "@isCollection": true,
        },
        key: {
          "@id": "http://www.w3.org/ns/auth/cert#key",
          "@type": "@id",
          "@isCollection": true,
        },
        inbox: {
          "@id": "http://www.w3.org/ns/ldp#inbox",
          "@type": "@id",
        },
        preferencesFile: {
          "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
          "@type": "@id",
        },
        storage: {
          "@id": "http://www.w3.org/ns/pim/space#storage",
          "@type": "@id",
          "@isCollection": true,
        },
        account: {
          "@id": "http://www.w3.org/ns/solid/terms#account",
          "@type": "@id",
        },
        privateTypeIndex: {
          "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
          "@type": "@id",
          "@isCollection": true,
        },
        publicTypeIndex: {
          "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
          "@type": "@id",
          "@isCollection": true,
        },
        knows: {
          "@id": "http://xmlns.com/foaf/0.1/knows",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    fn: {
      "@id": "http://www.w3.org/2006/vcard/ns#fn",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    name: {
      "@id": "http://xmlns.com/foaf/0.1/name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    hasAddress: {
      "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
      "@type": "@id",
      "@isCollection": true,
    },
    countryName: {
      "@id": "http://www.w3.org/2006/vcard/ns#country-name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    locality: {
      "@id": "http://www.w3.org/2006/vcard/ns#locality",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    postalCode: {
      "@id": "http://www.w3.org/2006/vcard/ns#postal-code",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    region: {
      "@id": "http://www.w3.org/2006/vcard/ns#region",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    streetAddress: {
      "@id": "http://www.w3.org/2006/vcard/ns#street-address",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    hasEmail: {
      "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
      "@type": "@id",
      "@isCollection": true,
    },
    Dom: {
      "@id": "http://www.w3.org/2006/vcard/ns#Dom",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Home: {
      "@id": "http://www.w3.org/2006/vcard/ns#Home",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    ISDN: {
      "@id": "http://www.w3.org/2006/vcard/ns#ISDN",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Internet: {
      "@id": "http://www.w3.org/2006/vcard/ns#Internet",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Intl: {
      "@id": "http://www.w3.org/2006/vcard/ns#Intl",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Label: {
      "@id": "http://www.w3.org/2006/vcard/ns#Label",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Parcel: {
      "@id": "http://www.w3.org/2006/vcard/ns#Parcel",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Postal: {
      "@id": "http://www.w3.org/2006/vcard/ns#Postal",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Pref: {
      "@id": "http://www.w3.org/2006/vcard/ns#Pref",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Work: {
      "@id": "http://www.w3.org/2006/vcard/ns#Work",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    X400: {
      "@id": "http://www.w3.org/2006/vcard/ns#X400",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    value: {
      "@id": "http://www.w3.org/2006/vcard/ns#value",
      "@type": "@id",
    },
    hasPhoto: {
      "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
      "@type": "@id",
    },
    img: {
      "@id": "http://xmlns.com/foaf/0.1/img",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    hasTelephone: {
      "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
      "@type": "@id",
      "@isCollection": true,
    },
    phone: {
      "@id": "http://www.w3.org/2006/vcard/ns#phone",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    organizationName: {
      "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    role: {
      "@id": "http://www.w3.org/2006/vcard/ns#role",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    trustedApp: {
      "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
      "@type": "@id",
      "@isCollection": true,
    },
    mode: {
      "@id": "http://www.w3.org/ns/auth/acl#mode",
      "@isCollection": true,
    },
    Append: "http://www.w3.org/ns/auth/acl#Append",
    Control: "http://www.w3.org/ns/auth/acl#Control",
    Read: "http://www.w3.org/ns/auth/acl#Read",
    Write: "http://www.w3.org/ns/auth/acl#Write",
    origin: {
      "@id": "http://www.w3.org/ns/auth/acl#origin",
      "@type": "@id",
    },
    key: {
      "@id": "http://www.w3.org/ns/auth/cert#key",
      "@type": "@id",
      "@isCollection": true,
    },
    modulus: {
      "@id": "http://www.w3.org/ns/auth/cert#modulus",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    exponent: {
      "@id": "http://www.w3.org/ns/auth/cert#exponent",
      "@type": "http://www.w3.org/2001/XMLSchema#integer",
    },
    inbox: {
      "@id": "http://www.w3.org/ns/ldp#inbox",
      "@type": "@id",
    },
    preferencesFile: {
      "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
      "@type": "@id",
    },
    storage: {
      "@id": "http://www.w3.org/ns/pim/space#storage",
      "@type": "@id",
      "@isCollection": true,
    },
    account: {
      "@id": "http://www.w3.org/ns/solid/terms#account",
      "@type": "@id",
    },
    privateTypeIndex: {
      "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
      "@type": "@id",
      "@isCollection": true,
    },
    publicTypeIndex: {
      "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
      "@type": "@id",
      "@isCollection": true,
    },
    knows: {
      "@id": "http://xmlns.com/foaf/0.1/knows",
      "@type": "@id",
      "@isCollection": true,
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface SolidProfile {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Defines the node as a Person (from Schema.org) | Defines the node as a Person (from foaf)\n     */\n    type: LdSet<{\n        "@id": "Person";\n    } | {\n        "@id": "Person2";\n    }>;\n    /**\n     * The formatted name of a person. Example: John Smith\n     */\n    fn?: string;\n    /**\n     * An alternate way to define a person\'s name.\n     */\n    name?: string;\n    /**\n     * The person\'s street address.\n     */\n    hasAddress?: LdSet<Address>;\n    /**\n     * The person\'s email.\n     */\n    hasEmail?: LdSet<Email>;\n    /**\n     * A link to the person\'s photo\n     */\n    hasPhoto?: {\n        "@id": string;\n    };\n    /**\n     * Photo link but in string form\n     */\n    img?: string;\n    /**\n     * Person\'s telephone number\n     */\n    hasTelephone?: LdSet<PhoneNumber>;\n    /**\n     * An alternative way to define a person\'s telephone number using a string\n     */\n    phone?: string;\n    /**\n     * The name of the organization with which the person is affiliated\n     */\n    organizationName?: string;\n    /**\n     * The name of the person\'s role in their organization\n     */\n    role?: string;\n    /**\n     * A list of app origins that are trusted by this user\n     */\n    trustedApp?: LdSet<TrustedApp>;\n    /**\n     * A list of RSA public keys that are associated with private keys the user holds.\n     */\n    key?: LdSet<RSAPublicKey>;\n    /**\n     * The user\'s LDP inbox to which apps can post notifications\n     */\n    inbox: {\n        "@id": string;\n    };\n    /**\n     * The user\'s preferences\n     */\n    preferencesFile?: {\n        "@id": string;\n    };\n    /**\n     * The location of a Solid storage server related to this WebId\n     */\n    storage?: LdSet<{\n        "@id": string;\n    }>;\n    /**\n     * The user\'s account\n     */\n    account?: {\n        "@id": string;\n    };\n    /**\n     * A registry of all types used on the user\'s Pod (for private access only)\n     */\n    privateTypeIndex?: LdSet<{\n        "@id": string;\n    }>;\n    /**\n     * A registry of all types used on the user\'s Pod (for public access)\n     */\n    publicTypeIndex?: LdSet<{\n        "@id": string;\n    }>;\n    /**\n     * A list of WebIds for all the people this user knows.\n     */\n    knows?: LdSet<{\n        "@id": string;\n    }>;\n}\n\nexport interface Address {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * The name of the user\'s country of residence\n     */\n    countryName?: string;\n    /**\n     * The name of the user\'s locality (City, Town etc.) of residence\n     */\n    locality?: string;\n    /**\n     * The user\'s postal code\n     */\n    postalCode?: string;\n    /**\n     * The name of the user\'s region (State, Province etc.) of residence\n     */\n    region?: string;\n    /**\n     * The user\'s street address\n     */\n    streetAddress?: string;\n}\n\nexport interface Email {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * The type of email.\n     */\n    type?: LdSet<{\n        "@id": "Dom";\n    } | {\n        "@id": "Home";\n    } | {\n        "@id": "ISDN";\n    } | {\n        "@id": "Internet";\n    } | {\n        "@id": "Intl";\n    } | {\n        "@id": "Label";\n    } | {\n        "@id": "Parcel";\n    } | {\n        "@id": "Postal";\n    } | {\n        "@id": "Pref";\n    } | {\n        "@id": "Work";\n    } | {\n        "@id": "X400";\n    }>;\n    /**\n     * The value of an email as a mailto link (Example <mailto:jane@example.com>)\n     */\n    value: {\n        "@id": string;\n    };\n}\n\nexport interface PhoneNumber {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * They type of Phone Number\n     */\n    type?: LdSet<{\n        "@id": "Dom";\n    } | {\n        "@id": "Home";\n    } | {\n        "@id": "ISDN";\n    } | {\n        "@id": "Internet";\n    } | {\n        "@id": "Intl";\n    } | {\n        "@id": "Label";\n    } | {\n        "@id": "Parcel";\n    } | {\n        "@id": "Postal";\n    } | {\n        "@id": "Pref";\n    } | {\n        "@id": "Work";\n    } | {\n        "@id": "X400";\n    }>;\n    /**\n     * The value of a phone number as a tel link (Example <tel:555-555-5555>)\n     */\n    value: {\n        "@id": string;\n    };\n}\n\nexport interface TrustedApp {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * The level of access provided to this origin\n     */\n    mode: LdSet<{\n        "@id": "Append";\n    } | {\n        "@id": "Control";\n    } | {\n        "@id": "Read";\n    } | {\n        "@id": "Write";\n    }>;\n    /**\n     * The app origin the user trusts\n     */\n    origin: {\n        "@id": string;\n    };\n}\n\nexport interface RSAPublicKey {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * RSA Modulus\n     */\n    modulus: string;\n    /**\n     * RSA Exponent\n     */\n    exponent: number;\n}\n\n',
};
