import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { ContainerShapeType } from "./.ldo/container.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject } from "./reactMethods.ts";
import { Contact } from "./Contact";
import { MakeContact } from "./MakeContact";
import { Link } from "react-router";
import { LifebuoyIcon } from '@heroicons/react/24/outline'

export const Contacts: FunctionComponent = () => {
  const { session } = useNextGraphAuth();
  
  let container_overlay: string;

  useResource(session.sessionId ? "did:ng:"+session.privateStoreId : undefined, { subscribe: true });
  let myContainer = useSubject(ContainerShapeType, session.sessionId ? "did:ng:"+(session.privateStoreId.substring(0,46)) : undefined);
  if (session.sessionId) {
    container_overlay = session.privateStoreId.substring(46) as string;
  }
  
  if (!session.sessionId) return <></>;
  
  return <>
    <div className="centered">
      <div className="flex flex-wrap justify-center gap-5 mt-10 mb-5">
        <MakeContact/>
      </div>
      <div className="flex flex-wrap justify-center gap-5 mt-10 mb-10">
        <Link to="/query"><button className="button"><LifebuoyIcon className="size-7 inline"/> Query</button> </Link>
      </div>
      <div className="flex flex-wrap justify-center gap-5 mb-10">
        { 
          myContainer.contains?.map(
            (contained) => 
              <Contact key={contained["@id"]} nuri={contained["@id"]+container_overlay}/>
          )
        }
      </div>
    </div>
  </>;
};

