// Core GreenCheck Identity
export interface GreenCheckId {
  greenCheckId: string;
  created: string; // ISO datetime
  lastAccess: string; // ISO datetime
  numAccesses: number;
  username?: string;
}

// Common base for all claims
export interface BaseClaim {
  _id: string;
  greenCheckId: string;
  numClaims: number;
  created: string;      // ISO datetime
  updated: string;      // ISO datetime
  firstClaim?: string;  // ISO datetime
}

// Providers split the way you asked
export type AccountProvider =
  | "mastodon"
  | "telegram"
  | "google"
  | "discord"
  | "twitter"
  | "linkedin"
  | "github" | string;

export type SpecialProvider = "phone" | "email";
export type Provider = AccountProvider | SpecialProvider;

/**
 * One common shape for online accounts.
 * All fields are optional because different providers expose different bits.
 * Use the `provider` field to know what to expect at runtime.
 */
export interface AccountClaim extends BaseClaim {
  provider: AccountProvider;
  claimData: {
    id?: string | number;
    username?: string;
    fullname?: string;

    // Profile media
    avatar?: string;
    image?: string;

    // Links
    url?: string;

    // Bio/meta
    description?: string;
    about?: string;

    // Names and location
    given_name?: string;
    family_name?: string;
    location?: string | null;

    // Provider-specific crumbs
    server?: string;     // mastodon
  };
}

export interface PhoneClaim extends BaseClaim {
  provider: "phone";
  claimData: {
    username: string; // canonical E.164 (+12025550173)
    id: string;       // sms:canonical
    fullname?: string;
  };
}

export interface EmailClaim extends BaseClaim {
  provider: "email";
  claimData: {
    username: string; // email address
    id: string;       // email address
    fullname?: string;
  };
}

export type GreenCheckClaim = AccountClaim | PhoneClaim | EmailClaim;

// API Response types
export interface PhoneClaimStartResponse {
  success: boolean;
  error?: string;
}

export interface PhoneClaimValidateResponse {
  success: boolean;
  authToken?: string;
  greenCheck?: GreenCheckId;
  error?: string;
}

export interface ClaimsResponse {
  claims: GreenCheckClaim[];
}

// Authentication session
export interface AuthSession {
  authToken: string;
  greenCheckId: string;
  expiresAt?: Date;
}

// Client configuration
export interface GreenCheckClientConfig {
  serverUrl?: string;
  authToken: string;
  timeout?: number;
}

// Error classes
export class GreenCheckError extends Error {
  public code?: string;
  public statusCode?: number;
  
  constructor(
    message: string,
    code?: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'GreenCheckError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends GreenCheckError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends GreenCheckError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// Cross-platform HTTP client
export interface RequestOptions {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export const isPhoneClaim = (c: GreenCheckClaim): c is PhoneClaim => c.provider === "phone";
export const isEmailClaim = (c: GreenCheckClaim): c is EmailClaim => c.provider === "email";
export const isAccountClaim = (c: GreenCheckClaim): c is AccountClaim =>
  c.provider !== "phone" && c.provider !== "email";