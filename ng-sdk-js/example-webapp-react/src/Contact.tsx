import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { SocialContactShapeType } from "./.ldo/contact.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject } from "./reactMethods.ts";

export const Contact: FunctionComponent = ({nuri}) => {
  const { session } = useNextGraphAuth();

  useResource(session.sessionId && nuri ? nuri : undefined, { subscribe: true });
  let contact = useSubject(SocialContactShapeType, session.sessionId && nuri ? nuri.substring(0,53) : undefined);
 
  if (!session.sessionId || !nuri) return <></>;
  
  return <>
    {contact.fn? ( 
      <div className="contact" title={nuri}>
        <span className="name"> 
          {contact.fn}
        </span>
        <svg className="w-6 h-6 inline email-logo" data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"></path>
        </svg>
        <span className="email text-left">
          email:&nbsp;{contact.hasEmail}
        </span>
      </div>
    ) : <></>}
  </>;
};