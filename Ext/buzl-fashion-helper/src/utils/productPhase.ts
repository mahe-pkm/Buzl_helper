import type { Product } from "../types";

export const getProductPhase = (product: Product): "none" | "generation" | "qc" | "finished" => {
  if (product.current_phase === "generation" || product.current_phase === "qc" || product.current_phase === "finished") {
    return product.current_phase;
  }

  const actions = (product.actionLogs || []).map((log) => log.action);
  if (actions.includes("finish")) return "finished";
  if (actions.includes("generation_complete") || actions.includes("qc_correction_start") || actions.includes("qc_done")) return "qc";
  if (actions.includes("generation_start")) return "generation";
  return "none";
};
