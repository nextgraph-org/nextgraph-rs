import {BasicLdSet} from "@/lib/ldo/BasicLdSet";
import {Contact} from "@/types/contact";

export interface RawContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source: string;
  profileImage?: string;
  linkedinUrl?: string;
  notes?: string;
  tags?: string[];
  naoStatus: string;
  relationshipCategory?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    distance?: number;
  };
  lastInteractionAt?: string;
  humanityConfidenceScore?: number;
  joinedAt?: string;
  invitedAt?: string;
  groupIds?: string[];
  createdAt: string;
  updatedAt: string;
  vouchesSent?: number;
  vouchesReceived?: number;
  praisesReceived?: number;
  praisesSent?: number;
  interactionCount?: number;
  recentInteractionScore?: number;
  sharedTagsCount?: number;
}
// Transform raw JSON contact to new Contact structure (extends SocialContact)
export function transformRawContact(rawContact: RawContact): Contact {
  const urls = rawContact.linkedinUrl ? [rawContact.linkedinUrl] : undefined;
  return {
    type: new BasicLdSet([{"@id": "Individual"}]),
    name: rawContact.name ? new BasicLdSet([{
      value: rawContact.name,
      source: 'contacts'
    }]) : undefined,
    email: rawContact.email ? new BasicLdSet([{
      value: rawContact.email,
      source: 'contacts'
    }]) : undefined,
    phoneNumber: rawContact.phone ? new BasicLdSet([{
      value: rawContact.phone,
      source: 'contacts'
    }]) : undefined,
    organization: (rawContact.company || rawContact.position) ? new BasicLdSet([{
      value: rawContact.company || '',
      position: rawContact.position,
      source: 'contacts'
    }]) : undefined,
/*    photo: rawContact.profileImage ? new BasicLdSet([{
      value: rawContact.profileImage,
      source: 'contacts'
    }]) : undefined,*/
    address: rawContact.location ? new BasicLdSet([{
      locality: rawContact.location.city,
      region: rawContact.location.state,
      country: rawContact.location.country,
      coordLat: rawContact.location.coordinates?.lat,
      coordLng: rawContact.location.coordinates?.lng,
      source: 'contacts'
    }]) : undefined,
    // Transform naoStatus to proper structure
    naoStatus: rawContact.naoStatus,
    // Keep Contact-specific properties
    humanityConfidenceScore: rawContact.humanityConfidenceScore || 0,
    vouchesSent: rawContact.vouchesSent || 0,
    vouchesReceived: rawContact.vouchesReceived || 0,
    praisesSent: rawContact.praisesReceived || 0,
    praisesReceived: rawContact.praisesReceived || 0,
    lastInteractionAt: rawContact.lastInteractionAt ? new Date(rawContact.lastInteractionAt) : undefined,
    interactionCount: rawContact.interactionCount || 0,
    recentInteractionScore: rawContact.recentInteractionScore || 0,
    sharedTagsCount: rawContact.sharedTagsCount || 0,
    /*internalGroup: rawContact.groupIds ? new BasicLdSet(rawContact.groupIds.map((groupId) => ({
      groupId: groupId,
      source: 'contacts'
    }))) : undefined,*/
    // Transform dates
    createdAt: rawContact.createdAt ? {
      valueDateTime: rawContact.createdAt
    } : undefined,
    updatedAt: rawContact.updatedAt ? {
      valueDateTime: rawContact.updatedAt
    } : undefined,
    joinedAt: rawContact.joinedAt ? {
      valueDateTime: rawContact.joinedAt
    } : undefined,
    invitedAt: rawContact.invitedAt ? {
      valueDateTime: rawContact.invitedAt
    } : undefined,
    url: urls ? new BasicLdSet(urls.map((el) => ({
      value: el,
      type2: {
        "@id": "linkedin"
      }
    }))) : undefined
  };
}