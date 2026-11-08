"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ApiError } from "@/lib/api/client";
import { getShow, type TourStop } from "@/lib/api/shows";
import {
  countBroadcastRecipients,
  createBroadcast,
  listBroadcasts,
  retryBroadcast,
  sendTestBroadcast,
  type Broadcast,
} from "@/lib/api/broadcasts";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth } from "@/app/providers/AuthProvider";

function isBlank(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

/**
 * Compose a custom email to every paid ticket holder of this show, or of one
 * tour stop. Emails are queued on the server and sent in the background, so
 * the history list below shows live delivery progress.
 */
export function BroadcastTab({ showId }: { showId: string }) {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [stops, setStops] = useState<TourStop[]>([]);
  const [stopId, setStopId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [recipients, setRecipients] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState(user?.email ?? "");
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[] | null>(null);

  useEffect(() => {
    getShow(showId)
      .then((s) => setStops(s.tour_stops ?? []))
      .catch(() => setStops([]));
  }, [showId]);

  useEffect(() => {
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [user, testEmail]);

  useEffect(() => {
    setRecipients(null);
    countBroadcastRecipients(showId, stopId || null)
      .then(setRecipients)
      .catch(() => setRecipients(0));
  }, [showId, stopId]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listBroadcasts(showId));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load sent emails.");
      setHistory([]);
    }
  }, [showId, showError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Poll while anything is still being delivered.
  useEffect(() => {
    if (!history?.some((b) => b.pending_count > 0)) return;
    const t = window.setInterval(loadHistory, 10000);
    return () => window.clearInterval(t);
  }, [history, loadHistory]);

  const input = () => ({ tour_stop_id: stopId || null, subject: subject.trim(), body_html: body });
  const valid = subject.trim() !== "" && !isBlank(body);
  const audience = stopId ? stops.find((s) => s.id === stopId)?.city_name ?? "this stop" : "all tour stops";

  async function handleTest() {
    if (!valid || !testEmail.includes("@")) return;
    setTesting(true);
    try {
      await sendTestBroadcast(showId, { ...input(), email: testEmail.trim() });
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
      const b = await createBroadcast(showId, input());
      showSuccess(`Queued for ${b.recipient_count} ticket holder${b.recipient_count === 1 ? "" : "s"}.`);
      setConfirmOpen(false);
      setSubject("");
      setBody("");
      setEditorKey((k) => k + 1); // remount the editor so it clears
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  async function handleRetry(b: Broadcast) {
    try {
      const res = await retryBroadcast(showId, b.id);
      showSuccess(`Retrying ${res.requeued} failed email${res.requeued === 1 ? "" : "s"}.`);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to retry.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-xl border border-[#EDEAE0] bg-white p-5">
        <div>
          <h3 className="text-base font-semibold text-[#4A4A3C]">Email ticket holders</h3>
          <p className="text-sm text-[#8C8C78]">
            Sends to everyone with a paid order. Each address gets one copy, even with several orders. Emails start
            with &ldquo;Hi &lt;first name&gt;,&rdquo; and use the CrystalCity email design.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Select label="Send to" value={stopId} onChange={(e) => setStopId(e.target.value)}>
            <option value="">All tour stops</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city_name}
                {s.venue_name ? ` — ${s.venue_name}` : ""}
              </option>
            ))}
          </Select>
          <p className="flex items-center gap-1.5 pb-2 text-sm text-[#4A4A3C]">
            <Users className="h-4 w-4 text-[#B8952F]" />
            {recipients === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <strong>{recipients}</strong> recipient{recipients === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>

        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <RichTextEditor key={editorKey} label="Message" value={body} onChange={setBody} />

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
          <Button
            type="button"
            className="ml-auto"
            disabled={!valid || !recipients}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="h-4 w-4" />
            Send to {recipients ?? "…"} ticket holder{recipients === 1 ? "" : "s"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-semibold text-[#4A4A3C]">Sent emails</h3>
        {history === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
        ) : history.length === 0 ? (
          <p className="text-sm text-[#8C8C78]">No emails sent for this show yet.</p>
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
                    {b.tour_stop_name ?? "All tour stops"} · {new Date(b.created_at).toLocaleString()}
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
        title="Send email"
        message={`Send "${subject.trim()}" to ${recipients} ticket holder${recipients === 1 ? "" : "s"} (${audience})? This can't be undone.`}
        confirmLabel="Send"
        danger={false}
        loading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
