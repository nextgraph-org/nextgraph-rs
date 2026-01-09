import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";

export interface ContactMapProps {
  contacts: ShortSocialContact[];
  onContactClick?: (contact: SocialContact) => void;
}

