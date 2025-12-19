import { ShapeType } from "@ldo/ldo";
import { contactSchema } from "./contact.schema";
import { contactContext } from "./contact.context";
import {
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
  ExternalId,
  FileAs,
  CalendarUrl,
  ClientData,
  UserDefined,
  Membership,
  Tag,
  ContactImportGroup,
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

/**
 * =============================================================================
 * LDO ShapeTypes contact
 * =============================================================================
 */

/**
 * SocialContact ShapeType
 */
export const SocialContactShapeType: ShapeType<SocialContact> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#SocialContact",
  context: contactContext,
};

/**
 * PhoneNumber ShapeType
 */
export const PhoneNumberShapeType: ShapeType<PhoneNumber> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#PhoneNumber",
  context: contactContext,
};

/**
 * Name ShapeType
 */
export const NameShapeType: ShapeType<Name> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Name",
  context: contactContext,
};

/**
 * Email ShapeType
 */
export const EmailShapeType: ShapeType<Email> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Email",
  context: contactContext,
};

/**
 * Address ShapeType
 */
export const AddressShapeType: ShapeType<Address> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Address",
  context: contactContext,
};

/**
 * Organization ShapeType
 */
export const OrganizationShapeType: ShapeType<Organization> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Organization",
  context: contactContext,
};

/**
 * Photo ShapeType
 */
export const PhotoShapeType: ShapeType<Photo> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Photo",
  context: contactContext,
};

/**
 * CoverPhoto ShapeType
 */
export const CoverPhotoShapeType: ShapeType<CoverPhoto> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CoverPhoto",
  context: contactContext,
};

/**
 * Url ShapeType
 */
export const UrlShapeType: ShapeType<Url> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Url",
  context: contactContext,
};

/**
 * Birthday ShapeType
 */
export const BirthdayShapeType: ShapeType<Birthday> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Birthday",
  context: contactContext,
};

/**
 * Biography ShapeType
 */
export const BiographyShapeType: ShapeType<Biography> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Biography",
  context: contactContext,
};

/**
 * Event ShapeType
 */
export const EventShapeType: ShapeType<Event> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Event",
  context: contactContext,
};

/**
 * Gender ShapeType
 */
export const GenderShapeType: ShapeType<Gender> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Gender",
  context: contactContext,
};

/**
 * Nickname ShapeType
 */
export const NicknameShapeType: ShapeType<Nickname> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Nickname",
  context: contactContext,
};

/**
 * Occupation ShapeType
 */
export const OccupationShapeType: ShapeType<Occupation> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Occupation",
  context: contactContext,
};

/**
 * Relation ShapeType
 */
export const RelationShapeType: ShapeType<Relation> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Relation",
  context: contactContext,
};

/**
 * Interest ShapeType
 */
export const InterestShapeType: ShapeType<Interest> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Interest",
  context: contactContext,
};

/**
 * Skill ShapeType
 */
export const SkillShapeType: ShapeType<Skill> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Skill",
  context: contactContext,
};

/**
 * LocationDescriptor ShapeType
 */
export const LocationDescriptorShapeType: ShapeType<LocationDescriptor> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#LocationDescriptor",
  context: contactContext,
};

/**
 * Locale ShapeType
 */
export const LocaleShapeType: ShapeType<Locale> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Locale",
  context: contactContext,
};

/**
 * Account ShapeType
 */
export const AccountShapeType: ShapeType<Account> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Account",
  context: contactContext,
};

/**
 * SipAddress ShapeType
 */
export const SipAddressShapeType: ShapeType<SipAddress> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#SipAddress",
  context: contactContext,
};

/**
 * ExternalId ShapeType
 */
export const ExternalIdShapeType: ShapeType<ExternalId> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#ExternalId",
  context: contactContext,
};

/**
 * FileAs ShapeType
 */
export const FileAsShapeType: ShapeType<FileAs> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#FileAs",
  context: contactContext,
};

/**
 * CalendarUrl ShapeType
 */
export const CalendarUrlShapeType: ShapeType<CalendarUrl> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CalendarUrl",
  context: contactContext,
};

/**
 * ClientData ShapeType
 */
export const ClientDataShapeType: ShapeType<ClientData> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#ClientData",
  context: contactContext,
};

/**
 * UserDefined ShapeType
 */
export const UserDefinedShapeType: ShapeType<UserDefined> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#UserDefined",
  context: contactContext,
};

/**
 * Membership ShapeType
 */
export const MembershipShapeType: ShapeType<Membership> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Membership",
  context: contactContext,
};

/**
 * Tag ShapeType
 */
export const TagShapeType: ShapeType<Tag> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Tag",
  context: contactContext,
};

/**
 * ContactImportGroup ShapeType
 */
export const ContactImportGroupShapeType: ShapeType<ContactImportGroup> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#ContactImportGroup",
  context: contactContext,
};

/**
 * NaoStatus ShapeType
 */
export const NaoStatusShapeType: ShapeType<NaoStatus> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#NaoStatus",
  context: contactContext,
};

/**
 * InvitedAt ShapeType
 */
export const InvitedAtShapeType: ShapeType<InvitedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#InvitedAt",
  context: contactContext,
};

/**
 * CreatedAt ShapeType
 */
export const CreatedAtShapeType: ShapeType<CreatedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#CreatedAt",
  context: contactContext,
};

/**
 * UpdatedAt ShapeType
 */
export const UpdatedAtShapeType: ShapeType<UpdatedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#UpdatedAt",
  context: contactContext,
};

/**
 * JoinedAt ShapeType
 */
export const JoinedAtShapeType: ShapeType<JoinedAt> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#JoinedAt",
  context: contactContext,
};

/**
 * Headline ShapeType
 */
export const HeadlineShapeType: ShapeType<Headline> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Headline",
  context: contactContext,
};

/**
 * Industry ShapeType
 */
export const IndustryShapeType: ShapeType<Industry> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Industry",
  context: contactContext,
};

/**
 * Education ShapeType
 */
export const EducationShapeType: ShapeType<Education> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Education",
  context: contactContext,
};

/**
 * Language ShapeType
 */
export const LanguageShapeType: ShapeType<Language> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Language",
  context: contactContext,
};

/**
 * Project ShapeType
 */
export const ProjectShapeType: ShapeType<Project> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Project",
  context: contactContext,
};

/**
 * Publication ShapeType
 */
export const PublicationShapeType: ShapeType<Publication> = {
  schema: contactSchema,
  shape: "did:ng:x:contact:class#Publication",
  context: contactContext,
};
