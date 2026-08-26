import type { Condition } from "@/types/database";

export const conditionLabel: Record<Condition, string> = {
  mint: "mint / sealed",
  opened: "opened",
  loose: "loose figure",
};
