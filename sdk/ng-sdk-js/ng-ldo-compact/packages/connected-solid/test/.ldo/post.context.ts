import { ContextDefinition } from "jsonld";

/**
 * =============================================================================
 * postContext: JSONLD Context for post
 * =============================================================================
 */
export const postContext: ContextDefinition = {
  type: {
    "@id": "@type",
  },
  SocialMediaPosting: "http://schema.org/SocialMediaPosting",
  CreativeWork: "http://schema.org/CreativeWork",
  Thing: "http://schema.org/Thing",
  articleBody: {
    "@id": "http://schema.org/articleBody",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  uploadDate: {
    "@id": "http://schema.org/uploadDate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  image: {
    "@id": "http://schema.org/image",
    "@type": "@id",
  },
  publisher: {
    "@id": "http://schema.org/publisher",
    "@type": "@id",
  },
};
