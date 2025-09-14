import { v4 } from "uuid";

export class SuperPromise {
  private unfulfilled: Set<string> = new Set();
  private waitResolve: (() => void) | undefined = undefined;
  private waitReject: ((err: unknown) => void) | undefined = undefined;

  add(): (error?: unknown) => void {
    const id = v4();
    this.unfulfilled.add(id);
    return (error?: unknown) => {
      if (error && this.waitReject) {
        this.waitReject(error);
      }
      this.unfulfilled.delete(id);
      if (this.unfulfilled.size === 0 && this.waitResolve) {
        this.waitResolve();
      }
    };
  }

  async wait(): Promise<void> {
    if (this.unfulfilled.size === 0) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this.waitResolve = resolve;
      this.waitReject = reject;
    });
  }
}
