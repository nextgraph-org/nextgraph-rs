import { createLdoDataset } from "../src/createLdoDataset.js";
import { ProfileShapeType } from "./profileData.js";

describe("TransactionLdoDataset", () => {
  it("Uses transactions with an LdoBuilder", () => {
    const ldoDataset = createLdoDataset();
    const transaction = ldoDataset.startTransaction();
    const profile = transaction
      .usingType(ProfileShapeType)
      .fromSubject("https://example.com/Person1");
    profile.fn = "John Doe";
    expect(transaction.getChanges().added?.toString()).toBe(
      '<https://example.com/Person1> <http://www.w3.org/2006/vcard/ns#fn> "John Doe" .\n',
    );
    expect(ldoDataset.toString()).toBe("");
    transaction.commit();
    expect(ldoDataset.toString()).toBe(
      '<https://example.com/Person1> <http://www.w3.org/2006/vcard/ns#fn> "John Doe" .\n',
    );
  });
});
