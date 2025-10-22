import {forwardRef} from 'react';
import {
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  Email,
  Phone,
  Business,
  AccountBox,
} from '@mui/icons-material';
import type {Contact} from '@/types/contact';
import {MultiPropertyWithVisibility} from '../MultiPropertyWithVisibility';
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";

export interface ContactInfoProps {
  contact: Contact | null;
  isEditing?: boolean;
}

export const ContactInfo = forwardRef<HTMLDivElement, ContactInfoProps>(
  ({contact, isEditing}, ref) => {
    if (!contact) return null;

    return (
      <Card variant="outlined" ref={ref}>
        <CardContent sx={{p: {xs: 2, md: 3}}}>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>

          <MultiPropertyWithVisibility
            label="Email Addresses"
            icon={<Email/>}
            contact={contact}
            propertyKey="email"
            isEditing={isEditing}
            placeholder={"Email"}
            validateType={"email"}
          />

          <MultiPropertyWithVisibility
            label="Phone Numbers"
            icon={<Phone/>}
            contact={contact}
            propertyKey="phoneNumber"
            isEditing={isEditing}
            placeholder={"Phone number"}
            validateType={"phone"}
          />

          <PropertyWithSources
            label="Company"
            icon={<Business/>}
            contact={contact}
            propertyKey="organization"
            isEditing={isEditing}
            placeholder={"Company"}
          />

          <MultiPropertyWithVisibility
            label="Accounts"
            icon={<AccountBox/>}
            contact={contact}
            propertyKey="account"
            isEditing={isEditing}
            placeholder={"Account"}
            variant={"accounts"}
            hideIcon={true}
            hideLabel={true}
            hasPreferred={false}
          />
        </CardContent>
      </Card>
    );
  }
);

ContactInfo.displayName = 'ContactInfo';