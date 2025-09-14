import { describe, it, expect } from "vitest";

describe("Websocket Trivial", () => {
  it("is trivial", () => {
    expect(true).toBe(true);
  });
});

// import type { WebSocket, Event, ErrorEvent } from "ws";
// import { Websocket2023NotificationSubscription } from "../src/notifications/Websocket2023NotificationSubscription.js";
// import type { SolidLdoDatasetContext } from "../src/index.js";
// import { Leaf } from "../src/index.js";
// import type { NotificationChannel } from "@solid-notifications/types";

// describe("Websocket2023NotificationSubscription", () => {
//   it("returns an error when websockets have an error", async () => {
//     const WebSocketMock: WebSocket = {} as WebSocket;

//     const subscription = new Websocket2023NotificationSubscription(
//       new Leaf("https://example.com", {
//         fetch,
//       } as unknown as SolidLdoDatasetContext),
//       () => {},
//       {} as unknown as SolidLdoDatasetContext,
//       () => WebSocketMock,
//     );

//     const subPromise = subscription.subscribeToWebsocket({
//       receiveFrom: "http://example.com",
//     } as unknown as NotificationChannel);
//     WebSocketMock.onopen?.({} as Event);

//     await subPromise;

//     WebSocketMock.onerror?.({ error: new Error("Test Error") } as ErrorEvent);
//   });

//   it("returns an error when websockets have an error at the beginning", async () => {
//     const WebSocketMock: WebSocket = {} as WebSocket;

//     const subscription = new Websocket2023NotificationSubscription(
//       new Leaf("https://example.com", {
//         fetch,
//       } as unknown as SolidLdoDatasetContext),
//       () => {},
//       {} as unknown as SolidLdoDatasetContext,
//       () => WebSocketMock,
//     );

//     const subPromise = subscription.subscribeToWebsocket({
//       receiveFrom: "http://example.com",
//     } as unknown as NotificationChannel);
//     WebSocketMock.onerror?.({ error: new Error("Test Error") } as ErrorEvent);
//     await subPromise;
//   });
// });
