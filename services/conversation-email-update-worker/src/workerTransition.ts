export type WorkerTickMode = "disabled" | "kill_switch" | "sending";

export function decideWorkerTickMode({
    enabled,
    killSwitch,
}: {
    enabled: boolean;
    killSwitch: boolean;
}): WorkerTickMode {
    if (killSwitch) return "kill_switch";
    return enabled ? "sending" : "disabled";
}
