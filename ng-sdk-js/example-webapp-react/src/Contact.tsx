import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";

export const Contact: FunctionComponent = () => {
  const { session } = useNextGraphAuth();
  if (!session.sessionId) return <></>;
  return (
    <div>
      <p>Contact</p>
    </div>
  );
};