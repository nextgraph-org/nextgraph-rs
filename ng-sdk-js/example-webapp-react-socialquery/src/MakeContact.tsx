import { FormEvent, FunctionComponent, useCallback, useState } from "react";
import { useLdo, dataset, useNextGraphAuth } from './reactMethods';
import { SocialContactShapeType } from "./.ldo/contact.shapeTypes.ts";

export const MakeContact: FunctionComponent = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { createData, commitData } = useLdo();
  const { session } = useNextGraphAuth();
  
  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const new_name = name.trim();
      const new_email = email.trim();
      if (new_name.trim().length > 2 && new_email.trim().length > 6 && new_email.indexOf("@") >= 0) { 
        setName("");
        setEmail("");
        const resource = await dataset.createResource("nextgraph", { primaryClass: "social:contact" });
        if (!resource.isError) {
          //console.log("Created resource:", resource.uri);

          const contact = createData(
              SocialContactShapeType,
              resource.uri.substring(0,53),
              resource
            );

          contact.type = { "@id": "Individual" };
          contact.fn = new_name;
          contact.hasEmail = new_email;
          const result = await commitData(contact);
          if (result.isError) {
              console.error(result.message);
          }
          await session.ng.update_header(session.sessionId, resource.uri.substring(0,53), new_name);
        }
      }
    },
    [name, email]
  );

  return (
    <form onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input type="submit" className="button" value="Add" />
    </form>
  );
};