import {Marker, Popup} from 'react-leaflet';
import {createCustomIcon} from './mapUtils';
import {ContactPopup} from './ContactPopup';
import type {ContactMarkerProps} from './types';
import {resolveFrom} from '@/utils/socialContact/contactUtils';
import {useContactData} from "@/hooks/contacts/useContactData";
import {useContactPhoto} from "@/hooks/contacts/useContactPhoto.ts";

export const ContactMarker = ({nuri, onContactClick}: ContactMarkerProps) => {
  const {contact} = useContactData(nuri);
  const photo = resolveFrom(contact, 'photo');
  const {displayUrl} = useContactPhoto(contact, photo);

  if (!contact) {
    return null;
  }

  const address = resolveFrom(contact, 'address');
  if (!address?.coordLat || !address?.coordLng) return null;

  return (
    <Marker
      key={contact['@id']}
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