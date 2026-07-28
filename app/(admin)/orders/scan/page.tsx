"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { CameraScanner } from "@/components/orders/CameraScanner";
import { ApiError } from "@/lib/api/client";
import { scanTicket, type ScanResult } from "@/lib/api/orders";

type Result = { ok: true; data: ScanResult } | { ok: false; message: string };

export default function ScanPage() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await scanTicket(code.trim());
      setResult({ ok: true, data });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof ApiError ? err.message : "Scan failed. Please try again.",
      });
    } finally {
      setLoading(false);
      setCode("");
    }
  }

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          inputMode="text"
          placeholder="Ticket code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-xl border-2 border-[#EDEAE0] px-4 py-5 text-2xl text-center tracking-wide text-[#4A4A3C] focus:outline-none focus:ring-4 focus:ring-[#B8952F]/30 focus:border-[#B8952F]"
        />
        <Button type="submit" loading={loading} variant="secondary" className="w-full py-5 text-lg">
          Check ticket
        </Button>
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
              <p className="text-xl font-semibold text-green-800">Valid ticket</p>
              <p className="text-base text-green-900">{result.data.attendee_name}</p>
              <p className="text-sm text-green-700">{result.data.attendee_email}</p>
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
