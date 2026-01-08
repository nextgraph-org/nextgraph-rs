import type { ShapeType } from "@ng-org/shex-orm";
import { shortcontactSchema } from "./shortcontact.schema";
import type {
  ShortSocialContact,
  Name,
  Photo,
  Address,
} from "./shortcontact.typings";

// ShapeTypes for shortcontact
export const ShortSocialContactShapeType: ShapeType<ShortSocialContact> = {
  schema: shortcontactSchema,
  shape: "did:ng:x:contact:class#ShortSocialContact",
};
export const NameShapeType: ShapeType<Name> = {
  schema: shortcontactSchema,
  shape: "did:ng:x:contact:class#Name",
};
export const PhotoShapeType: ShapeType<Photo> = {
  schema: shortcontactSchema,
  shape: "did:ng:x:contact:class#Photo",
};
export const AddressShapeType: ShapeType<Address> = {
  schema: shortcontactSchema,
  shape: "did:ng:x:contact:class#Address",
};
