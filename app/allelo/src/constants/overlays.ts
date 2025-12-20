import {NextGraphSession} from "@/types/nextgraph.ts";

//TODO: this should be changed to another store
export const groupsOverlay = (session: NextGraphSession) => {return session?.privateStoreId!.substring(46);};

export const contactsOverlay = (session: NextGraphSession) => {return session?.privateStoreId!.substring(46);};