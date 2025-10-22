import {parsePhoneNumberWithError} from "libphonenumber-js";

export function formatPhone(phone?: string): string {
  if (!phone) {
    return "";
  }
  try {
    return parsePhoneNumberWithError(phone)?.formatInternational()
  } catch {
    //fallback to param
    return phone;
  }
}