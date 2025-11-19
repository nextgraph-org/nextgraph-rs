import type { RCardWithPrivacy } from '@/types/notification';
import type { PersonhoodCredentials } from '@/types/personhood';
import {Contact} from "@/types/contact.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ProfileSectionProps {
  personhoodCredentials?: PersonhoodCredentials;
  onGenerateQR?: () => void;
  onRefreshCredentials?: () => void;
  initialProfileData?: Contact;
  resource: NextGraphResource;
  ormProfile: SocialContact | undefined;
}

export interface SettingsSectionProps {
  rCards: RCardWithPrivacy[];
  selectedRCard: RCardWithPrivacy | null;
  onRCardSelect: (rCard: RCardWithPrivacy) => void;
  onCreateRCard: () => void;
  onEditRCard: (rCard: RCardWithPrivacy) => void;
  onDeleteRCard: (rCard: RCardWithPrivacy) => void;
  onUpdate: (updatedRCard: RCardWithPrivacy) => void;
  initialProfileData?: Contact;
}

export interface AccountPageProps {
  profileData?: Contact;
  handleLogout?: () => Promise<void>;
  isNextGraph: boolean;
  resource: NextGraphResource
  ormProfile?: SocialContact | undefined;
}

export interface CustomSocialLink {
  id: string;
  platform: string;
  username: string;
}