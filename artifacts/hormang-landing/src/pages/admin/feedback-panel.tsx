import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, TriangleAlert, Lightbulb, Clock, CheckCircle2,
  X, Check, ChevronDown, Filter, Paperclip, MessageSquare,
  ArrowRight, Eye, ShieldAlert, ExternalLink,
} from "lucide-react";
import {
  getAllFeedbacks, updateFeedback,
  type Feedback, type FeedbackType, type FeedbackStatus, type FeedbackPriority,
} from "@/lib/feedback-store";
import { onStoreChange } from "@/lib/store-events";

/* ── Helpers ─────────────────────────────────────────────────────── */
const UZ_MONTHS = ["Yan","Fev","Mar","Apr","May","Iyun","Iyul","Avg","Sen","Okt","Noy","Dek"];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

/* ── User data ───────────────────────────────────────────────────── */
interface AdminUserData {
  id: string;
  name: string;
  initials: string;
  role: "customer" | "provider";
  phone?: string;
}

function loadAdminUsers(): AdminUserData[] {
  try {
    const raw = localStorage.getItem("hormang_auth_users");
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{
      id: string; firstName?: string; lastName?: string;
      phone?: string | null; role?: string;
    }>;
    return arr.map(u => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Foydalanuvchi";
      const initials = ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || "?";
      return {
        id: u.id,
        name,
        initials,
        role: u.role === "provider" ? "provider" : "customer",
        phone: u.phone ?? undefined,
      } satisfies AdminUserData;
    });
  } catch { return []; }
}

