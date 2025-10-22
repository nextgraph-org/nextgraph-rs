import type { Contact } from '@/types/contact';

export interface ContactMapProps {
  contactNuris: string[];
  onContactClick?: (contact: Contact) => void;
}

export interface MapControllerProps {
  contactNuris: string[];
}

export interface ContactMarkerProps {
  nuri: string;
  onContactClick?: (contact: Contact) => void;
}

export interface ContactPopupProps {
  contact: Contact;
  onContactClick?: (contact: Contact) => void;
}