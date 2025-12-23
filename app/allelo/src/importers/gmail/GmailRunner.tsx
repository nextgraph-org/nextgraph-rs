import {SourceRunnerProps} from "@/types/importSource.ts";
import {useCallback, useEffect} from "react";
import {bcpCodeToIRI} from "@/utils/bcp47map.ts";
import type { people_v1 } from "googleapis";

import { 
  signIn, 
} from '@choochmeque/tauri-plugin-google-auth-api';
import { GOOGLE_CLIENTS } from "@/config/google";
import {appendPrefixToDictValue} from "@/utils/socialContact/dictMapper.ts";
import {
  PhoneNumber,
  SocialContact,
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
  UserDefined
} from "@/.orm/shapes/contact.typings.ts";
import {prepareContact} from "@/utils/socialContact/contactUtilsOrm.ts";

const googleFetch = (url: string, token: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    headers: {Authorization: `Bearer ${token}`, ...(init.headers || {})},
  });

const personFields = [
  "names", "emailAddresses", "phoneNumbers", "addresses", "organizations", "photos", "urls",
  "birthdays", "biographies", "events", "externalIds", "imClients", "relations", "memberships",
  "occupations", "skills", "interests", "locales", "locations", "nicknames", "ageRanges",
  "calendarUrls", "clientData", "coverPhotos", "miscKeywords", "metadata", "sipAddresses"].join(",");

