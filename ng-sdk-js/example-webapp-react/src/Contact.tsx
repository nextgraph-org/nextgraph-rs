import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { ContainerShapeType } from "./.ldo/container.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject } from "./reactMethods.ts";

export const Contact: FunctionComponent = () => {
  const { session } = useNextGraphAuth();
  
  let myContainer;
  let container_overlay;

  if (session.sessionId) {
    useResource("did:ng:"+session.privateStoreId);
    container_overlay =  session.privateStoreId.substring(46);
    console.log(container_overlay);
    myContainer = useSubject(ContainerShapeType, "did:ng:"+(session.privateStoreId.substring(0,46)));
  }
  
  if (!session.sessionId) return <></>;
  
  return <>{myContainer.contains?.map((contained) => <p className="mb-5" style={{overflowWrap:"anywhere"}} key={contained["@id"]}>{contained["@id"]}</p>)}</>;
};