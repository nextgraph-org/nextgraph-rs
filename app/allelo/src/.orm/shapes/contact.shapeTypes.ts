import type { ShapeType } from "@ng-org/shex-orm";
import { contactSchema } from "./contact.schema";
import type {
  SocialContact,
  PhoneNumber,
  Name,
  Email,
  Address,
  Organization,
  Photo,
  CoverPhoto,
  Url,
  Birthday,
  Biography,
  Event,
  Gender,
  Nickname,
  Occupation,
  Relation,
  Interest,
  Skill,
  LocationDescriptor,
  Locale,
  Account,
  SipAddress,
  FileAs,
  CalendarUrl,
  ClientData,
  UserDefined,
  Membership,
  Tag,
  ContactImportGroup,
  InternalGroup,
  NaoStatus,
  InvitedAt,
  CreatedAt,
  UpdatedAt,
  JoinedAt,
  Headline,
  Industry,
  Education,
  Language,
  Project,
  Publication,
} from "./contact.typings";

// ShapeTypes for contact
export const SocialContactShapeType: ShapeType<SocialContact> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#SocialContact",
};
export const PhoneNumberShapeType: ShapeType<PhoneNumber> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#PhoneNumber",
};
export const NameShapeType: ShapeType<Name> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Name",
};
export const EmailShapeType: ShapeType<Email> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Email",
};
export const AddressShapeType: ShapeType<Address> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Address",
};
export const OrganizationShapeType: ShapeType<Organization> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Organization",
};
export const PhotoShapeType: ShapeType<Photo> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Photo",
};
export const CoverPhotoShapeType: ShapeType<CoverPhoto> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CoverPhoto",
};
export const UrlShapeType: ShapeType<Url> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Url",
};
export const BirthdayShapeType: ShapeType<Birthday> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Birthday",
};
export const BiographyShapeType: ShapeType<Biography> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Biography",
};
export const EventShapeType: ShapeType<Event> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Event",
};
export const GenderShapeType: ShapeType<Gender> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Gender",
};
export const NicknameShapeType: ShapeType<Nickname> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Nickname",
};
export const OccupationShapeType: ShapeType<Occupation> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Occupation",
};
export const RelationShapeType: ShapeType<Relation> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Relation",
};
export const InterestShapeType: ShapeType<Interest> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Interest",
};
export const SkillShapeType: ShapeType<Skill> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Skill",
};
export const LocationDescriptorShapeType: ShapeType<LocationDescriptor> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#LocationDescriptor",
};
export const LocaleShapeType: ShapeType<Locale> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Locale",
};
export const AccountShapeType: ShapeType<Account> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Account",
};
export const SipAddressShapeType: ShapeType<SipAddress> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#SipAddress",
};
export const FileAsShapeType: ShapeType<FileAs> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#FileAs",
};
export const CalendarUrlShapeType: ShapeType<CalendarUrl> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CalendarUrl",
};
export const ClientDataShapeType: ShapeType<ClientData> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#ClientData",
};
export const UserDefinedShapeType: ShapeType<UserDefined> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#UserDefined",
};
export const MembershipShapeType: ShapeType<Membership> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Membership",
};
export const TagShapeType: ShapeType<Tag> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Tag",
};
export const ContactImportGroupShapeType: ShapeType<ContactImportGroup> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#ContactImportGroup",
};
export const InternalGroupShapeType: ShapeType<InternalGroup> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#InternalGroup",
};
export const NaoStatusShapeType: ShapeType<NaoStatus> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#NaoStatus",
};
export const InvitedAtShapeType: ShapeType<InvitedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#InvitedAt",
};
export const CreatedAtShapeType: ShapeType<CreatedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CreatedAt",
};
export const UpdatedAtShapeType: ShapeType<UpdatedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#UpdatedAt",
};
export const JoinedAtShapeType: ShapeType<JoinedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#JoinedAt",
};
export const HeadlineShapeType: ShapeType<Headline> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Headline",
};
export const IndustryShapeType: ShapeType<Industry> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Industry",
};
export const EducationShapeType: ShapeType<Education> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Education",
};
export const LanguageShapeType: ShapeType<Language> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Language",
};
export const ProjectShapeType: ShapeType<Project> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Project",
};
export const PublicationShapeType: ShapeType<Publication> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Publication",
};
