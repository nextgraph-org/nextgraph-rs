import { FormEvent, FunctionComponent, useCallback, useState } from "react";
import { BrowserNGLdoProvider, useLdo, dataset } from './reactMethods';
import { NGSocialContactShapeType } from "./.ldo/contact.shapeTypes.ts";
import { LdSet } from "@ldo/ldo";

export const MakeContact: FunctionComponent = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { createData, commitData } = useLdo();

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (name.trim().length > 2 && email.trim().length > 6 && email.indexOf("@") >= 0) { 

        const resource = await dataset.createResource("nextgraph");
        if (!resource.isError) {
          console.log("Created resource:", resource.uri);

          const contact = createData(
              NGSocialContactShapeType,
              resource.uri.substring(0,53),
              resource
            );

          contact.type = { "@id": "Individual" };
          contact.fn = name.trim();
          contact.hasEmail = email.trim();
          const result = await commitData(contact);
          if (result.isError) {
              console.error(result.message);
          }
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
      <input type="submit" id="save" value="Save" />
    </form>
  );
};