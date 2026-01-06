export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for settings
 * =============================================================================
 */

/**
 * AppSettings Type
 */
export interface AppSettings {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Defines the node as App Settings
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:x:settings#Settings" | (IRI & {})>;
  /**
   * Current onboarding step (0-based index)
   *
   * Original IRI: did:ng:x:settings#onboardingStep
   */
  onboardingStep?: number;
  /**
   * Whether the user has completed onboarding
   *
   * Original IRI: did:ng:x:settings#isOnboardingFinished
   */
  isOnboardingFinished?: boolean;
  /**
   * Whether LinkedIn import has been requested
   *
   * Original IRI: did:ng:x:settings#lnImportRequested
   */
  lnImportRequested?: boolean;
  /**
   * Whether LinkedIn import has been finished
   *
   * Original IRI: did:ng:x:settings#lnImportFinished
   */
  lnImportFinished?: boolean;
  /**
   * id from greencheck
   *
   * Original IRI: did:ng:x:settings#greencheckId
   */
  greencheckId?: string;
  /**
   * temporary token from greencheck
   *
   * Original IRI: did:ng:x:settings#greencheckToken
   */
  greencheckToken?: string;
}
