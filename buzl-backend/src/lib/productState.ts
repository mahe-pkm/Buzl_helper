export type ProductPhase = "none" | "generation" | "qc" | "finished";

export const ACTION_LABELS: Record<string, string> = {
  generation_start: "Image generation started",
  generation_complete: "Image generation finished",
  qc_correction_start: "Moved to QC",
  qc_done: "QC finished",
  finish: "Sent to brand",
  brand_approved: "Brand approved",
  site_uploaded: "Site uploaded",
  regeneration: "Regeneration requested",
};

export const TIMER_ACTION_ORDER = [
  "generation_start",
  "generation_complete",
  "qc_correction_start",
  "qc_done",
  "finish",
] as const;

export const REGEN_ACTION = "regeneration";
export const POST_PROCESS_ACTIONS = ["brand_approved", "site_uploaded"] as const;

export function derivePhaseFromLogs(actions: string[]): ProductPhase {
  const hasFinish = actions.includes("finish") || actions.includes("site_uploaded");
  if (hasFinish) return "finished";

  const hasQcFlow =
    actions.includes("generation_complete") ||
    actions.includes("qc_correction_start") ||
    actions.includes("qc_done");
  if (hasQcFlow) return "qc";

  const hasGenerationFlow =
    actions.includes("generation_start") || actions.includes("generation_complete");
  if (hasGenerationFlow) return "generation";

  return "none";
}

export function derivePhaseFromStatus(status: string): ProductPhase {
  if (status === "completed") return "finished";
  if (status === "in-progress") return "generation";
  return "none";
}
