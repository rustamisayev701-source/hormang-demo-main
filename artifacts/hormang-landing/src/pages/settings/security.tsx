import { useState } from "react";
import { Phone, Mail, Shield, Trash2, Lock, Check, AlertTriangle, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { tFormat, getAuthError } from "@/lib/i18n";
import { SettingsPageShell } from "@/components/settings/page-shell";
import { Section } from "@/components/settings/section";
import { SettingsRow } from "@/components/settings/settings-row";
import { BottomSheet } from "@/components/settings/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  startEmailRegistration,
  verifyEmailRegistration,
  startChangeEmail,
  verifyChangeEmail,
  startChangePhone,
  verifyChangePhone,
  setup2FA,
  disable2FA,
  startDeleteAccount,
  confirmDeleteAccount,
  cancelDeleteAccount,
  cancelPendingEmail,
  cancelPendingPhone,
  isStrongPassword,
} from "@/lib/auth-client";

type FlowKey =
  | "register-email"
  | "change-email"
  | "change-phone"
  | "enable-2fa"
  | "disable-2fa"
  | "delete-account"
  | null;

export default function SecuritySettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useI18n();

  const [flow, setFlow] = useState<FlowKey>(null);

  const phoneVerified = !!user?.phone;
  const emailVerified = !!user?.emailVerified;
  const twoFAEnabled = !!user?.twoFactorEnabled;

  const score = (phoneVerified ? 1 : 0) + (emailVerified ? 1 : 0) + (twoFAEnabled ? 1 : 0);
  const level = score >= 3 ? "high" : score === 2 ? "medium" : "low";
  const levelLabel =
    level === "high" ? t.security.statusCard.high : level === "medium" ? t.security.statusCard.medium : t.security.statusCard.low;

  const levelGradient =
    level === "high"
      ? "from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700"
      : level === "medium"
        ? "from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600"
        : "from-rose-500 to-red-500 dark:from-rose-600 dark:to-red-600";

  function close() { setFlow(null); }

  return (
    <SettingsPageShell title={t.security.title} subtitle={t.security.subtitle}>
      <div className={`bg-gradient-to-br ${levelGradient} rounded-2xl p-5 shadow-sm text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-white/80">
              {t.security.statusCard.level}
            </p>
            <p className="text-2xl font-extrabold mt-0.5">{levelLabel}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${i <= score ? "bg-white" : "bg-white/25"}`}
            />
          ))}
        </div>
        <div className="mt-4 space-y-1.5">
          <StatusLine label={t.security.rows.phone.title} ok={phoneVerified} okLabel={t.security.rows.phone.verified} />
          <StatusLine label={t.security.rows.email.title} ok={emailVerified} okLabel={t.security.rows.phone.verified} />
          <StatusLine label={t.security.rows.twoFA.title} ok={twoFAEnabled} okLabel={t.common.enabled} />
        </div>
      </div>

      <Section>
        <SettingsRow
          icon={Phone}
          iconBg="hsl(160, 60%, 95%)"
          iconColor="hsl(160, 60%, 38%)"
          title={t.security.rows.phone.change}
          desc={user?.phone ?? "—"}
          onClick={emailVerified ? () => setFlow("change-phone") : undefined}
          disabled={!emailVerified}
        />
        {!emailVerified && (
          <div className="px-4 py-2.5 bg-amber-50/40 dark:bg-amber-950/20 border-t border-amber-100/50 dark:border-amber-900/30">
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
              ⓘ {t.security.rows.changePhone.needsEmail}
            </p>
          </div>
        )}
        <SettingsRow
          icon={Mail}
          iconBg="hsl(213, 100%, 96%)"
          iconColor="hsl(221, 78%, 48%)"
          title={emailVerified ? t.security.rows.email.change : t.security.rows.email.register}
          desc={emailVerified ? (user?.email ?? "") : t.security.rows.email.desc}
          onClick={() => setFlow(emailVerified ? "change-email" : "register-email")}
        />
        <SettingsRow
          icon={Lock}
          iconBg="hsl(262, 80%, 96%)"
          iconColor="hsl(262, 80%, 54%)"
          title={t.security.rows.twoFA.title}
          desc={twoFAEnabled ? t.common.enabled : t.security.rows.twoFA.desc}
          onClick={() => setFlow(twoFAEnabled ? "disable-2fa" : "enable-2fa")}
        />
      </Section>

      <Section title={t.security.dangerZone} tone="danger">
        <SettingsRow
          icon={Trash2}
          iconBg="hsl(0, 84%, 95%)"
          iconColor="hsl(0, 84%, 48%)"
          title={t.security.rows.deleteAccount.title}
          desc={t.security.rows.deleteAccount.desc}
          onClick={() => setFlow("delete-account")}
          tone="danger"
        />
      </Section>

      <BottomSheet open={flow === "register-email"} onClose={close} title={t.security.flows.registerEmail.title} subtitle={t.security.flows.registerEmail.subtitle}>
        <RegisterEmailFlow onDone={async () => { await refreshUser(); close(); }} />
      </BottomSheet>

      <BottomSheet open={flow === "change-email"} onClose={close} title={t.security.flows.changeEmail.title} subtitle={t.security.flows.changeEmail.subtitle}>
        <ChangeEmailFlow onDone={async () => { await refreshUser(); close(); }} />
      </BottomSheet>

      <BottomSheet open={flow === "change-phone"} onClose={close} title={t.security.flows.changePhone.title} subtitle={t.security.flows.changePhone.subtitle}>
        <ChangePhoneFlow onDone={async () => { await refreshUser(); close(); }} />
      </BottomSheet>

      <BottomSheet open={flow === "enable-2fa"} onClose={close} title={t.security.flows.enable2FA.title} subtitle={t.security.flows.enable2FA.subtitle}>
        <Enable2FAFlow onDone={async () => { await refreshUser(); close(); }} />
      </BottomSheet>

      <BottomSheet open={flow === "disable-2fa"} onClose={close} title={t.security.flows.disable2FA.title} subtitle={t.security.flows.disable2FA.subtitle}>
        <Disable2FAFlow onDone={async () => { await refreshUser(); close(); }} />
      </BottomSheet>

      <BottomSheet open={flow === "delete-account"} onClose={close} title={t.security.flows.deleteAccount.title} subtitle={t.security.flows.deleteAccount.subtitle}>
        <DeleteAccountFlow onCancel={async () => { try { await cancelDeleteAccount(); } catch {} await refreshUser(); close(); }} onDeleted={async () => { await logout(); close(); }} />
      </BottomSheet>
    </SettingsPageShell>
  );
}

