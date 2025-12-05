export function generateUri(base: string) {
  const b = new Uint8Array(33);
  crypto.getRandomValues(b);

  // Convert to base64url
  const base64url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const randomString = base64url(b);

  return getShortUri(base) + ":p:" + randomString;
}

export function getShortUri(base: string): string {
  return base.substring(0, 53)
}