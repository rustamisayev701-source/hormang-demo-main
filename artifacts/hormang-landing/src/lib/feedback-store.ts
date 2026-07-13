import { emitStoreChange } from "@/lib/store-events";

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

const FEEDBACK_KEY = "hormang_feedbacks";

function readFeedbacks(): Feedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as Feedback[]) : [];
  } catch {
    return [];
  }
}

function writeFeedbacks(feedbacks: Feedback[]) {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
  } catch {
    const slim = feedbacks.map(f => ({ ...f, attachments: [] }));
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(slim));
  }
  emitStoreChange();
}

export function getAllFeedbacks(): Feedback[] {
  return readFeedbacks().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getFeedbacksByUser(userId: string): Feedback[] {
  return readFeedbacks()
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveFeedback(
  data: Omit<Feedback, "id" | "createdAt" | "updatedAt" | "status" | "priority">,
): Feedback {
  const now   = new Date().toISOString();
  const entry: Feedback = {
    ...data,
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    status:   "new",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
  };
  writeFeedbacks([entry, ...readFeedbacks()]);
  return entry;
}

export function updateFeedback(
  id: string,
  updates: Partial<Pick<Feedback, "status" | "priority" | "adminNote" | "rejectionReason">>,
): void {
  const all = readFeedbacks();
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  writeFeedbacks(all);
}