function StatusLine({ label, ok, okLabel }: { label: string; ok: boolean; okLabel: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-white/85">{label}</span>
      <span className="flex items-center gap-1 font-semibold">
        {ok ? (
          <>
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            {okLabel}
          </>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="opacity-80">—</span>
          </>
        )}
      </span>
    </div>
  );
}

/* ─── Shared primitives ──────────────────────────────────────────────── */

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-3 py-2">
      {msg}
    </div>
  );
}

function DevCodeBanner({ code }: { code: string | null }) {
  const { t } = useI18n();
  if (!code) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-xl px-3 py-2">
      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">{t.common.demoSmsTitle}</p>
      <p className="text-amber-900 dark:text-amber-200 font-bold text-base tracking-[0.3em]">{code}</p>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? "" : undefined}
        className="w-full h-11 pl-3 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function OtpInput({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      placeholder="000000"
      maxLength={6}
      data-autofocus=""
      className="w-full h-14 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-2xl font-bold tracking-[0.4em] text-center"
    />
  );
}

function PrimaryButton({ loading, disabled, onClick, children }: { loading?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button onClick={onClick} disabled={loading || disabled} className="w-full h-11 font-bold text-sm gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function ResendButton({ onResend, disabled }: { onResend: () => Promise<void>; disabled?: boolean }) {
  const { t } = useI18n();
  const [timer, setTimer] = useState(0);
  function startTimer() {
    setTimer(60);
    const id = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) { clearInterval(id); return 0; }
        return p - 1;
      });
    }, 1000);
  }
  return (
    <button
      type="button"
      disabled={disabled || timer > 0}
      onClick={async () => { await onResend(); startTimer(); }}
      className="text-sm text-primary hover:underline flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline transition-all"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      {timer > 0 ? `${timer}s` : t.common.resend}
    </button>
  );
}

/* ─── Flow components ────────────────────────────────────────────────── */

