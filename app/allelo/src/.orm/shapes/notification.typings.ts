export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for notification
 * =============================================================================
 */

/**
 * UserNotification Type
 */
export interface UserNotification {
  readonly "@graph": IRI;
  readonly "@id": IRI;
  /**
   * User-visible notification in the app
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:x:social:notification#Notification";
  /**
   * When the notification was created
   *
   * Original IRI: did:ng:x:social:notification#date
   */
  date: string;
  /**
   * Optional notification body text
   *
   * Original IRI: did:ng:x:social:notification#body
   */
  body?: string;
  /**
   * Type of the notification
   *
   * Original IRI: did:ng:x:social:notification#type
   */
  type:
    | "did:ng:x:social:notification:type#Connection"
    | "did:ng:x:social:notification:type#System"
    | "did:ng:x:social:notification:type#Vouch"
    | "did:ng:x:social:notification:type#Praise";
  /**
   * Workflow status of the notification
   *
   * Original IRI: did:ng:x:social:notification#status
   */
  status?:
    | "did:ng:x:social:notification:status#Accepted"
    | "did:ng:x:social:notification:status#Rejected"
    | "did:ng:x:social:notification:status#Pending";
  /**
   * Whether the user has seen it
   *
   * Original IRI: did:ng:x:social:notification#seen
   */
  seen: boolean;
  /**
   * Whether the notification is hidden for user
   *
   * Original IRI: did:ng:x:core#hidden
   */
  hidden: boolean;
  /**
   * Optional IRI of the SocialContact (sender/subject)
   *
   * Original IRI: did:ng:x:social:notification#subject
   */
  subject?: IRI;
}
