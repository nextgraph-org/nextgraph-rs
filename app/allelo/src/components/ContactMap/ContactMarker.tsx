import {Marker, Popup} from 'react-leaflet';
import {createCustomIcon} from './mapUtils';
import {ContactPopup} from './ContactPopup';
import {useResolvedContact} from "@/hooks/contacts/useResolvedContact.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactMarkerProps {
  nuri: string;
  onContactClick?: (contact: SocialContact) => void;
}

export const ContactMarker = ({nuri, onContactClick}: ContactMarkerProps) => {
  const {ormContact, photoUrl} = useResolvedContact(nuri);

  if (!ormContact) {
    return null;
  }

  const address = resolveFrom(ormContact, "address");
  if (!address?.coordLat || !address?.coordLng) return null;

  return (
    <Marker
      key={ormContact["@id"]}
      position={[
        address.coordLat,
        address.coordLng,
      ]}
      icon={createCustomIcon(ormContact, photoUrl)}
    >
      <Popup>
        <ContactPopup contact={ormContact} onContactClick={onContactClick}/>
      </Popup>
    </Marker>
  );
};