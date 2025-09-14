export type ResourceInfo = ContainerInfo | LeafInfo;

interface ContainerInfo {
  slug: string;
  isContainer: true;
  shouldNotInit?: boolean;
  contains: (ContainerInfo | LeafInfo)[];
}

interface LeafInfo {
  slug: string;
  isContainer: false;
  data: string;
  shouldNotInit?: boolean;
  mimeType: string;
}

export async function initResources(
  rootUri: string,
  resourceInfo: ResourceInfo,
  authFetch: typeof fetch,
): Promise<void> {
  if (resourceInfo?.shouldNotInit) return;
  if (resourceInfo.isContainer) {
    await authFetch(rootUri, {
      method: "POST",
      headers: {
        link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        slug: resourceInfo.slug,
      },
    });
    await Promise.all(
      resourceInfo.contains.map((subResourceInfo) =>
        initResources(
          `${rootUri}${resourceInfo.slug}`,
          subResourceInfo,
          authFetch,
        ),
      ),
    );
  } else {
    await authFetch(`${rootUri}${resourceInfo.slug}`, {
      method: "PUT",
      headers: {
        "content-type": resourceInfo.mimeType,
      },
      body: resourceInfo.data,
    });
  }
}

export async function cleanResources(
  rootUri: string,
  resourceInfo: ResourceInfo,
  authFetch: typeof fetch,
): Promise<void> {
  if (resourceInfo.isContainer) {
    await Promise.all(
      resourceInfo.contains.map((subResourceInfo) =>
        cleanResources(
          `${rootUri}${resourceInfo.slug}`,
          subResourceInfo,
          authFetch,
        ),
      ),
    );
    await authFetch(`${rootUri}${resourceInfo.slug}`, {
      method: "DELETE",
    });
  } else {
    await authFetch(`${rootUri}${resourceInfo.slug}`, {
      method: "DELETE",
    });
  }
}
