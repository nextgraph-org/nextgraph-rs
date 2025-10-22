export interface InviteFormData {
  inviteeName: string;
  inviteeEmail: string;
  profileCardType: string;
  profileCardData: {
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  relationshipType?: string;
  relationshipData?: {
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  inviterName: string;
}

export interface InviteFormState {
  inviteeName?: string;
  inviteeEmail?: string;
  profileCardType?: string;
  relationshipType?: string;
  inviterName?: string;
}