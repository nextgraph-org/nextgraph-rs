import {
  GreenCheckClaim,
  PhoneClaim,
  EmailClaim,
  AccountClaim,
  GreenCheckId,
  AuthSession,
  IGreenCheckClient
} from '@/lib/greencheck-api-client/types';

// Mock GreenCheck ID
export const mockGreenCheckId: GreenCheckId = {
  greenCheckId: 'mock-gc-id-123',
  created: '2024-01-15T10:30:00Z',
  lastAccess: '2024-08-15T12:00:00Z',
  numAccesses: 42,
  username: 'mock-user'
};

// Mock Auth Session
export const mockAuthSession: AuthSession = {
  authToken: 'mock-auth-token-xyz789',
  greenCheckId: mockGreenCheckId.greenCheckId,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
};

// Mock Phone Claim
export const mockPhoneClaim: PhoneClaim = {
  _id: 'claim-phone-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-01-15T10:30:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-01-15T10:30:00Z',
  provider: 'phone',
  claimData: {
    username: '+12025550173',
    id: 'sms:+12025550173',
    fullname: 'John Doe'
  }
};

// Mock Email Claim
export const mockEmailClaim: EmailClaim = {
  _id: 'claim-email-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-02-01T14:20:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-02-01T14:20:00Z',
  provider: 'email',
  claimData: {
    username: 'john.doe@example.com',
    id: 'john.doe@example.com',
    fullname: 'John Doe'
  }
};

// Mock Account Claims
export const mockTwitterClaim: AccountClaim = {
  _id: 'claim-twitter-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-03-10T09:15:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-03-10T09:15:00Z',
  provider: 'twitter',
  claimData: {
    id: '12345678',
    username: '@johndoe',
    fullname: 'John Doe',
    avatar: 'https://pbs.twimg.com/profile_images/example/avatar.jpg',
    description: 'Software developer, coffee enthusiast, and dog lover',
    url: 'https://twitter.com/johndoe',
    location: 'San Francisco, CA'
  }
};

export const mockGithubClaim: AccountClaim = {
  _id: 'claim-github-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-04-05T16:45:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-04-05T16:45:00Z',
  provider: 'github',
  claimData: {
    id: 'johndoe',
    username: 'johndoe',
    fullname: 'John Doe',
    avatar: 'https://avatars.githubusercontent.com/u/12345678?v=4',
    description: 'Full-stack developer working on open source projects',
    url: 'https://github.com/johndoe',
    location: 'San Francisco, CA'
  }
};

export const mockLinkedInClaim: AccountClaim = {
  _id: 'claim-linkedin-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-05-12T11:30:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-05-12T11:30:00Z',
  provider: 'linkedin',
  claimData: {
    id: 'johndoe123',
    username: 'johndoe',
    fullname: 'John Doe',
    avatar: 'https://media.licdn.com/dms/image/example/profile-displayphoto.jpg',
    description: 'Senior Software Engineer at TechCorp',
    url: 'https://linkedin.com/in/johndoe',
    location: 'San Francisco Bay Area'
  }
};

export const mockMastodonClaim: AccountClaim = {
  _id: 'claim-mastodon-001',
  greenCheckId: mockGreenCheckId.greenCheckId,
  numClaims: 1,
  created: '2024-06-18T13:22:00Z',
  updated: '2024-08-15T12:00:00Z',
  firstClaim: '2024-06-18T13:22:00Z',
  provider: 'mastodon',
  claimData: {
    id: 'johndoe@mastodon.social',
    username: '@johndoe@mastodon.social',
    fullname: 'John Doe',
    avatar: 'https://files.mastodon.social/accounts/avatars/example/avatar.png',
    description: 'Decentralized web advocate and developer',
    url: 'https://mastodon.social/@johndoe',
    server: 'mastodon.social'
  }
};

// Combined mock claims array
export const mockClaims: GreenCheckClaim[] = [
  mockPhoneClaim,
  mockEmailClaim,
  mockTwitterClaim,
  mockGithubClaim,
  mockLinkedInClaim,
  mockMastodonClaim
];

// Mock API functions for when NextGraph is disabled
export const mockGreenCheckAPI: IGreenCheckClient = {
  async requestPhoneVerification(): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return true;
  },

  async verifyPhoneCode(_phoneNumber: string, code: string): Promise<AuthSession> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock verification logic
    if (code !== '123456') {
      throw new Error('Invalid verification code');
    }

    return mockAuthSession;
  },

  async getClaims(authToken: string): Promise<GreenCheckClaim[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!authToken) {
      throw new Error('Authentication required');
    }

    return mockClaims;
  },

  async getGreenCheckIdFromToken(authToken: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!authToken) {
      throw new Error('Authentication required');
    }

    return 'mock-gc-id-123';
  },
  generateOTT(authToken: string): Promise<string> {
    return Promise.resolve(authToken);
  }
};