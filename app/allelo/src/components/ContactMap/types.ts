import type { Contact } from '@/types/contact';

export interface ContactMapProps {
  contactNuris: string[];
  onContactClick?: (contact: Contact) => void;
}

export interface MapControllerProps {
  contactNuris: string[];
}

