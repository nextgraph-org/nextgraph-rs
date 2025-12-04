import { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for settings
 * =============================================================================
 */

/**
 * AppSettings Type
 */
export interface AppSettings {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  /**
   * Defines the node as App Settings
   */
  type: LdSet<{
    "@id": "Settings";
  }>;
  /**
   * Current onboarding step (0-based index)
   */
  onboardingStep?: number;
  /**
   * Whether the user has completed onboarding
   */
  isOnboardingFinished?: boolean;
  /**
   * Whether LinkedIn import has been requested
   */
  lnImportRequested?: boolean;
  /**
   * Whether LinkedIn import has been finished
   */
  lnImportFinished?: boolean;
  /**
   * id from greencheck
   */
  greencheckId?: string;
  /**
   * temporary token from greencheck
   */
  greencheckToken?: string;
}
