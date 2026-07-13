/**
 * offer-cost.ts
 * Centralized Tanga cost calculation for provider offers.
 *
 * Rules:
 *  - Base cost = category.baseCost (default 0)
 *  - Per-option cost = sum of tangaCost for every selected option
 *    across all active questions (including conditional branches)
 *  - Multi-select: add cost of every selected option
 *  - Single-select: add cost of the selected option
 *  - Minimum total = 2 Tanga
 *
 * This function is future-proof: it uses collectActiveQuestions which
 * already handles arbitrarily deep conditional branching.
 */

import {
  getAllQuestionsForCategory,
  collectActiveQuestions,
  getCategoryById,
} from "./questionnaire-store";

export const MINIMUM_OFFER_COST = 2;

export function calculateOfferCost(request: {
  categoryId: string;
  answers?: Record<string, unknown>;
}): number {
  const category = getCategoryById(request.categoryId);
  const baseCost = category?.baseCost ?? 0;

  const answers = (request.answers ?? {}) as Record<string, unknown>;
  const allQuestions = getAllQuestionsForCategory(request.categoryId);
  const activeQuestions = collectActiveQuestions(allQuestions, answers);

  let optionsCost = 0;

  for (const q of activeQuestions) {
    if (q.type === "single-select") {
      const selectedVal = answers[q.id] as string | undefined;
      if (selectedVal) {
        const opt = q.options?.find((o) => o.value === selectedVal);
        optionsCost += opt?.tangaCost ?? 0;
      }
    } else if (q.type === "multi-select") {
      const selectedVals = (answers[q.id] as string[] | undefined) ?? [];
      for (const val of selectedVals) {
        const opt = q.options?.find((o) => o.value === val);
        optionsCost += opt?.tangaCost ?? 0;
      }
    }
  }

  const total = baseCost + optionsCost;
  return Math.max(total, MINIMUM_OFFER_COST);
}