async function mapGmailPerson(googleResult: people_v1.Schema$Person): Promise<SocialContact> {
  const src = "Gmail";

  const fmtDate = (d?: people_v1.Schema$Date | null) =>
    d?.year && d?.month && d?.day
      ? `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
      : undefined;

  const contact: Partial<SocialContact> = {
    "@graph": "",
    "@id": "",
    phoneNumber: new Set(googleResult?.phoneNumbers?.map((phoneNumber): PhoneNumber => ({
      "@graph": "",
      "@id": "",
      value: phoneNumber?.canonicalForm ?? phoneNumber?.value ?? "",
      type: appendPrefixToDictValue("phoneNumber", "type", phoneNumber?.type),
      preferred: !!phoneNumber?.metadata?.primary,
      source: src
    })) ?? []),

    name: new Set(googleResult?.names?.map((name): Name => ({
      "@graph": "",
      "@id": "",
      value: name?.displayName ?? "",
      displayNameLastFirst: name?.displayNameLastFirst ?? undefined,
      unstructuredName: name?.unstructuredName ?? undefined,
      familyName: name?.familyName ?? undefined,
      firstName: name?.givenName ?? undefined,
      middleName: name?.middleName ?? undefined,
      honorificPrefix: name?.honorificPrefix ?? undefined,
      honorificSuffix: name?.honorificSuffix ?? undefined,
      phoneticFullName: name?.phoneticFullName ?? undefined,
      phoneticFamilyName: name?.phoneticFamilyName ?? undefined,
      phoneticGivenName: name?.phoneticGivenName ?? undefined,
      phoneticMiddleName: name?.phoneticMiddleName ?? undefined,
      phoneticHonorificPrefix: name?.phoneticHonorificPrefix ?? undefined,
      phoneticHonorificSuffix: name?.phoneticHonorificSuffix ?? undefined,
      source: src,
    })) ?? []),

    email: new Set(googleResult?.emailAddresses?.map((email): Email => ({
      "@graph": "",
      "@id": "",
      value: email?.value ?? "",
      type: appendPrefixToDictValue("email", "type", email?.type),
      displayName: email?.displayName ?? undefined,
      preferred: !!email?.metadata?.primary,
      source: src,
    })) ?? []),

    address: new Set(googleResult?.addresses?.map((addr): Address => ({
      "@graph": "",
      "@id": "",
      value: addr?.formattedValue ?? "",
      type: appendPrefixToDictValue("address", "type", addr?.type),
      poBox: addr?.poBox ?? undefined,
      streetAddress: addr?.streetAddress ?? undefined,
      extendedAddress: addr?.extendedAddress ?? undefined,
      city: addr?.city ?? undefined,
      region: addr?.region ?? undefined,
      postalCode: addr?.postalCode ?? undefined,
      country: addr?.country ?? undefined,
      countryCode: addr?.countryCode ?? undefined, //TODO: need to be changed when codes become IRI
      preferred: !!addr?.metadata?.primary,
      source: src,
    })) ?? []),

    organization: new Set(googleResult?.organizations?.map((org): Organization => ({
        "@graph": "",
        "@id": "",
        value: org?.name ?? "",
        department: org?.department ?? undefined,
        position: org?.title ?? undefined,
        jobDescription: org?.jobDescription ?? undefined,
        phoneticName: org?.phoneticName ?? undefined,
        startDate: fmtDate(org?.startDate),
        endDate: fmtDate(org?.endDate),
        current: !!org?.current,
        type: appendPrefixToDictValue("organization", "type", org?.type),
        symbol: org?.symbol ?? undefined,
        domain: org?.domain ?? undefined,
        location: org?.location ?? undefined,
        costCenter: org?.costCenter ?? undefined,
        fullTimeEquivalentMillipercent: org?.fullTimeEquivalentMillipercent ?? undefined,
        source: src,
      })) ?? []),

    photo: new Set(googleResult?.photos?.map((p): Photo => ({
        "@graph": "",
        "@id": "",
        photoUrl: p?.url ?? "",
        photoIRI: "",
        preferred: p?.default ?? undefined,
        source: src,
      })) ?? []),

    coverPhoto: new Set(googleResult?.coverPhotos?.map((p): CoverPhoto => ({
        "@graph": "",
        "@id": "",
        value: p?.url ?? "",
        preferred: p?.default ?? undefined,
        source: src,
      })) ?? []),

    url: new Set(googleResult?.urls?.map((u): Url => ({
        "@graph": "",
        "@id": "",
        value: u?.value ?? "",
        type: appendPrefixToDictValue("url", "type", u?.type),
        source: src,
      })) ?? []),

    birthday: new Set(googleResult?.birthdays?.map((b): Birthday => ({
        "@graph": "",
        "@id": "",
        valueDate: fmtDate(b?.date) ?? "",
        source: src,
      })) ?? []),

    biography: new Set(googleResult?.biographies?.map((bio): Biography => ({
        "@graph": "",
        "@id": "",
        value: bio?.value ?? "",
        contentType: bio?.contentType ?? undefined,
        source: src,
      })) ?? []),

    event: new Set(googleResult?.events?.map((ev): Event => ({
        "@graph": "",
        "@id": "",
        startDate: fmtDate(ev?.date) ?? "",
        type: appendPrefixToDictValue("event", "type", ev?.type),
        source: src,
      })) ?? []),

    gender: new Set(googleResult?.genders?.map((gender): Gender => ({
        "@graph": "",
        "@id": "",
        valueIRI: appendPrefixToDictValue("gender", "valueIRI", gender?.value),
        addressMeAs: gender?.addressMeAs ?? undefined,
        source: src,
      })) ?? []),

    nickname: new Set(googleResult?.nicknames?.map((nickname): Nickname => ({
        "@graph": "",
        "@id": "",
        value: nickname?.value ?? "",
        type: appendPrefixToDictValue("nickname", "type", nickname?.type),
        source: src,
      })) ?? []),

    occupation: new Set(googleResult?.occupations?.map((occupation): Occupation => ({
        "@graph": "",
        "@id": "",
        value: occupation?.value ?? "",
        source: src,
      })) ?? []),

    relation: new Set(googleResult?.relations?.map((p): Relation => ({
        "@graph": "",
        "@id": "",
        value: p?.person ?? "",
        type: appendPrefixToDictValue("relation", "type", p?.type),
        source: src,
      })) ?? []),

    interest: new Set(googleResult?.interests?.map((interest): Interest => ({
        "@graph": "",
        "@id": "",
        value: interest?.value ?? "",
        source: src,
      })) ?? []),

    skill: new Set(googleResult?.skills?.map((skill): Skill => ({
        "@graph": "",
        "@id": "",
        value: skill?.value ?? "",
        source: src,
      })) ?? []),

    locationDescriptor: new Set(googleResult?.locations?.map((location): LocationDescriptor => ({
        "@graph": "",
        "@id": "",
        value: location?.value ?? "",
        type: location?.type ?? undefined,
        current: location?.current ?? undefined,
        buildingId: location?.buildingId ?? undefined,
        floor: location?.floor ?? undefined,
        floorSection: location?.floorSection ?? undefined,
        deskCode: location?.deskCode ?? undefined,
        source: src,
      })) ?? []),

    locale: new Set(googleResult?.locales?.map((locale): Locale => ({
        "@graph": "",
        "@id": "",
        value: bcpCodeToIRI(locale?.value ?? "") ?? "",
        source: src,
      })) ?? []),

    account: new Set(googleResult?.imClients?.map((im): Account => ({
        "@graph": "",
        "@id": "",
        value: im?.username ?? "",
        protocol: im?.protocol ?? undefined,
        type: appendPrefixToDictValue("account", "type", im?.type),
        source: src,
      })) ?? []),

    sipAddress: new Set(googleResult?.sipAddresses?.map((sipAddress): SipAddress => ({
        "@graph": "",
        "@id": "",
        value: sipAddress?.value ?? "",
        type: appendPrefixToDictValue("sipAddress", "type", sipAddress?.type),
        source: src,
      })) ?? []),

    extId: new Set(googleResult?.externalIds?.map((ex): ExternalId => ({
        "@graph": "",
        "@id": "",
        value: ex?.value ?? "",
        type: ex?.type ?? undefined,
        source: src,
      })) ?? []),

    fileAs: new Set(googleResult?.fileAses?.map((fileAs): FileAs => ({
        "@graph": "",
        "@id": "",
        value: fileAs?.value ?? "",
        source: src,
      })) ?? []),

    calendarUrl: new Set(googleResult?.calendarUrls?.map((calendarUrl): CalendarUrl => ({
        "@graph": "",
        "@id": "",
        value: calendarUrl?.url ?? "",
        type: appendPrefixToDictValue("calendarUrl", "type", calendarUrl?.type === "freeBusy" ?
          "availability" : calendarUrl?.type),
        source: src,
      })) ?? []),

    clientData: new Set(googleResult?.clientData?.map((clientData): ClientData => ({
        "@graph": "",
        "@id": "",
        key: clientData?.key ?? "",
        value: clientData?.value ?? "",
        source: src,
      })) ?? []),

    userDefined: new Set(googleResult?.userDefined?.map((userDefined): UserDefined => ({
        "@graph": "",
        "@id": "",
        key: userDefined?.key ?? "",
        value: userDefined?.value ?? "",
        source: src,
      })) ?? []),

    /*TODO membership:
          googleResult?.memberships?.map((fileAs) => ({
            value: fileAs?.value ?? "",
            source: src,
          })) ?? [],*/
    /* TODO:tag: highly unlikely it would map to our IRI's*/
  };

  return await prepareContact(contact);
}

export function GmailRunner({open, onError, onGetResult}: SourceRunnerProps) {
  const getContacts = useCallback(async (accessToken: string) => {
    const contacts: SocialContact[] = [];
    let pageToken;
    while (true) {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("personFields", personFields);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const people = await (await googleFetch(
        url.toString(),
        accessToken
      )).json() as people_v1.Schema$ListConnectionsResponse;
      if (people.connections) {
        for (const connection of people.connections) {
          const contact = await mapGmailPerson(connection);
          contacts.push(contact);
        }
      }

      if (!people.nextPageToken)
        break;

      pageToken = people.nextPageToken;
    }

    onGetResult(contacts);
  }, [onGetResult]);

  const login = useCallback(async () => {
    try {
      console.log('Gmail login');
      const platform = import.meta.env.TAURI_ENV_PLATFORM;
      const clientId = platform === 'ios' ? GOOGLE_CLIENTS.IOS.id : (platform === 'android' ? GOOGLE_CLIENTS.ANDROID.id : GOOGLE_CLIENTS.DESKTOP.id);
      const clientSecret = platform === 'ios' ? GOOGLE_CLIENTS.IOS.secret : (platform === 'android' ? GOOGLE_CLIENTS.ANDROID.secret : GOOGLE_CLIENTS.DESKTOP.secret);
      console.log(clientId);
      const tokens = await signIn({
        clientId: clientId,
        clientSecret: clientSecret, // Required for desktop
        scopes: [
          'openid',
          // 'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/contacts.readonly',
        ]
      });
      
      console.log('Sign-in successful:', tokens);
      if (!tokens.accessToken) {
        return onError(new Error('No access_token provided'));
      }

      await getContacts(tokens.accessToken);
      
    } catch (error: any) {
      console.error('Sign in failed:', error);
      
      if (error.includes('cancelled')) {
        console.log('User cancelled sign-in');
      } else if (error.includes('network')) {
        console.log('Network error occurred');
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      login();
    }
  }, [open, login]);

  return null;
}