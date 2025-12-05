import {useContactData} from "@/hooks/contacts/useContactData";
import {useContactPhoto} from "@/hooks/contacts/useContactPhoto";
import {useEffect, useRef} from "react";
import {Contact} from "@/types/contact";
import {resolveFrom} from "@/utils/socialContact/contactUtils";

/**
 * Invisible component that loads contact data for a single NURI
 * Similar to ContactProbe but optimized for network graph use
 * Also loads the contact's avatar from blob storage
 */
export function NetworkContactProbe({
  nuri,
  onContact,
}: {
  nuri: string;
  onContact: (nuri: string, contact: Contact | undefined) => void;
}) {
  const {contact} = useContactData(nuri);
  const photo = contact ? resolveFrom(contact, 'photo') : undefined;
  const {displayUrl, isLoadingImage} = useContactPhoto(contact, photo);
  const lastContactRef = useRef<Contact | undefined>(undefined);
  const lastAvatarRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!contact) {
      if (lastContactRef.current !== undefined) {
        lastContactRef.current = undefined;
        onContact(nuri, undefined);
      }
      return;
    }

    // Check if contact or avatar changed
    const avatarChanged = displayUrl !== lastAvatarRef.current && !isLoadingImage;
    const contactChanged = contact !== lastContactRef.current;

    if (contactChanged || avatarChanged) {
      lastContactRef.current = contact;
      lastAvatarRef.current = displayUrl;

      // Augment contact with loaded avatar URL
      const contactWithAvatar = displayUrl
        ? { ...contact, loadedAvatarUrl: displayUrl }
        : contact;

      onContact(nuri, contactWithAvatar);
    }
  }, [nuri, contact, displayUrl, isLoadingImage, onContact]);

  return null;
}
