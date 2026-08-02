"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, QrCode, MailCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  listStopAttendees,
  resendOrderEmail,
  sendAllStopTickets,
  type StopAttendee,
  type TicketStatus,
} from "@/lib/api/orders";

interface StopAttendeesModalProps {
  showId: string;
  stopId: string | null;
  stopLabel?: string;
  onClose: () => void;
}

const TICKET_STATUS_COLOR: Record<TicketStatus, "green" | "gold" | "red"> = {
  scanned: "green",
  valid: "gold",
  void: "red",
};

export function StopAttendeesModal({ showId, stopId, stopLabel, onClose }: StopAttendeesModalProps) {
  const { showSuccess, showError } = useToast();
  const [attendees, setAttendees] = useState<StopAttendee[] | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    if (!stopId) {
      setAttendees(null);
      return;
    }
    (async () => {
      try {
        setAttendees(await listStopAttendees(showId, stopId));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load attendees.");
        setAttendees([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId, stopId]);

  async function handleResend(attendee: StopAttendee) {
    setResendingOrderId(attendee.order_id);
    try {
      await resendOrderEmail(attendee.order_id);
      showSuccess(`Ticket email resent to ${attendee.email}.`);
      setAttendees(
        (prev) =>
          prev?.map((a) => (a.order_id === attendee.order_id ? { ...a, email_sent_at: new Date().toISOString() } : a)) ?? prev
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to resend ticket email.");
    } finally {
      setResendingOrderId(null);
    }
  }

  async function handleSendAll() {
    if (!stopId) return;
    setSendingAll(true);
    try {
      const { sent } = await sendAllStopTickets(showId, stopId);
      showSuccess(`Sent ${sent} ticket email${sent === 1 ? "" : "s"} for this tour stop.`);
      setAttendees(
        (prev) => prev?.map((a) => (a.order_status === "paid" ? { ...a, email_sent_at: new Date().toISOString() } : a)) ?? prev
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send ticket emails.");
    } finally {
      setSendingAll(false);
      setSendAllOpen(false);
    }
  }

  const scannedCount = attendees?.filter((a) => a.ticket_status === "scanned").length ?? 0;
  const paidCount = attendees?.filter((a) => a.order_status === "paid").length ?? 0;

  const columns: DataTableColumn<StopAttendee>[] = [
    {
      key: "full_name",
      header: "Name",
      accessor: (a) => a.full_name,
      sortable: true,
      searchable: true,
      className: "font-medium",
      render: (a) => (
        <div className="flex items-center gap-2">
          <span>{a.full_name}</span>
          {a.order_ticket_count > 1 && (
            <Badge color="gold">
              Ticket {a.ticket_number} of {a.order_ticket_count}
            </Badge>
          )}
        </div>
      ),
    },
    { key: "email", header: "Email", accessor: (a) => a.email, sortable: true, searchable: true },
    { key: "ticket_code", header: "Ticket Code", accessor: (a) => a.ticket_code, searchable: true, className: "font-mono text-xs" },
    {
      key: "ticket_status",
      header: "Scan Status",
      accessor: (a) => a.ticket_status,
      sortable: true,
      render: (a) => (
        <Badge color={TICKET_STATUS_COLOR[a.ticket_status]}>
          {a.ticket_status === "scanned" ? "Scanned in" : a.ticket_status === "void" ? "Void" : "Not scanned"}
        </Badge>
      ),
    },
    {
      key: "email_sent_at",
      header: "Email",
      accessor: (a) => (a.email_sent_at ? 1 : 0),
      sortable: true,
      render: (a) => (a.email_sent_at ? <Badge color="green">Sent</Badge> : <Badge color="gray">Not sent</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Button
          variant="secondary"
          className="!px-2 !py-1 text-xs"
          loading={resendingOrderId === a.order_id}
          onClick={() => handleResend(a)}
        >
          <Send className="h-3.5 w-3.5" /> {a.email_sent_at ? "Resend" : "Send"}
        </Button>
      ),
    },
  ];

  return (
    <Modal open={!!stopId} onClose={onClose} title={stopLabel ? `Attendees — ${stopLabel}` : "Attendees"} maxWidth="max-w-4xl">
      {attendees === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
        </div>
      ) : attendees.length === 0 ? (
        <EmptyState message="No paid tickets for this tour stop yet." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-[#8C8C78]">
              <QrCode className="h-4 w-4" />
              {scannedCount} of {attendees.length} tickets scanned in
            </div>
            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setSendAllOpen(true)} disabled={paidCount === 0}>
              <MailCheck className="h-3.5 w-3.5" /> Send all tickets
            </Button>
          </div>
          <DataTable
            columns={columns}
            rows={attendees}
            rowKey={(a) => a.ticket_id}
            searchPlaceholder="Search attendees..."
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      )}

      <ConfirmDialog
        open={sendAllOpen}
        title="Send all tickets"
        message={`Send the ticket email to all ${paidCount} paid attendee${paidCount === 1 ? "" : "s"} for this tour stop? Anyone already emailed will receive it again.`}
        confirmLabel="Send"
        loading={sendingAll}
        onConfirm={handleSendAll}
        onCancel={() => setSendAllOpen(false)}
      />
    </Modal>
  );
}
