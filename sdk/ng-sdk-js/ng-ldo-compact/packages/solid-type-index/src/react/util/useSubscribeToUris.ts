import { useLdo } from "@ldo/solid-react";
import { useEffect, useRef } from "react";

export function useSubscribeToUris(uris: string[]) {
  const { dataset } = useLdo();
  const currentlySubscribed = useRef<Record<string, string>>({});
  useEffect(() => {
    const resources = uris.map((uri) => dataset.getResource(uri));
    const previousSubscriptions = { ...currentlySubscribed.current };
    Promise.all<void>(
      resources.map(async (resource) => {
        if (!previousSubscriptions[resource.uri]) {
          // Read and subscribe
          await resource.readIfUnfetched();
          currentlySubscribed.current[resource.uri] =
            await resource.subscribeToNotifications();
        } else {
          delete previousSubscriptions[resource.uri];
        }
      }),
    ).then(async () => {
      // Unsubscribe from all remaining previous subscriptions
      await Promise.all(
        Object.entries(previousSubscriptions).map(
          async ([resourceUri, subscriptionId]) => {
            // Unsubscribe
            delete currentlySubscribed.current[resourceUri];
            const resource = dataset.getResource(resourceUri);
            await resource.unsubscribeFromNotifications(subscriptionId);
          },
        ),
      );
    });
  }, [uris]);
}
