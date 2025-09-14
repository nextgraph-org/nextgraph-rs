export interface NextGraphNotificationMessage {
  V0: {
    State: {
      graph: {
        triples: AllowSharedBufferSource;
      };
    };
    Patch: {
      graph: {
        inserts: AllowSharedBufferSource;
        removes: AllowSharedBufferSource;
      };
    };
  };
}
