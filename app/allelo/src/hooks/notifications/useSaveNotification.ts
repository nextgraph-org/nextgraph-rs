import {useCallback, useEffect, useState} from "react";
import {
  NextGraphAuth,
} from "@/types/nextgraph.ts";
import {getNotificationDictValues} from "@/utils/notificationDictMapper.ts";
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {getShortUri} from "@/utils/nextgraph/ngHelpers.ts";
import {UserNotification} from "@/.orm/shapes/notification.typings.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {useShape} from "@ng-org/signals/react";
import {UserNotificationShapeType} from "@/.orm/shapes/notification.shapeTypes.ts";

type NotificationWithoutMeta = Omit<UserNotification, "@id" | "@graph" | "@type">;

function getRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const bodyPool: string[] = [
  "Alice would like to connect with you",
  "",
  "Bob vouched for your React skills",
  "",
  "Carol praised your leadership",
  "",
  "System: Your profile is now 100% complete",
  "Dave endorsed your TypeScript skills",
  ""
];

const now = Date.now();

interface SaveNotificationReturn {
  createNotification: (notification: UserNotification) => Promise<void>;
  generateRandomNotifications: (count: number) => Promise<void>;
}

export const useSaveNotification = (): SaveNotificationReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;


  const notifications = useShape(UserNotificationShapeType);
  const [contactIDs, setContactIDs] = useState<string[]>([]);

  console.log(notifications);

  useEffect(() => {
    nextgraphDataService.getContactIDs(session).then(contactIDsResult => {
      const bindings: any[] = contactIDsResult?.results?.bindings ?? [];
      setContactIDs(bindings.map(
        (binding) => binding.contactUri.value
      ));
    });
  }, [session]);


  const typePool: string[] = getNotificationDictValues("notificationType");
  const statusPool: string[] = getNotificationDictValues("notificationStatus");

  const createNotification = useCallback(async (notification: NotificationWithoutMeta) => {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const docId = await session.ng.doc_create(
      session.sessionId,
      "Graph",
      "data:graph",
      "store"
    );

    const id = getShortUri(docId);
    const notificationObj: UserNotification = {
      "@graph": docId,
      "@id": id,
      "@type": "did:ng:x:social:notification#Notification",
      ...notification
    }

    notifications?.add(notificationObj);
  }, [notifications, session]);

  const generateRandomNotifications = useCallback(
    async (count: number = 10) => {

      for (let i = 0; i < count; i++) {
        const createdAt = new Date(
          now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7) // last 7 days
        ).toISOString();

        const notification: NotificationWithoutMeta = {
          date: createdAt,
          body: getRandom(bodyPool),
          type: ("did:ng:x:social:notification:type#" + getRandom(typePool)) as UserNotification["type"],
          status: ("did:ng:x:social:notification:status#"  + getRandom(statusPool)) as UserNotification["status"],
          seen: false,
          hidden: false,
          subject: getRandom(contactIDs),
        };

        await createNotification(notification);
      }
    },
    [contactIDs, createNotification, statusPool, typePool],
  );

  return {
    createNotification,
    generateRandomNotifications,
  }
}