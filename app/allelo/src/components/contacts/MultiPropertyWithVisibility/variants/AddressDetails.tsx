import {Box, Collapse} from '@mui/material';
import {PropertyWithSources} from "@/components/contacts/PropertyWithSources";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

interface AddressDetailsProps {
  showAddressDetails: boolean;
  contact?: SocialContact;
  isEditing: boolean;
  currentItem: Record<string, string>;
}

export const AddressDetails = ({
                                 showAddressDetails,
                                 contact,
                                 isEditing,
                                 currentItem,
                               }: AddressDetailsProps) => {
  return (
    <Collapse in={showAddressDetails}>
      <Box sx={{mt: 1, ml: 3}}>
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"country"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"Country"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"region"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"Region"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"city"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"City"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"streetAddress"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"Street"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"extendedAddress"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"Extended address"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
        <PropertyWithSources
          // @ts-expect-error this is expected
          propertyKey={"address"}
          subKey={"postalCode"}
          textVariant={"body1"}
          contact={contact}
          isEditing={isEditing}
          label={"Postal Code"}
          currentItem={currentItem}
          hideSources={true}
          isMultipleField={true}
        />
      </Box>
    </Collapse>
  );
};