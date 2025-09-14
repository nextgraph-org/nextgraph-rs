import { ContextDefinition } from "jsonld";

/**
 * =============================================================================
 * Typescript Typings for post
 * =============================================================================
 */

/**
 * PostSh Type
 */
export interface PostSh {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type:
    | {
        "@id": "SocialMediaPosting";
      }
    | {
        "@id": "CreativeWork";
      }
    | {
        "@id": "Thing";
      };
  /**
   * The actual body of the article.
   */
  articleBody?: string;
  /**
   * Date when this media object was uploaded to this site.
   */
  uploadDate: string;
  /**
   * A media object that encodes this CreativeWork. This property is a synonym for encoding.
   */
  image?: {
    "@id": string;
  };
  /**
   * The publisher of the creative work.
   */
  publisher: {
    "@id": string;
  };
}
