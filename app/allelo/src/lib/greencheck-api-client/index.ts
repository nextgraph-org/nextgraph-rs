import {
  GreenCheckId,
  GreenCheckClientConfig,
  PhoneClaimStartResponse,
  PhoneClaimValidateResponse,
  GreenCheckClaim,
  ClaimsResponse,
  GreenCheckError,
  AuthSession,
  AuthenticationError,
  ValidationError,
  RequestOptions, IGreenCheckClient, CentralityResponse
} from "./types"

// Cross-platform fetch implementation
function getGlobalFetch(): typeof fetch {
  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    return globalThis.fetch.bind(globalThis);
  }
  if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch.bind(window);
  }
  if (typeof global !== 'undefined' && (global as Record<string, unknown>).fetch) {
    return ((global as Record<string, unknown>).fetch as typeof fetch).bind(global);
  }
  // For Node.js environments without fetch polyfill - use dynamic import
  let nodeFetch: typeof fetch;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodeFetch = require('node-fetch');
    return nodeFetch;
  } catch {
    throw new Error('No fetch implementation found. Please install node-fetch for Node.js environments.');
  }
}

// Cross-platform AbortSignal timeout
function createTimeoutSignal(timeout: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    return AbortSignal.timeout(timeout);
  }
  
  // Fallback for environments without AbortSignal.timeout
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}

export class GreenCheckClient implements IGreenCheckClient {
  private config: Required<GreenCheckClientConfig>;
  private fetch: typeof fetch;
  private authToken?: string;

  constructor(config: GreenCheckClientConfig) {
    this.config = {
      serverUrl: 'https://greencheck.world',
      timeout: 30000,
      ...config
    };
    this.fetch = getGlobalFetch();
  }

  setCurrentAuthToken(authToken: string): void {
    this.authToken = authToken;
  }

  private formatPhone(phone: string): string | null {
    let digits = phone.replace(/[^+\d]/g, '');

    // Add country code if not present
    if (!digits.startsWith('+')) {
      digits = `+1${digits}`;
    }

    // Validate format (11+ digits with country code)
    if (!/^\+\d{11,}$/.test(digits)) {
      return null;
    }

    return digits;
  }

  private async makeRequest<T>(options: RequestOptions): Promise<T> {
    const url = `${this.config.serverUrl}${options.endpoint}`;

    const headers = {
      'Authorization': this.config.authToken,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      signal: createTimeoutSignal(this.config.timeout)
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await this.fetch(url, fetchOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GreenCheckError(
        error.message || `HTTP ${response.status}: ${response.statusText}`,
        error.code,
        response.status
      );
    }

    return await response.json();
  }

  async requestPhoneVerification(phone: string): Promise<boolean> {
    const formattedPhone = this.formatPhone(phone);

    if (!formattedPhone) {
      throw new ValidationError('Invalid phone number format. US/Canada numbers only.');
    }

    const response = await this.makeRequest<PhoneClaimStartResponse>({
      endpoint: '/api/gc-mobile/start-phone-claim',
      method: 'POST',
      body: { phone: formattedPhone }
    });

    return response.success;
  }

  async verifyPhoneCode(phone: string, code: string): Promise<AuthSession> {
    const formattedPhone = this.formatPhone(phone);

    if (!formattedPhone) {
      throw new ValidationError('Invalid phone number format.');
    }

    const response = await this.makeRequest<PhoneClaimValidateResponse>({
      endpoint: '/api/gc-mobile/validate-phone-code',
      method: 'POST',
      body: { phone: formattedPhone, code }
    });

    if (!response.success || !response.authToken || !response.greenCheck) {
      throw new AuthenticationError(response.error || 'Phone verification failed');
    }

    return {
      authToken: response.authToken,
      greenCheckId: response.greenCheck.greenCheckId
    };
  }

  async getGreenCheckIdFromToken(authToken: string | undefined): Promise<string> {
    authToken ??= this.authToken;
    const response = await this.makeRequest<{ greenCheck: GreenCheckId }>({
      endpoint: `/api/gc-mobile/id-for-token?token=${authToken}`,
      method: 'GET'
    });

    if (!response.greenCheck) {
      throw new AuthenticationError('No GreenCheck ID found for the provided token');
    }

    return response.greenCheck.greenCheckId;
  }

  async getClaims(authToken: string): Promise<GreenCheckClaim[]> {
    const greenCheckId = await this.getGreenCheckIdFromToken(authToken);

    const response = await this.makeRequest<ClaimsResponse>({
      endpoint: `/api/gc-mobile/claims-for-id?gcId=${greenCheckId}&token=${authToken}`,
      method: 'GET'
    });

    return response.claims || [];
  }

  async generateOTT(authToken: string): Promise<string> {
    const response = await this.makeRequest<{ ott: string }>({
      endpoint: '/api/gc-mobile/register-ott',
      method: 'POST',
      body: { token: authToken }
    });

    return response.ott;
  }

  async generateCentrality(authToken: string | undefined, linkedInContacts: string[]): Promise<CentralityResponse> {
    authToken ??= this.authToken;
    const greenCheckId = await this.getGreenCheckIdFromToken(authToken);
    return this.makeRequest<CentralityResponse>({
      endpoint: `/api/gc-mobile/generate-centrality/?token=${authToken}&gcId=${greenCheckId}`,
      method: 'POST',
      body: { linkedInContacts }
    });
  }
}

// Default export
export default GreenCheckClient;