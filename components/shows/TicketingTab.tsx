"use client";

import { useEffect, useState } from "react";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  getTicketSettings,
  upsertTicketSettings,
  getShowOrders,
  type TicketSettings,
} from "@/lib/api/shows";
import type { Order } from "@/lib/api/orders";

interface TicketingTabProps {
  showId: string;
}

export function TicketingTab({ showId }: TicketingTabProps) {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<TicketSettings | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const [currency, setCurrency] = useState("GBP");
  const [price, setPrice] = useState("0");
  const [fee, setFee] = useState("0");
  const [maxPerOrder, setMaxPerOrder] = useState("10");

  useEffect(() => {
    (async () => {
      try {
        const s = await getTicketSettings(showId);
        setSettings(s);
        setCurrency(s.currency);
        setPrice((s.price_pence / 100).toFixed(2));
        setFee((s.fee_pence / 100).toFixed(2));
        setMaxPerOrder(String(s.max_per_order));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotConfigured(true);
        } else {
          showError(err instanceof ApiError ? err.message : "Failed to load ticket settings.");
        }
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
      try {
        setOrders(await getShowOrders(showId));
      } catch {
        // read-only section, ignore failures silently besides console
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await upsertTicketSettings(showId, {
        currency: currency.toUpperCase(),
        price_pence: Math.round(parseFloat(price || "0") * 100),
        fee_pence: Math.round(parseFloat(fee || "0") * 100),
        max_per_order: Number(maxPerOrder),
      });
      setSettings(updated);
      setNotConfigured(false);
      showSuccess("Ticket settings saved.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save ticket settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const orderColumns: DataTableColumn<Order>[] = [
    { key: "full_name", header: "Name", accessor: (o) => o.full_name, sortable: true, searchable: true },
    {
      key: "email",
      header: "Email",
      accessor: (o) => o.email,
      sortable: true,
      searchable: true,
      render: (o) => <span className="text-[#8C8C78]">{o.email}</span>,
    },
    { key: "quantity", header: "Qty", accessor: (o) => o.quantity, sortable: true },
    {
      key: "total_pence",
      header: "Total",
      accessor: (o) => o.total_pence,
      sortable: true,
      render: (o) => (
        <span>
          {(o.total_pence / 100).toFixed(2)} {o.currency}
        </span>
      ),
    },
    { key: "status", header: "Status", accessor: (o) => o.status, sortable: true, searchable: true },
    {
      key: "created_at",
      header: "Created",
      accessor: (o) => new Date(o.created_at),
      sortable: true,
      render: (o) => <span className="text-[#8C8C78]">{new Date(o.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {notConfigured && !settings && (
        <p className="text-sm text-[#8C8C78]">
          Ticketing isn&apos;t configured for this show yet. Fill out the form below to enable ticket sales.
        </p>
      )}
      <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <Input label="Currency (3-letter)" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input label="Max per order" type="number" min={1} max={50} value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} />
        <FieldWrapper label={`Ticket price (${currency || "—"})`}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C78] text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min={0.01}
              className="w-full rounded-lg border border-[#EDEAE0] bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </FieldWrapper>
        <FieldWrapper label={`Fee (${currency || "—"})`}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C78] text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-lg border border-[#EDEAE0] bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
        </FieldWrapper>
        <p className="sm:col-span-2 text-xs text-[#8C8C78]">
          Sales windows are set per tour stop now — edit them on the Tour Stops tab.
        </p>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={saving}>
            Save ticket settings
          </Button>
        </div>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-2">Orders for this show</h3>
        <DataTable
          columns={orderColumns}
          rows={orders}
          rowKey={(o) => o.id}
          emptyMessage="No orders yet."
          searchPlaceholder="Search orders..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>
    </div>
  );
}
