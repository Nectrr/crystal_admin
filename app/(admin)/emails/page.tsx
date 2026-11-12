"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ApiError } from "@/lib/api/client";
import {
  createGlobalBroadcast,
  getGlobalAudience,
  listGlobalBroadcasts,
  retryGlobalBroadcast,
  sendTestGlobalBroadcast,
  type AudienceCounts,
  type AudienceKey,
  type Broadcast,
} from "@/lib/api/broadcasts";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth } from "@/app/providers/AuthProvider";

const GROUPS: { key: AudienceKey; label: string; hint: string }[] = [
  { key: "ticket_buyers", label: "Ticket buyers", hint: "Anyone with a paid ticket order" },
  { key: "registrations", label: "Registrations", hint: "Show and tour sign-ups" },
  { key: "newsletter", label: "Newsletter subscribers", hint: "Signed up to the newsletter" },
  { key: "merch", label: "Merch customers", hint: "Anyone with a paid merch order" },
  { key: "contacts", label: "Contact form", hint: "People who sent a message through the site" },
];

const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.key, g.label])) as Record<string, string>;

function isBlank(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

/**
 * Email everyone in the database: the admin picks which groups to include,
 * each address gets one copy, and every email carries an unsubscribe link.
 */
export default function EmailEveryonePage() {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [audience, setAudience] = useState<AudienceKey[]>(GROUPS.map((g) => g.key));
  const [counts, setCounts] = useState<AudienceCounts | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [testEmail, setTestEmail] = useState(user?.email ?? "");
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[] | null>(null);

  useEffect(() => {
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [user, testEmail]);

  useEffect(() => {
    setCounts(null);
    getGlobalAudience(audience)
      .then(setCounts)
      .catch(() => setCounts({ sources: {} as AudienceCounts["sources"], total: 0, unsubscribed: 0 }));
  }, [audience]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listGlobalBroadcasts());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load sent emails.");
      setHistory([]);
    }
  }, [showError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!history?.some((b) => b.pending_count > 0)) return;
    const t = window.setInterval(loadHistory, 10000);
    return () => window.clearInterval(t);
  }, [history, loadHistory]);

  const total = counts?.total ?? null;
  const valid = subject.trim() !== "" && !isBlank(body) && audience.length > 0;
  const input = () => ({ audience, subject: subject.trim(), body_html: body });

  function toggle(key: AudienceKey) {
    setAudience((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));
  }

  async function handleTest() {
    setTesting(true);
    try {
      await sendTestGlobalBroadcast({ ...input(), email: testEmail.trim() });
      showSuccess(`Test email sent to ${testEmail.trim()}.`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send test email.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const b = await createGlobalBroadcast(input());
      showSuccess(`Queued for ${b.recipient_count} ${b.recipient_count === 1 ? "person" : "people"}.`);
      setConfirmOpen(false);
      setSubject("");
      setBody("");
      setEditorKey((k) => k + 1);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  async function handleRetry(b: Broadcast) {
    try {
      const res = await retryGlobalBroadcast(b.id);
      showSuccess(`Retrying ${res.requeued} failed email${res.requeued === 1 ? "" : "s"}.`);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to retry.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Email Everyone"
        description="Send one email to everyone in the database. Each address gets one copy, with an unsubscribe link."
      />

      <section className="flex flex-col gap-4 rounded-xl border border-[#EDEAE0] bg-white p-5">
        <div>
          <h3 className="mb-2 text-sm font-medium text-[#4A4A3C]">Send to</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((g) => (
              <label
                key={g.key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
                  audience.includes(g.key) ? "border-[#B8952F] bg-[#FDF8EC]" : "border-[#EDEAE0]"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-[#B8952F]"
                  checked={audience.includes(g.key)}
                  onChange={() => toggle(g.key)}
                />
                <span>
                  <span className="block text-sm font-medium text-[#4A4A3C]">
                    {g.label}{" "}
                    <span className="font-normal text-[#8C8C78]">({counts?.sources?.[g.key] ?? "…"})</span>
                  </span>
                  <span className="block text-xs text-[#8C8C78]">{g.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-[#4A4A3C]">
            <Users className="h-4 w-4 text-[#B8952F]" />
            {total === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <strong>{total}</strong> unique {total === 1 ? "person" : "people"}
              </>
            )}
            {!!counts?.unsubscribed && (
              <span className="text-[#8C8C78]">· {counts.unsubscribed} unsubscribed, left out</span>
            )}
          </p>
        </div>

        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <RichTextEditor key={editorKey} label="Message" value={body} onChange={setBody} />
        <p className="-mt-2 text-xs text-[#8C8C78]">
          Starts with &ldquo;Hi &lt;first name&gt;,&rdquo; (or &ldquo;Hi there,&rdquo; when we don&rsquo;t have a
          name) and uses the CrystalCity email design.
        </p>

        <div className="flex flex-wrap items-end gap-3 border-t border-[#EDEAE0] pt-4">
          <Input
            label="Send a test to"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button
            type="button"
            variant="secondary"
            loading={testing}
            disabled={!valid || !testEmail.includes("@")}
            onClick={handleTest}
          >
            Send test
          </Button>
          <Button type="button" className="ml-auto" disabled={!valid || !total} onClick={() => setConfirmOpen(true)}>
            <Send className="h-4 w-4" />
            Send to {total ?? "…"} {total === 1 ? "person" : "people"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-semibold text-[#4A4A3C]">Sent emails</h3>
        {history === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
        ) : history.length === 0 ? (
          <p className="text-sm text-[#8C8C78]">No site-wide emails sent yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EDEAE0] bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#4A4A3C]">{b.subject}</p>
                  <p className="text-xs text-[#8C8C78]">
                    {(b.audience ?? "")
                      .split(",")
                      .filter(Boolean)
                      .map((k) => GROUP_LABEL[k] ?? k)
                      .join(", ")}{" "}
                    · {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="green">
                    {b.sent_count}/{b.recipient_count} sent
                  </Badge>
                  {b.pending_count > 0 && <Badge color="gold">{b.pending_count} sending</Badge>}
                  {b.failed_count > 0 && (
                    <>
                      <Badge color="red">{b.failed_count} failed</Badge>
                      <button
                        onClick={() => handleRetry(b)}
                        className="flex items-center gap-1 text-xs font-medium text-[#B8952F]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Retry
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Email everyone"
        message={`Send "${subject.trim()}" to ${total} ${total === 1 ? "person" : "people"} (${audience
          .map((k) => GROUP_LABEL[k])
          .join(", ")})? This can't be undone.`}
        confirmLabel="Send"
        danger={false}
        loading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
