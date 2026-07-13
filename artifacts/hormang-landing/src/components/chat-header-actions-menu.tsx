/**
 * ChatHeaderActionsMenu — Reusable ⋯ dropdown for chat headers.
 *
 * Wires actions: View Profile · Details · Report · Block/Unblock · Clear Chat.
 *
 * Block/unblock state is read live from report-store, so any change made here
 * is instantly reflected in PublicProfilePreviewModal (and vice-versa) — both
 * read the same source of truth and re-render via useStoreRefresh().
 */
import { useEffect, useRef, useState } from "react";
import { MoreVertical, User, FileText, Flag, Ban, LockOpen, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { isBlockedBy, blockUser, unblockUser } from "@/lib/report-store";
import { useToast } from "@/hooks/use-toast";

export interface ChatHeaderActionsMenuProps {
  otherUserId:    string;
  otherUserName:  string;
  onViewProfile:  () => void;
  onViewDetails:  () => void;
  onReport:       () => void;
  onClearChat:    () => void;
}

export function ChatHeaderActionsMenu({
  otherUserId,
  otherUserName,
  onViewProfile,
  onViewDetails,
  onReport,
  onClearChat,
}: ChatHeaderActionsMenuProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const tt = t.chatPage;
  useStoreRefresh();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const blocked = user ? isBlockedBy(user.id, otherUserId) : false;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggleBlock() {
    if (!user) return;
    if (blocked) {
      unblockUser(user.id, otherUserId);
      toast({ title: tt.unblockedToast.replace("{{name}}", otherUserName) });
    } else {
      blockUser(user.id, otherUserId);
      toast({ title: tt.blockedToast.replace("{{name}}", otherUserName) });
    }
    setOpen(false);
  }

  function wrap(fn: () => void) {
    return () => { setOpen(false); fn(); };
  }

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title={tt.menuTitle}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-30 w-60 rounded-xl bg-white border border-gray-100 py-1.5 overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(15,15,30,0.14)" }}
        >
          <MenuItem icon={User}      label={tt.menuViewProfile} onClick={wrap(onViewProfile)} />
          <MenuItem icon={FileText}  label={tt.menuDetails}     onClick={wrap(onViewDetails)} />

          <div className="my-1 h-px bg-gray-100" />

          <MenuItem icon={Flag}      label={tt.menuReport}      onClick={wrap(onReport)} danger />
          <MenuItem
            icon={blocked ? LockOpen : Ban}
            label={blocked ? tt.menuUnblock : tt.menuBlock}
            onClick={handleToggleBlock}
            danger={!blocked}
          />

          <div className="my-1 h-px bg-gray-100" />

          <MenuItem icon={Trash2}    label={tt.menuClearChat}   onClick={wrap(onClearChat)} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-gray-50 ${
        danger ? "text-red-600" : "text-gray-700"
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${danger ? "text-red-500" : "text-gray-400"}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}
