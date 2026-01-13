import { useEffect, useState } from "react";
import { getObjects } from "@ng-org/orm";
import { ShortSocialContactShapeType } from "@/.orm/shapes/shortcontact.shapeTypes.ts";
import { ShortSocialContact } from "@/.orm/shapes/shortcontact.typings.ts";

interface UseContactObjectsProps {
  contactNuris: string[];
  isNuriLoading: boolean;
}

export const useContactObjects = ({ contactNuris, isNuriLoading }: UseContactObjectsProps) => {
  const [contacts, setContacts] = useState<ShortSocialContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadContacts = async () => {
      if (contactNuris.length > 0) {
        const contactsSet = await getObjects(ShortSocialContactShapeType, { graphs: contactNuris });
        const contactsArray = [...contactsSet ?? []];
        setContacts(contactsArray);
        setIsLoading(false);
      }
      if (!isNuriLoading) {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [contactNuris, isNuriLoading]);

  return { contacts, isLoading };
};