import {Marker, Popup} from 'react-leaflet';
import {createCustomIcon} from './mapUtils';
import {ContactPopup} from './ContactPopup';
import {resolveContactPhoto, resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";
import {usePhotoOrm} from "@/hooks/usePhotoOrm.ts";

export interface ContactMarkerProps {
  contact: ShortSocialContact;
  onContactClick?: (contact: SocialContact) => void;
}

export const ContactMarker = ({contact, onContactClick}: ContactMarkerProps) => {

  const address = resolveFrom(contact, "address");

  const photoIRI = resolveContactPhoto(contact);
  const {displayUrl} = usePhotoOrm(contact, photoIRI);
  if (!address?.coordLat || !address?.coordLng) return null;

  return (
    <Marker
      key={contact["@id"]}
      position={[
        address.coordLat,
        address.coordLng,
      ]}
      icon={createCustomIcon(contact, displayUrl)}
    >
      <Popup>
        <ContactPopup contact={contact} onContactClick={onContactClick}/>
      </Popup>
    </Marker>
  );
};