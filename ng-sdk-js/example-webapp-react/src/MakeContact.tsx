import { FormEvent, FunctionComponent, useCallback, useState } from "react";

export const MakePost: FunctionComponent = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

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
      <input type="submit" value="Post" />
    </form>
  );
};