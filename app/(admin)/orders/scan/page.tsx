"use client";

import { useState, useEffect, useRef, type FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ScanLine, Search, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { CameraScanner } from "@/components/orders/CameraScanner";
import { ApiError } from "@/lib/api/client";
import { scanTicket, lookupTicket, type ScanResult } from "@/lib/api/orders";

type Result = { ok: true; mode: "scan" | "lookup"; data: ScanResult } | { ok: false; message: string };

function ScanContent() {
  const searchParams = useSearchParams();
  const queryCode = searchParams.get("code");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [code, setCode] = useState(queryCode || "");
  const [loading, setLoading] = useState<"scan" | "lookup" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const autoScanFired = useRef(false);

  const handleAction = async (mode: "scan" | "lookup", targetCode: string = code, e?: FormEvent) => {
    e?.preventDefault();
    const cleanCode = targetCode.trim();
    if (!cleanCode) return;
    setLoading(mode);
    setResult(null);
    try {
      const data = mode === "scan" ? await scanTicket(cleanCode) : await lookupTicket(cleanCode);
      setResult({ ok: true, mode, data });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof ApiError ? err.message : "Request failed. Please try again.",
      });
    } finally {
      setLoading(null);
      setCode("");
    }
  };

  useEffect(() => {
    if (queryCode && !autoScanFired.current) {
      autoScanFired.current = true;
      handleAction("scan", queryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryCode]);

  if (cameraOpen) {
    return <CameraScanner onClose={() => setCameraOpen(false)} />;
  }

  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="Door Scanner" description="Scan or enter a ticket code to check a guest in" />

      <Button onClick={() => setCameraOpen(true)} className="w-full py-5 text-lg mb-6 flex items-center justify-center gap-2">
        <ScanLine className="h-5 w-5" />
        Scan with camera
      </Button>

      <div className="flex items-center gap-3 mb-6 text-xs text-[#8C8C78]">
        <div className="h-px flex-1 bg-[#EDEAE0]" />
        or enter code manually
        <div className="h-px flex-1 bg-[#EDEAE0]" />
      </div>

      <form onSubmit={(e) => handleAction("scan", code, e)} className="flex flex-col gap-3">
        <input
          inputMode="text"
          placeholder="Ticket code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-xl border-2 border-[#EDEAE0] px-4 py-5 text-2xl text-center tracking-wide text-[#4A4A3C] focus:outline-none focus:ring-4 focus:ring-[#B8952F]/30 focus:border-[#B8952F]"
        />
        <div className="flex gap-2">
          <Button type="submit" loading={loading === "scan"} variant="secondary" className="flex-1 py-5 text-lg">
            Check ticket
          </Button>
          <Button
            type="button"
            loading={loading === "lookup"}
            variant="ghost"
            onClick={() => handleAction("lookup", code)}
            className="flex-1 py-5 text-base border border-[#EDEAE0] flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            Look up only
          </Button>
        </div>
        <p className="text-xs text-[#8C8C78] text-center">
          &quot;Look up only&quot; checks a ticket&apos;s status without marking it as scanned — use it if a guest disputes their ticket.
        </p>
      </form>

      {result && (
        <div
          className={`mt-6 rounded-2xl p-6 flex flex-col items-center gap-3 text-center ${
            result.ok ? "bg-green-50 border-2 border-green-300" : "bg-red-50 border-2 border-red-300"
          }`}
        >
          {result.ok ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <p className="text-xl font-semibold text-green-800">
                {result.mode === "lookup" ? "Ticket found" : "Valid ticket"}
              </p>
              <p className="text-base text-green-900">{result.data.attendee_name}</p>
              <p className="text-sm text-green-700">{result.data.attendee_email}</p>
              <div className="flex items-center gap-2">
                <Badge color="green">{result.data.ticket.status}</Badge>
                {result.data.order_ticket_count > 1 && (
                  <Badge color="gold">
                    Ticket {result.data.ticket_number} of {result.data.order_ticket_count}
                  </Badge>
                )}
              </div>
              {result.data.order_ticket_count > 1 && (
                <p className="text-xs text-green-700">
                  This buyer purchased {result.data.order_ticket_count} tickets — expect {result.data.order_ticket_count - 1} more
                  scan{result.data.order_ticket_count - 1 === 1 ? "" : "s"} under the same name.
                </p>
              )}
              {result.mode === "lookup" && (
                <p className="text-xs text-green-700">This ticket was not marked as scanned.</p>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-600" />
              <p className="text-xl font-semibold text-red-800">Invalid ticket</p>
              <p className="text-sm text-red-700">{result.message}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#8C8C78]">Loading scanner...</div>}>
      <ScanContent />
    </Suspense>
  );
}
