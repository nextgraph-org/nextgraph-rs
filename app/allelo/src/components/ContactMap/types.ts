import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactMapProps {
  contactNuris: string[];
  onContactClick?: (contact: SocialContact) => void;
}

