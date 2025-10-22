export interface PersonhoodVerification {
  id: string;
  verifierId: string;
  verifierName: string;
  verifierAvatar?: string;
  verifierJobTitle?: string;
  verifiedAt: Date;
  location?: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  verificationMethod: 'qr_scan' | 'nfc_tap' | 'biometric' | 'manual';
  trustScore: number; // 0-100
  isReciprocal: boolean; // If the verifier also got verified by this person
  notes?: string;
  expiresAt?: Date;
  isActive: boolean;
}

export interface PersonhoodCredentials {
  userId: string;
  totalVerifications: number;
  uniqueVerifiers: number;
  reciprocalVerifications: number;
  averageTrustScore: number;
  credibilityScore: number; // Calculated score based on various factors
  verificationStreak: number; // Days since last verification
  lastVerificationAt?: Date;
  firstVerificationAt?: Date;
  verifications: PersonhoodVerification[];
  certificates: PersonhoodCertificate[];
  qrCode: string; // QR code data for verification
}

export interface PersonhoodCertificate {
  id: string;
  type: 'basic' | 'advanced' | 'premium' | 'community';
  name: string;
  description: string;
  requiredVerifications: number;
  issuedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  badgeUrl?: string;
}

export interface PersonhoodStats {
  verificationTrend: {
    period: string;
    count: number;
  }[];
  topLocations: {
    location: string;
    count: number;
  }[];
  verificationMethods: {
    method: string;
    count: number;
    percentage: number;
  }[];
  trustScoreDistribution: {
    range: string;
    count: number;
  }[];
}

export interface QRCodeSession {
  id: string;
  qrCode: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  scansCount: number;
  successfulVerifications: number;
}