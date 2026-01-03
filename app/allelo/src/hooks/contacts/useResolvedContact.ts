import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {
  resolveContactAddress,
  resolveContactEmail,
  resolveContactName, resolveContactOrganization,
  resolveContactPhone,
  resolveContactPhoto
} from "@/utils/socialContact/contactUtilsOrm.ts";
import {usePhotoOrm} from "@/hooks/usePhotoOrm.ts";

/**
 * Convenience hook that takes a nuri and returns resolved contact fields
 * Combines useContactOrm with field resolvers
 * Returns reactive values that update when the contact changes
 */
export function useResolvedContact(nuri: string | null | undefined, isProfile = false) {
  const {ormContact} = useContactOrm(nuri, isProfile);

  const photoIRI = resolveContactPhoto(ormContact);
  const {displayUrl} = usePhotoOrm(ormContact, photoIRI);

  return {
    ormContact,
    name: resolveContactName(ormContact),
    email: resolveContactEmail(ormContact),
    phone: resolveContactPhone(ormContact),
    address: resolveContactAddress(ormContact),
    organization: resolveContactOrganization(ormContact),
    photoIRI,
    photoUrl: displayUrl
  };
}