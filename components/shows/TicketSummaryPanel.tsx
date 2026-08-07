"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { getShowTicketSummary, type ShowTicketSummary } from "@/lib/api/shows";

function formatPrice(pricePence: number) {
  return `£${(pricePence / 100).toFixed(2)}`;
}

function ProgressBar({ sold, total }: { sold: number; total: number | null | undefined }) {
  const pct = total && total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-[#EDEAE0] overflow-hidden">
      <div className="h-full rounded-full bg-[#B8952F]" style={{ width: `${total ? pct : 0}%` }} />
    </div>
  );
}

export function TicketSummaryPanel({ showId }: { showId: string }) {
  const { showError } = useToast();
  const [summary, setSummary] = useState<ShowTicketSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setSummary(await getShowTicketSummary(showId));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load ticket summary.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  if (summary === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
      </div>
    );
  }

  const stopsWithActivity = summary.stops.filter((s) => s.tickets_sold > 0 || s.tiers.length > 0 || s.is_on_sale);
  if (stopsWithActivity.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#EDEAE0] bg-white p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-[#B8952F]" />
          <h3 className="text-sm font-semibold text-[#4A4A3C]">Tickets sold</h3>
        </div>
        <span className="text-sm text-[#8C8C78]">
          {summary.total_sold} sold{summary.total_capacity ? ` of ${summary.total_capacity} total capacity` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {summary.stops.map((stop) => (
          <div key={stop.tour_stop_id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#4A4A3C]">{stop.city_name}</span>
                {!stop.is_on_sale && <Badge color="gray">Not on sale</Badge>}
              </div>
              <span className="text-[#8C8C78]">
                {stop.tickets_sold}
                {stop.capacity != null ? ` / ${stop.capacity}` : ""}
              </span>
            </div>
            <ProgressBar sold={stop.tickets_sold} total={stop.capacity} />

            {stop.tiers.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 pl-3 border-l-2 border-[#EDEAE0]">
                {stop.tiers.map((tier) => (
                  <div key={tier.name} className="flex items-center justify-between text-xs text-[#8C8C78]">
                    <span>
                      {tier.name} <span className="text-[#B8952F]">{formatPrice(tier.price_pence)}</span>
                    </span>
                    <span>
                      {tier.tickets_sold} / {tier.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