function RegisterEmailFlow({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError("");
    if (!isStrongPassword(password)) { setError(t.security.flows.registerEmail.passwordHint); return; }
    if (password !== confirmPassword) { setError(t.common.errorGeneric); return; }
    setLoading(true);
    try {
      const res = await startEmailRegistration({ email, password, confirmPassword });
      setDevCode(res.devCode ?? null);
      setStep("verify");
    } catch (e) {
      setError(getAuthError(e instanceof Error ? e.message : "", t));
    } finally { setLoading(false); }
  }
  async function verify() {
    setError("");
    setLoading(true);
    try {
      await verifyEmailRegistration(otp);
      toast({ title: t.security.flows.registerEmail.success });
      await onDone();
    } catch (e) {
      setError(getAuthError(e instanceof Error ? e.message : "", t));
    } finally { setLoading(false); }
  }
  async function resend() {
    setError("");
    try {
      const res = await startEmailRegistration({ email, password, confirmPassword });
      setDevCode(res.devCode ?? null);
      toast({ title: t.common.newCodeSent });
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
  }

  if (step === "form") {
    return (
      <div className="space-y-3">
        <ErrorBanner msg={error} />
        <Field label={t.security.flows.registerEmail.emailLabel}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus data-autofocus="" className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        </Field>
        <Field label={t.security.flows.registerEmail.passwordLabel} hint={t.security.flows.registerEmail.passwordHint}>
          <PasswordInput value={password} onChange={setPassword} />
        </Field>
        <Field label={t.security.flows.registerEmail.confirmPasswordLabel}>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
        </Field>
        <PrimaryButton loading={loading} onClick={send}>{t.security.flows.registerEmail.sendCode}</PrimaryButton>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tFormat(t.security.flows.registerEmail.verifySubtitleTpl, { email })}</p>
      <DevCodeBanner code={devCode} />
      <ErrorBanner msg={error} />
      <OtpInput value={otp} onChange={setOtp} onEnter={verify} />
      <PrimaryButton loading={loading} disabled={otp.length < 6} onClick={verify}>{t.security.flows.registerEmail.confirm}</PrimaryButton>
      <div className="flex justify-end"><ResendButton onResend={resend} /></div>
    </div>
  );
}

function ChangeEmailFlow({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError(""); setLoading(true);
    try {
      const res = await startChangeEmail({ currentPassword, newEmail });
      setDevCode(res.devCode ?? null);
      setStep("verify");
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }
  async function verify() {
    setError(""); setLoading(true);
    try {
      await verifyChangeEmail(otp);
      toast({ title: t.security.flows.changeEmail.success });
      await onDone();
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }
  async function resend() {
    try { const res = await startChangeEmail({ currentPassword, newEmail }); setDevCode(res.devCode ?? null); toast({ title: t.common.newCodeSent }); }
    catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
  }

  if (step === "form") {
    return (
      <div className="space-y-3">
        <ErrorBanner msg={error} />
        <Field label={t.security.flows.changeEmail.currentPasswordLabel}>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
        </Field>
        <Field label={t.security.flows.changeEmail.newEmailLabel}>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        </Field>
        <PrimaryButton loading={loading} onClick={send}>{t.security.flows.changeEmail.sendCode}</PrimaryButton>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tFormat(t.security.flows.changeEmail.verifySubtitleTpl, { email: newEmail })}</p>
      <DevCodeBanner code={devCode} />
      <ErrorBanner msg={error} />
      <OtpInput value={otp} onChange={setOtp} onEnter={verify} />
      <PrimaryButton loading={loading} disabled={otp.length < 6} onClick={verify}>{t.security.flows.changeEmail.confirm}</PrimaryButton>
      <div className="flex justify-end"><ResendButton onResend={resend} /></div>
    </div>
  );
}

function ChangePhoneFlow({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fullPhone() { return "+998" + newPhone.replace(/\D/g, ""); }
  async function send() {
    setError(""); setLoading(true);
    try {
      const res = await startChangePhone({ currentPassword, newPhone: fullPhone() });
      setDevCode(res.devCode ?? null);
      setStep("verify");
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }
  async function verify() {
    setError(""); setLoading(true);
    try {
      await verifyChangePhone(otp);
      toast({ title: t.security.flows.changePhone.success });
      await onDone();
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }
  async function resend() {
    try { const res = await startChangePhone({ currentPassword, newPhone: fullPhone() }); setDevCode(res.devCode ?? null); toast({ title: t.common.newCodeSent }); }
    catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
  }

  if (step === "form") {
    return (
      <div className="space-y-3">
        <ErrorBanner msg={error} />
        <Field label={t.security.flows.changePhone.currentPasswordLabel}>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
        </Field>
        <Field label={t.security.flows.changePhone.newPhoneLabel}>
          <div className="flex">
            <span className="h-11 px-3 flex items-center rounded-l-xl border border-r-0 border-border bg-muted text-sm font-semibold text-muted-foreground select-none">+998</span>
            <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="901234567" className="flex-1 h-11 px-3 rounded-r-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
          </div>
        </Field>
        <PrimaryButton loading={loading} onClick={send}>{t.security.flows.changePhone.sendCode}</PrimaryButton>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tFormat(t.security.flows.changePhone.verifySubtitleTpl, { phone: fullPhone() })}</p>
      <DevCodeBanner code={devCode} />
      <ErrorBanner msg={error} />
      <OtpInput value={otp} onChange={setOtp} onEnter={verify} />
      <PrimaryButton loading={loading} disabled={otp.length < 6} onClick={verify}>{t.security.flows.changePhone.confirm}</PrimaryButton>
      <div className="flex justify-end"><ResendButton onResend={resend} /></div>
    </div>
  );
}

function Enable2FAFlow({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"password" | "create">(user?.emailVerified ? "password" : "create");
  const [currentPassword, setCurrentPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function goToCreate() {
    if (!user?.emailVerified) { setStep("create"); return; }
    setError("");
    if (!currentPassword) { setError(t.security.flows.enable2FA.currentPasswordLabel); return; }
    setStep("create");
  }

  async function submit() {
    setError("");
    if (code.length < 4) { setError(t.security.flows.enable2FA.codeTooShort); return; }
    if (code !== confirmCode) { setError(t.security.flows.enable2FA.codeMismatch); return; }
    setLoading(true);
    try {
      await setup2FA({ currentPassword: user?.emailVerified ? currentPassword : undefined, code, hint });
      toast({ title: t.security.flows.enable2FA.success });
      await onDone();
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }

  if (step === "password") {
    return (
      <div className="space-y-3">
        <ErrorBanner msg={error} />
        <Field label={t.security.flows.enable2FA.currentPasswordLabel}>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
        </Field>
        <PrimaryButton loading={false} onClick={goToCreate}>{t.common.next ?? "Next"}</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ErrorBanner msg={error} />
      <Field label={t.security.flows.enable2FA.codeLabel} hint={t.security.flows.enable2FA.codeHint}>
        <PasswordInput value={code} onChange={setCode} placeholder={t.security.flows.enable2FA.codePlaceholder} autoFocus />
      </Field>
      <Field label={t.security.flows.enable2FA.confirmCodeLabel}>
        <PasswordInput value={confirmCode} onChange={setConfirmCode} placeholder={t.security.flows.enable2FA.codePlaceholder} />
      </Field>
      <Field label={t.security.flows.enable2FA.hintLabel} hint={t.security.flows.enable2FA.hintInfo}>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder={t.security.flows.enable2FA.hintPlaceholder}
          maxLength={80}
          className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
      </Field>
      <PrimaryButton loading={loading} disabled={code.length < 4 || confirmCode.length < 4} onClick={submit}>{t.security.flows.enable2FA.confirm}</PrimaryButton>
    </div>
  );
}

function Disable2FAFlow({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError(""); setLoading(true);
    try {
      await disable2FA(currentPassword);
      toast({ title: t.security.flows.disable2FA.success });
      await onDone();
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <ErrorBanner msg={error} />
      <Field label={t.security.flows.disable2FA.currentPasswordLabel}>
        <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
      </Field>
      <Button onClick={submit} disabled={loading} className="w-full h-11 font-bold text-sm gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t.security.flows.disable2FA.confirm}
      </Button>
    </div>
  );
}

function DeleteAccountFlow({ onCancel, onDeleted }: { onCancel: () => void; onDeleted: () => Promise<void> }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError(""); setLoading(true);
    try {
      const res = await startDeleteAccount(currentPassword);
      setDevCode(res.devCode ?? null);
      setDestination(res.destination);
      setStep("verify");
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }
  async function verify() {
    setError("");
    if (confirmText.trim().toUpperCase() !== t.security.flows.deleteAccount.confirmWord.toUpperCase()) {
      setError(t.security.flows.deleteAccount.confirmType);
      return;
    }
    setLoading(true);
    try {
      await confirmDeleteAccount(otp);
      toast({ title: t.security.flows.deleteAccount.success });
      await onDeleted();
    } catch (e) { setError(getAuthError(e instanceof Error ? e.message : "", t)); }
    finally { setLoading(false); }
  }

  if (step === "form") {
    return (
      <div className="space-y-3">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2.5 text-sm text-rose-800 dark:text-rose-200 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{t.security.flows.deleteAccount.warning}</span>
        </div>
        <ErrorBanner msg={error} />
        <Field label={t.security.flows.deleteAccount.currentPasswordLabel}>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoFocus />
        </Field>
        <Button onClick={send} disabled={loading || !currentPassword} className="w-full h-11 font-bold text-sm gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t.security.flows.deleteAccount.sendCode}
        </Button>
        <button type="button" onClick={onCancel} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">{t.common.cancel}</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tFormat(t.security.flows.deleteAccount.verifySubtitleTpl, { phone: destination || (user?.phone ?? "") })}</p>
      <DevCodeBanner code={devCode} />
      <ErrorBanner msg={error} />
      <OtpInput value={otp} onChange={setOtp} />
      <Field label={t.security.flows.deleteAccount.confirmType}>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t.security.flows.deleteAccount.confirmWord} className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:border-destructive" />
      </Field>
      <Button onClick={verify} disabled={loading || otp.length < 6} className="w-full h-11 font-bold text-sm gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t.security.flows.deleteAccount.confirm}
      </Button>
      <button type="button" onClick={onCancel} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">{t.common.cancel}</button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-foreground mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  );
}
