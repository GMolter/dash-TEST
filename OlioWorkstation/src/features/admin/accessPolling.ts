export type AdminAccessSnapshot = { canAccessAdmin: boolean; accountStatus: string; userId: string; appOwner: boolean; preset: string; permissions: string[]; accessVersion: string };
export class AccessCheckError extends Error {
  constructor(public status: number, public accountStatus = 'active') { super('Access verification failed'); }
}
// One controller per mounted shell. A generation boundary discards every old-session response.
export function startAccessPolling(options: {
  load: (signal: AbortSignal) => Promise<AdminAccessSnapshot>;
  changed: (snapshot: AdminAccessSnapshot) => void;
  health: (available: boolean) => void;
  denied: (error: AccessCheckError) => void;
}) {
  let stopped = false, inFlight = false, version: string | undefined;
  const abort = new AbortController();
  async function check() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const snapshot = await options.load(abort.signal);
      if (stopped) return;
      if (!snapshot.canAccessAdmin) throw new AccessCheckError(403, snapshot.accountStatus);
      options.health(true);
      if (snapshot.accessVersion !== version) { version = snapshot.accessVersion; options.changed(snapshot); }
    } catch (error) {
      if (stopped) return;
      if (error instanceof AccessCheckError && [401, 403, 404].includes(error.status)) { stop(); options.denied(error); }
      else options.health(false);
    } finally { inFlight = false; }
  }
  const timer = setInterval(() => { void check(); }, 20_000);
  function stop() { stopped = true; abort.abort(); clearInterval(timer); }
  void check();
  return { check, stop };
}
