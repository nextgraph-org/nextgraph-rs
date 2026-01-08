import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for notification
 * =============================================================================
 */

/**
 * UserNotification Type
 */
export interface UserNotification {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * User-visible notification in the app
   */
  type: LdSet<{
    "@id": "Notification";
  }>;
  /**
   * When the notification was created
   */
  date: string;
  /**
   * Optional notification body text
   */
  body?: string;
  /**
   * Type of the notification
   */
  type2:
    | {
        "@id": "Connection";
      }
    | {
        "@id": "System";
      }
    | {
        "@id": "Vouch";
      }
    | {
        "@id": "Praise";
      };
  /**
   * Workflow status of the notification
   */
  status?:
    | {
        "@id": "Accepted";
      }
    | {
        "@id": "Rejected";
      }
    | {
        "@id": "Pending";
      };
  /**
   * Whether the user has seen it
   */
  seen: boolean;
  /**
   * Whether the notification is hidden for user
   */
  hidden: boolean;
  /**
   * Optional IRI of the SocialContact (sender/subject)
   */
  subject?: {
    "@id": string;
  };
}
