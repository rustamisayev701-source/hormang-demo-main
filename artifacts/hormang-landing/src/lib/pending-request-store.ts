/**
 * Holds a finished-but-unsubmitted questionnaire answer set while an
 * anonymous user is sent through registration/login. Consumed once, right
 * after auth succeeds, to actually create the request (see questionnaire.tsx).
 */
import type { Answers } from "@/pages/questionnaire";

const PENDING_REQUEST_KEY = "hormang_pending_request";

export interface PendingRequestSubmission {
  categoryId: string;
  categoryName: string;
  answers: Answers;
  photos?: string[];
}

export function savePendingRequest(submission: PendingRequestSubmission): void {
  sessionStorage.setItem(PENDING_REQUEST_KEY, JSON.stringify(submission));
}

export function getPendingRequest(): PendingRequestSubmission | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REQUEST_KEY);
    return raw ? (JSON.parse(raw) as PendingRequestSubmission) : null;
  } catch {
    return null;
  }
}

export function clearPendingRequest(): void {
  sessionStorage.removeItem(PENDING_REQUEST_KEY);
}
