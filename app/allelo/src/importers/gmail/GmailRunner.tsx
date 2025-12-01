import {SourceRunnerProps} from "@/types/importSource.ts";
import {useCallback, useEffect, useMemo} from "react";
import {Contact} from "@/types/contact.ts";
import {getContactIriValue} from "@/utils/socialContact/dictMapper.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {processContactFromJSON} from "@/utils/socialContact/contactUtils.ts";
import {bcpCodeToIRI} from "@/utils/bcp47map.ts";

import { 
  signIn, 
} from '@choochmeque/tauri-plugin-google-auth-api';
import { GOOGLE_CLIENTS } from "@/config/google";


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

async function mapGmailPerson(googleResult: any, withIds = true): Promise<Contact> {
  const src = "Gmail";

  const fmtDate = (d?: { year?: number; month?: number; day?: number }) =>
    d?.year && d?.month && d?.day
      ? `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
      : undefined;

  const contactJson = {
    type: [
      {
        "@id": "Individual"
      }
    ],
    phoneNumber: googleResult?.phoneNumbers?.map((phoneNumber: any) => ({
      value: phoneNumber?.canonicalForm ?? phoneNumber?.value ?? "",
      type2: getContactIriValue("phoneNumber", phoneNumber?.type),
      preferred: !!phoneNumber?.metadata?.primary,
      source: src,
    })) ?? [],

    name: googleResult?.names?.map((name: any) => ({
      value: name?.displayName ?? "",
      displayNameLastFirst: name?.displayNameLastFirst,
      unstructuredName: name?.unstructuredName,
      familyName: name?.familyName,
      firstName: name?.givenName,
      middleName: name?.middleName,
      honorificPrefix: name?.honorificPrefix,
      honorificSuffix: name?.honorificSuffix,
      phoneticFullName: name?.phoneticFullName,
      phoneticFamilyName: name?.phoneticFamilyName,
      phoneticGivenName: name?.phoneticGivenName,
      phoneticMiddleName: name?.phoneticMiddleName,
      phoneticHonorificPrefix: name?.phoneticHonorificPrefix,
      phoneticHonorificSuffix: name?.phoneticHonorificSuffix,
      source: src,
    })) ?? [],

    email: googleResult?.emailAddresses?.map((email: any) => ({
      value: email?.value ?? "",
      type2: getContactIriValue("email", email?.type),
      displayName: email?.displayName,
      preferred: !!email?.metadata?.primary,
      source: src,
    })) ?? [],

    address: googleResult?.addresses?.map((addr: any) => ({
      value: addr?.formattedValue ?? "",
      type2: getContactIriValue("address", addr?.type),
      poBox: addr?.poBox,
      streetAddress: addr?.streetAddress,
      extendedAddress: addr?.extendedAddress,
      city: addr?.city,
      region: addr?.region,
      postalCode: addr?.postalCode,
      country: addr?.country,
      countryCode: addr?.countryCode, //TODO: need to be changed when codes become IRI
      preferred: !!addr?.metadata?.primary,
      source: src,
    })) ?? [],

    organization: googleResult?.organizations?.map((org: any) => ({
        value: org?.name ?? "",
        department: org?.department,
        position: org?.title,
        jobDescription: org?.jobDescription,
        phoneticName: org?.phoneticName,
        startDate: fmtDate(org?.startDate),
        endDate: fmtDate(org?.endDate),
        current: !!org?.current,
        type2: getContactIriValue("organization", org?.type),
        symbol: org?.symbol,
        domain: org?.domain,
        location: org?.location,
        costCenter: org?.costCenter,
        fullTimeEquivalentMillipercent: org?.fullTimeEquivalentMillipercent,
        source: src,
      })) ?? [],

    photo: googleResult?.photos?.map((p: any) => ({
        value: p?.url ?? "",
        preferred: p?.default,
        source: src,
      })) ?? [],

    coverPhoto: googleResult?.coverPhotos?.map((p: any) => ({
        value: p?.url ?? "",
        preferred: p?.default,
        source: src,
      })) ?? [],

    url: googleResult?.urls?.map((u: any) => ({
        value: u?.value ?? "",
        type2: getContactIriValue("url", u?.type),
        source: src,
      })) ?? [],

    birthday: googleResult?.birthdays?.map((b: any) => ({
        valueDate: fmtDate(b?.date),
        source: src,
      })) ?? [],

    biography: googleResult?.biographies?.map((bio: any) => ({
        value: bio?.value ?? "",
        contentType: bio?.contentType,
        source: src,
      })) ?? [],

    event: googleResult?.events?.map((ev: any) => ({
        startDate: fmtDate(ev?.date),
        type2: getContactIriValue("event", ev?.type),
        source: src,
      })) ?? [],

    gender: googleResult?.genders?.map((gender: any) => ({
        valueIRI: getContactIriValue("gender", gender?.value),
        addressMeAs: gender?.addressMeAs,
        source: src,
      })) ?? [],

    nickname: googleResult?.nicknames?.map((nickname: any) => ({
        value: nickname?.value ?? "",
        type2: nickname?.type,
        source: src,
      })) ?? [],

    occupation: googleResult?.occupations?.map((occupation: any) => ({
        value: occupation?.value ?? "",
        source: src,
      })) ?? [],

    relation: googleResult?.relations?.map((p: any) => ({
        value: p?.person ?? "",
        type2: getContactIriValue("relation", p?.type),
        source: src,
      })) ?? [],

    interest: googleResult?.interests?.map((interest: any) => ({
        value: interest?.value ?? "",
        source: src,
      })) ?? [],

    skill: googleResult?.skills?.map((skill: any) => ({
        value: skill?.value ?? "",
        source: src,
      })) ?? [],

    locationDescriptor: googleResult?.locations?.map((location: any) => ({
        value: location?.value ?? "",
        type2: location?.type,
        current: location?.current,
        buildingId: location?.buildingId,
        floor: location?.floor,
        floorSection: location?.floorSection,
        deskCode: location?.deskCode,
        source: src,
      })) ?? [],

    locale: googleResult?.locales?.map((locale: any) => ({
        value: bcpCodeToIRI(locale?.value),
        source: src,
      })) ?? [],

    account: googleResult?.imClients?.map((im: any) => ({
        value: im?.username ?? "",
        protocol: im?.protocol,
        type2: getContactIriValue("account", im?.type),
        source: src,
      })) ?? [],

    sipAddress: googleResult?.sipAddresses?.map((sipAddress: any) => ({
        value: sipAddress?.value,
        type2: getContactIriValue("sipAddress", sipAddress?.type),
        source: src,
      })) ?? [],

    extId: googleResult?.externalIds?.map((ex: any) => ({
        value: ex?.value ?? "",
        type2: ex?.type,
        source: src,
      })) ?? [],

    fileAs: googleResult?.fileAses?.map((fileAs: any) => ({
        value: fileAs?.value ?? "",
        source: src,
      })) ?? [],

    calendarUrl: googleResult?.calendarUrls?.map((calendarUrl: any) => ({
        value: calendarUrl?.url ?? "",
        type2: getContactIriValue("calendarUrl", calendarUrl?.type === "freeBusy" ?
          "availability" : calendarUrl?.type),
        source: src,
      })) ?? [],

    clientData: googleResult?.clientData?.map((clientData: any) => ({
        key: clientData?.key ?? "",
        value: clientData?.value ?? "",
        source: src,
      })) ?? [],

    userDefined: googleResult?.userDefined?.map((userDefined: any) => ({
        key: userDefined?.key ?? "",
        value: userDefined?.value ?? "",
        source: src,
      })) ?? [],

    /*TODO membership:
          googleResult?.memberships?.map((fileAs: any) => ({
            value: fileAs?.value ?? "",
            source: src,
          })) ?? [],*/
    /* TODO:tag: highly unlikely it would map to our IRI's*/
  };

  return await processContactFromJSON(contactJson, withIds);
}

export function GmailRunner({open, onClose, onError, onGetResult}: SourceRunnerProps) {
  const isNextGraph = useMemo(() => isNextGraphEnabled(), []);

  const getContacts = useCallback(async (accessToken: string) => {
    const contacts: Contact[] = [];
    let pageToken;
    while (true) {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("personFields", personFields);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const people = await (await googleFetch(
        url.toString(),
        accessToken
      )).json();

      if (people.connections) {
        for (const connection of people.connections) {
          const contact = await mapGmailPerson(connection, !isNextGraph);
          contacts.push(contact);
        }
      }

      if (!people.nextPageToken)
        break;

      pageToken = people.nextPageToken;
    }

    onGetResult(contacts);
  }, [onGetResult, isNextGraph]);

  const login = useCallback(async () => {
    try {

      const platform = import.meta.env.TAURI_ENV_PLATFORM;
      const clientId = platform === 'ios' ? GOOGLE_CLIENTS.IOS.id : (platform === 'android' ? GOOGLE_CLIENTS.ANDROID.id : GOOGLE_CLIENTS.DESKTOP.id);
      const clientSecret = platform === 'ios' ? GOOGLE_CLIENTS.IOS.secret : (platform === 'android' ? GOOGLE_CLIENTS.ANDROID.secret : GOOGLE_CLIENTS.DESKTOP.secret);
      const tokens = await signIn({
        clientId: clientId,
        clientSecret: clientSecret, // Required for desktop
        scopes: [
          'openid',
          'https://www.googleapis.com/auth/gmail.readonly',
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