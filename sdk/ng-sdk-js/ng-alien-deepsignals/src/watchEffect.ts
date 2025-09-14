import { effect as coreEffect } from "./core";
/** Run a reactive function and re-run on its dependencies; supports cleanup. */
export function watchEffect(
  fn: (registerCleanup?: (cleanup: () => void) => void) => void
) {
  let cleanup: (() => void) | undefined;
  const registerCleanup = (cb: () => void) => {
    cleanup = cb;
  };
  const stop = coreEffect(() => {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* ignore */
      } finally {
        cleanup = undefined;
      }
    }
    fn(registerCleanup);
  });
  return () => {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
    stop();
  };
}
