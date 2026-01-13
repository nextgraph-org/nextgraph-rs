import {contactService} from "@/services/contactService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {OrmConnection} from "../../../../../sdk/js/orm";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";

interface UpdateContactData {
  updateContacts: (contactsToUpd: Record<string, Partial<SocialContact>>) => Promise<void>;
}

export const useUpdateContacts = (): UpdateContactData => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const updateContacts = async (contactsToUpd: Record<string, Partial<SocialContact>>) => {
    const graphs = Object.keys(contactsToUpd);

    const connection = OrmConnection.getOrCreate(SocialContactShapeType, {graphs: graphs});
    await connection.readyPromise;
    connection.beginTransaction();

    const signalObjects = [...connection.signalObject ?? []];

    for (const obj of signalObjects) {
      await contactService.persistSocialContact(session, contactsToUpd[obj["@graph"]], obj);
    }

    await connection.commitTransaction();
    connection.close();
  };

  return {
    updateContacts
  }
}