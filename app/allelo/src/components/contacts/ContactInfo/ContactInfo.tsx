import {forwardRef} from 'react';
import {
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  UilEnvelope as Email,
  UilPhone as Phone,
  UilBriefcase as Business,
  UilUserSquare as AccountBox,
} from '@iconscout/react-unicons';
import type {Contact} from '@/types/contact';
import {MultiPropertyWithVisibility} from '../MultiPropertyWithVisibility';
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";
import {NextGraphResource} from "@ldo/connected-nextgraph";

export interface ContactInfoProps {
  contact: Contact | null;
  isEditing?: boolean;
  resource?: NextGraphResource;
}

export const ContactInfo = forwardRef<HTMLDivElement, ContactInfoProps>(
  ({contact, resource, isEditing}, ref) => {
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
            resource={resource}
          />

          <MultiPropertyWithVisibility
            label="Phone Numbers"
            icon={<Phone/>}
            contact={contact}
            propertyKey="phoneNumber"
            isEditing={isEditing}
            placeholder={"Phone number"}
            validateType={"phone"}
            resource={resource}
            required={false}
          />

          <PropertyWithSources
            label="Company"
            icon={<Business/>}
            contact={contact}
            propertyKey="organization"
            isEditing={isEditing}
            placeholder={"Company"}
            resource={resource}
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
            resource={resource}
          />
        </CardContent>
      </Card>
    );
  }
);

ContactInfo.displayName = 'ContactInfo';