import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { ContainerShapeType } from "./.ldo/container.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject } from "./reactMethods.ts";

export const Contact: FunctionComponent = () => {
  const { session } = useNextGraphAuth();
  
  let container_overlay;

  useResource(session.sessionId ? "did:ng:"+session.privateStoreId : undefined);
  let myContainer = useSubject(ContainerShapeType, session.sessionId ? "did:ng:"+(session.privateStoreId.substring(0,46)) : undefined);

  if (session.sessionId) {
    container_overlay =  session.privateStoreId.substring(46);
    console.log(container_overlay);
  }
  
  if (!session.sessionId) return <></>;
  
  return <>{myContainer.contains?.map((contained) => <p className="mb-5" style={{overflowWrap:"anywhere"}} key={contained["@id"]}>{contained["@id"]}</p>)}</>;
};