/* ── UserCell ────────────────────────────────────────────────────── */
function UserCell({
  user, fallbackRole, onNavigate,
}: {
  user?: AdminUserData;
  fallbackRole?: string;
  onNavigate?: () => void;
}) {
  const role = user?.role ?? (fallbackRole === "provider" ? "provider" : "customer");
  const roleBg = role === "provider" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700";
  const roleLabel = role === "provider" ? "Ijrochi" : "Mijoz";

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-[11px] font-bold flex-shrink-0">
          ?
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">Noma'lum</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${roleBg}`}>{roleLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onClick={onNavigate}
      onKeyDown={onNavigate ? (e) => { if (e.key === "Enter" || e.key === " ") onNavigate(); } : undefined}
      className={`flex items-center gap-2 text-left group ${onNavigate ? "hover:opacity-80 cursor-pointer" : "cursor-default"} transition-opacity`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${roleBg}`}>
        {user.initials}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold leading-tight truncate ${onNavigate ? "group-hover:text-blue-600 transition-colors text-gray-800" : "text-gray-800"}`}>
          {user.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${roleBg}`}>{roleLabel}</span>
          {onNavigate && <ExternalLink className="w-2.5 h-2.5 text-gray-300 group-hover:text-blue-400 transition-colors" />}
        </div>
      </div>
    </div>
  );
}

/* ── Meta tables ─────────────────────────────────────────────────── */
const TYPE_META: Record<FeedbackType, { emoji: string; label: string; color: string; bg: string }> = {
  problem:    { emoji: "🆘", label: "Muammo",  color: "text-red-600",   bg: "bg-red-50"  },
  complaint:  { emoji: "⚠️", label: "Shikoyat", color: "text-amber-600", bg: "bg-amber-50" },
  suggestion: { emoji: "💡", label: "Taklif",  color: "text-blue-600",  bg: "bg-blue-50" },
};

const STATUS_META: Record<FeedbackStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:       { label: "Yangi",       color: "text-gray-600",  bg: "bg-gray-100",  dot: "bg-gray-400"  },
  in_review: { label: "Ko'rilmoqda", color: "text-blue-600",  bg: "bg-blue-50",   dot: "bg-blue-500"  },
  resolved:  { label: "Hal qilindi", color: "text-green-600", bg: "bg-green-50",  dot: "bg-green-500" },
  rejected:  { label: "Rad etildi",  color: "text-red-600",   bg: "bg-red-50",    dot: "bg-red-500"   },
};

const PRIORITY_META: Record<FeedbackPriority, { label: string; color: string; bg: string }> = {
  low:    { label: "Past",   color: "text-gray-600",  bg: "bg-gray-100"  },
  medium: { label: "O'rta",  color: "text-amber-600", bg: "bg-amber-50"  },
  high:   { label: "Yuqori", color: "text-red-600",   bg: "bg-red-50"    },
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: FeedbackPriority }) {
  const m = PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
}

/* ── Detail Drawer ───────────────────────────────────────────────── */
function FeedbackDrawer({ fb, user, onClose, onUpdate, onNavigateToUser }: {
  fb: Feedback;
  user?: AdminUserData;
  onClose: () => void;
  onUpdate: () => void;
  onNavigateToUser?: (userId: string) => void;
}) {
  const [status, setStatus]     = useState<FeedbackStatus>(fb.status);
  const [priority, setPriority] = useState<FeedbackPriority>(fb.priority);
  const [note, setNote]         = useState(fb.adminNote ?? "");
  const [rejectReason, setRejectReason] = useState(fb.rejectionReason ?? "");
  const [saving, setSaving]     = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  const tm = TYPE_META[fb.type];

  async function save(overrides?: Partial<{ status: FeedbackStatus; priority: FeedbackPriority }>) {
    setSaving(true);
    const next = { ...overrides };
    updateFeedback(fb.id, {
      status:   next.status   ?? status,
      priority: next.priority ?? priority,
      adminNote: note.trim() || undefined,
      rejectionReason: (next.status === "rejected" || status === "rejected") ? rejectReason.trim() || undefined : undefined,
    });
    setSaving(false);
    onUpdate();
  }

  function handleStatusChange(s: FeedbackStatus) {
    if (s === "rejected") {
      setShowRejectInput(true);
      setStatus(s);
    } else {
      setShowRejectInput(false);
      setStatus(s);
      save({ status: s });
    }
  }

  const STATUS_FLOW: FeedbackStatus[] = ["new", "in_review", "resolved", "rejected"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <span className="text-3xl">{tm.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold mb-1 ${tm.color}`}>{tm.label}</p>
            <h2 className="font-extrabold text-gray-900 text-base leading-tight truncate">{fb.title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(fb.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ── User cell ── */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <UserCell
              user={user}
              fallbackRole={fb.userRole}
              onNavigate={user && onNavigateToUser ? () => onNavigateToUser(fb.userId) : undefined}
            />
            {user?.phone && (
              <p className="text-[11px] text-gray-400 ml-auto">{user.phone}</p>
            )}
          </div>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={fb.status} />
            <PriorityBadge priority={fb.priority} />
            {fb.targetType && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                {fb.targetType === "provider" ? "Ijrochi" : fb.targetType === "customer" ? "Mijoz" : "Platforma"}
              </span>
            )}
            {fb.problemArea && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                {fb.problemArea}
              </span>
            )}
            {fb.relatedRequestId && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                So'rov: {fb.relatedRequestId.slice(0, 8)}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Tavsif</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{fb.description}</p>
          </div>

          {/* Attachments */}
          {fb.attachments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Fayllar ({fb.attachments.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {fb.attachments.map((f, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    {f.startsWith("data:image") ? (
                      <img src={f} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Paperclip className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] text-gray-400">Fayl {i + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes */}
          {fb.rejectionReason && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs font-bold text-red-600 mb-1">Rad etish sababi</p>
              <p className="text-xs text-red-700">{fb.rejectionReason}</p>
            </div>
          )}
          {fb.adminNote && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-600 mb-1">Admin izohi</p>
              <p className="text-xs text-blue-700">{fb.adminNote}</p>
            </div>
          )}

          {/* ── Admin actions ── */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Admin amallar</p>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Holat</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_FLOW.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      status === s
                        ? `${STATUS_META[s].bg} ${STATUS_META[s].color} border-current/20`
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reject reason */}
            {showRejectInput && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Rad etish sababi <span className="text-red-500">*</span></p>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Nima uchun rad etildi?"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-100 bg-white text-xs text-gray-700 placeholder:text-gray-400 focus:border-red-300 outline-none resize-none"
                />
              </div>
            )}

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Ustuvorlik</p>
              <div className="flex gap-2">
                {(["low","medium","high"] as FeedbackPriority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriority(p); save({ priority: p }); }}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      priority === p
                        ? `${PRIORITY_META[p].bg} ${PRIORITY_META[p].color} border-current/20`
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin note */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Ichki izoh</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Faqat adminlarga ko'rinadigan izoh..."
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-100 bg-white text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => save()}
            disabled={saving || (showRejectInput && !rejectReason.trim())}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #DC2626, #B91C1C)" }}
          >
            {saving ? "Saqlanmoqda..." : <><Check className="w-4 h-4" /> Saqlash</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────── */
export function FeedbackAdminSection({
  refreshKey,
  filterUserId,
  onNavigateToUser,
}: {
  refreshKey: number;
  filterUserId?: string | null;
  onNavigateToUser?: (userId: string) => void;
}) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [users, setUsers]         = useState<Map<string, AdminUserData>>(new Map());
  const [filterType, setFilterType]         = useState<FeedbackType | "all">("all");
  const [filterStatus, setFilterStatus]     = useState<FeedbackStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<FeedbackPriority | "all">("all");
  const [userFilter, setUserFilter] = useState<string>(filterUserId ?? "");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Feedback | null>(null);

  /* Sync userFilter when filterUserId prop changes */
  useEffect(() => {
    if (filterUserId) setUserFilter(filterUserId);
  }, [filterUserId]);

  function load() {
    setFeedbacks(getAllFeedbacks());
    const loaded = loadAdminUsers();
    setUsers(new Map(loaded.map(u => [u.id, u])));
  }

  useEffect(() => {
    load();
    const unsub = onStoreChange(load);
    return unsub;
  }, [refreshKey]);

  function handleUpdate() {
    load();
    setSelected(s => s ? feedbacks.find(f => f.id === s.id) ?? null : null);
  }

  const filtered = feedbacks.filter(f => {
    if (filterType     !== "all" && f.type     !== filterType)     return false;
    if (filterStatus   !== "all" && f.status   !== filterStatus)   return false;
    if (filterPriority !== "all" && f.priority !== filterPriority) return false;
    if (userFilter) {
      if (f.userId !== userFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const u = users.get(f.userId);
      const inUser = u ? u.name.toLowerCase().includes(q) || (u.phone?.includes(q) ?? false) : false;
      if (!f.title.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q) && !inUser) return false;
    }
    return true;
  });

  const counts = {
    new:       feedbacks.filter(f => f.status === "new").length,
    in_review: feedbacks.filter(f => f.status === "in_review").length,
    resolved:  feedbacks.filter(f => f.status === "resolved").length,
    rejected:  feedbacks.filter(f => f.status === "rejected").length,
  };

  /* Active user filter banner */
  const activeUserFilter = userFilter ? users.get(userFilter) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Takliflar va Shikoyatlar</h2>
        <p className="text-sm text-gray-500 mt-0.5">Foydalanuvchi murojaatlarini ko'ring va boshqaring</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: "Yangi",       val: counts.new,       dot: "bg-gray-400",  bg: "bg-gray-50"  },
          { label: "Ko'rilmoqda", val: counts.in_review, dot: "bg-blue-500",  bg: "bg-blue-50"  },
          { label: "Hal qilindi", val: counts.resolved,  dot: "bg-green-500", bg: "bg-green-50" },
          { label: "Rad etildi",  val: counts.rejected,  dot: "bg-red-500",   bg: "bg-red-50"   },
        ] as const).map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-extrabold text-gray-900 mb-1">{s.val}</p>
            <div className="flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-[11px] font-semibold text-gray-600">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active user filter banner */}
      {activeUserFilter && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${activeUserFilter.role === "provider" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
            {activeUserFilter.initials}
          </div>
          <p className="text-xs font-semibold text-blue-800 flex-1">
            <span className="font-bold">{activeUserFilter.name}</span> — foydalanuvchi bo'yicha filtr
          </p>
          <button
            onClick={() => setUserFilter("")}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            Tozalash <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-600">Filtrlar</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Sarlavha, tavsif yoki ism bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border-2 border-gray-100 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-300 outline-none"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as FeedbackType | "all")}
            className="px-3 py-2 rounded-xl border-2 border-gray-100 text-xs font-semibold text-gray-700 bg-white focus:border-red-300 outline-none"
          >
            <option value="all">Barcha turlar</option>
            <option value="problem">🆘 Muammo</option>
            <option value="complaint">⚠️ Shikoyat</option>
            <option value="suggestion">💡 Taklif</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FeedbackStatus | "all")}
            className="px-3 py-2 rounded-xl border-2 border-gray-100 text-xs font-semibold text-gray-700 bg-white focus:border-red-300 outline-none"
          >
            <option value="all">Barcha holatlar</option>
            <option value="new">Yangi</option>
            <option value="in_review">Ko'rilmoqda</option>
            <option value="resolved">Hal qilindi</option>
            <option value="rejected">Rad etildi</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as FeedbackPriority | "all")}
            className="px-3 py-2 rounded-xl border-2 border-gray-100 text-xs font-semibold text-gray-700 bg-white focus:border-red-300 outline-none"
          >
            <option value="all">Barcha ustuvorlik</option>
            <option value="high">Yuqori</option>
            <option value="medium">O'rta</option>
            <option value="low">Past</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">Murojaatlar topilmadi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              <span>Sarlavha</span>
              <span>Foydalanuvchi</span>
              <span>Tur</span>
              <span>Holat</span>
              <span>Ustuvorlik</span>
              <span />
            </div>

            {filtered.map(fb => {
              const tm   = TYPE_META[fb.type];
              const user = users.get(fb.userId);
              return (
                <button
                  key={fb.id}
                  onClick={() => setSelected(fb)}
                  className="w-full grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{fb.title}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{fmtDate(fb.createdAt)}</p>
                  </div>

                  {/* User cell — click stops propagation and navigates */}
                  <div onClick={e => e.stopPropagation()} className="min-w-0">
                    <UserCell
                      user={user}
                      fallbackRole={fb.userRole}
                      onNavigate={onNavigateToUser ? () => onNavigateToUser(fb.userId) : undefined}
                    />
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${tm.bg} ${tm.color}`}>
                    {tm.emoji} {tm.label}
                  </span>
                  <StatusBadge status={fb.status} />
                  <PriorityBadge priority={fb.priority} />
                  <Eye className="w-4 h-4 text-gray-300" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <FeedbackDrawer
            fb={selected}
            user={users.get(selected.userId)}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            onNavigateToUser={onNavigateToUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
