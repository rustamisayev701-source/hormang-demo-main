/**
 * feedback-store.ts
 * User feedback (problems/complaints/suggestions) — submitted/reviewed
 * against the real backend (requireAuth for submission, admin-key for
 * review), so a report filed by a user reaches every admin/device.
 */
import { apiFetch } from "@/lib/api-client";
import { adminFetch } from "@/lib/admin-client";

export type FeedbackType     = "problem" | "complaint" | "suggestion";
export type FeedbackStatus   = "new" | "in_review" | "resolved" | "rejected";
export type FeedbackPriority = "low" | "medium" | "high";
export type UserRole         = "customer" | "provider";

export interface Feedback {
  id: string;
  userId: string;
  userRole: UserRole;
  type: FeedbackType;
  title: string;
  description: string;
  targetType?: "provider" | "customer" | "platform";
  targetId?: string;
  problemArea?: "chat" | "request" | "payment" | "other";
  suggestionCategory?: "ux" | "features" | "payments";
  relatedRequestId?: string;
  attachments: string[];
  status: FeedbackStatus;
  priority: FeedbackPriority;
  adminNote?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAllFeedbacks(): Promise<Feedback[]> {
  const { feedbacks } = await adminFetch<{ feedbacks: Feedback[] }>("/feedback/admin");
  return feedbacks;
}

export async function getFeedbacksByUser(): Promise<Feedback[]> {
  const { feedbacks } = await apiFetch<{ feedbacks: Feedback[] }>("/feedback/mine");
  return feedbacks;
}

export async function saveFeedback(
  data: Omit<Feedback, "id" | "createdAt" | "updatedAt" | "status" | "priority">,
): Promise<Feedback> {
  const { feedback } = await apiFetch<{ feedback: Feedback }>("/feedback", { method: "POST", body: data });
  return feedback;
}

export async function updateFeedback(
  id: string,
  updates: Partial<Pick<Feedback, "status" | "priority" | "adminNote" | "rejectionReason">>,
): Promise<Feedback> {
  const { feedback } = await adminFetch<{ feedback: Feedback }>(`/feedback/admin/${id}`, {
    method: "PATCH",
    body: updates,
  });
  return feedback;
}
