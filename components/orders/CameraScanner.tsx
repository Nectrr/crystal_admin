"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ArrowLeft, CheckCircle2, RotateCcw, ScanLine, ShieldAlert, XCircle } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { scanTicket, type ScanResult } from "@/lib/api/orders";

type ScanState =
  | { phase: "starting" }
  | { phase: "ready" }
  | { phase: "scanning" }
  | { phase: "success"; data: ScanResult }
  | { phase: "already_scanned"; message: string }
  | { phase: "not_recognized"; message: string }
  | { phase: "camera_error"; message: string };

export function CameraScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [state, setState] = useState<ScanState>({ phase: "starting" });

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || busyRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      busyRef.current = true;
      setState({ phase: "scanning" });
      handleDetected(code.data);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDetected(ticketCode: string) {
    try {
      const data = await scanTicket(ticketCode);
      stopStream();
      setState({ phase: "success", data });
    } catch (err) {
      stopStream();
      if (err instanceof ApiError && err.status === 409) {
        setState({ phase: "already_scanned", message: err.message });
      } else {
        setState({ phase: "not_recognized", message: err instanceof ApiError ? err.message : "This QR code couldn't be verified." });
      }
    } finally {
      busyRef.current = false;
    }
  }

  const start = useCallback(async () => {
    setState({ phase: "starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState({ phase: "ready" });
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState({
        phase: "camera_error",
        message: "Couldn't access the camera. Check permissions and try again.",
      });
    }
  }, [tick]);

  useEffect(() => {
    start();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scanAnother() {
    start();
  }

  const showLiveFeed = state.phase === "starting" || state.phase === "ready" || state.phase === "scanning";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1A1400] text-[#F0E6C8]">
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => {
            stopStream();
            onClose();
          }}
          aria-label="Back"
          className="rounded-full p-2 text-[#D9C88C] hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B8952F] text-white text-sm font-semibold">
          C
        </div>
        <p className="text-sm font-medium text-[#D9C88C]">Door Scanner</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        {showLiveFeed && (
          <>
            <p className="text-[11px] uppercase tracking-widest text-[#B8952F] mb-2">
              {state.phase === "starting" ? "Ready to scan" : state.phase === "scanning" ? "Scanning" : "Ready to scan"}
            </p>
            <h2 className="text-xl font-semibold mb-1">
              {state.phase === "scanning" ? "Scanning QR code" : "Scan to confirm entry"}
            </h2>
            <p className="text-sm text-[#B8AE7A] mb-6">Hold the QR code steady in the frame</p>

            <div className="relative h-64 w-64 max-w-full overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <ScannerFrame />
            </div>
          </>
        )}

        {state.phase === "camera_error" && (
          <ResultCard
            icon={<ShieldAlert className="h-14 w-14 text-[#E0B94C]" />}
            title="Camera unavailable"
            message={state.message}
            actions={
              <ActionButton onClick={start} icon={<RotateCcw className="h-4 w-4" />}>
                Try again
              </ActionButton>
            }
          />
        )}

        {state.phase === "success" && (
          <ResultCard
            icon={<CheckCircle2 className="h-14 w-14 text-[#8FCB6B]" />}
            eyebrow="Scan completed"
            title="Scan successful"
            subtitle="Entry confirmed"
            rows={[
              ["Attendee", state.data.attendee_name],
              ["Email", state.data.attendee_email],
              ["Ticket status", state.data.ticket.status],
            ]}
            actions={
              <ActionButton onClick={scanAnother} icon={<ScanLine className="h-4 w-4" />}>
                Scan another ticket
              </ActionButton>
            }
          />
        )}

        {state.phase === "already_scanned" && (
          <ResultCard
            icon={<ShieldAlert className="h-14 w-14 text-[#E0B94C]" />}
            eyebrow="Scan completed"
            title="Ticket already scanned"
            subtitle={state.message}
            actions={
              <div className="flex gap-3">
                <ActionButton onClick={scanAnother} icon={<ScanLine className="h-4 w-4" />}>
                  Scan another ticket
                </ActionButton>
                <SecondaryButton onClick={() => onClose()}>Go back</SecondaryButton>
              </div>
            }
          />
        )}

        {state.phase === "not_recognized" && (
          <ResultCard
            icon={<XCircle className="h-14 w-14 text-[#E07A5F]" />}
            eyebrow="Scan failed"
            title="Ticket not recognized"
            subtitle={`${state.message} Try again or head to the help desk.`}
            actions={
              <div className="flex gap-3">
                <ActionButton onClick={scanAnother} icon={<ScanLine className="h-4 w-4" />}>
                  Scan another ticket
                </ActionButton>
                <SecondaryButton onClick={() => onClose()}>Try manual code</SecondaryButton>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function ScannerFrame() {
  const corner = "absolute h-8 w-8 border-[#B8952F]";
  return (
    <div className="pointer-events-none absolute inset-4">
      <div className={`${corner} left-0 top-0 border-l-4 border-t-4 rounded-tl-lg`} />
      <div className={`${corner} right-0 top-0 border-r-4 border-t-4 rounded-tr-lg`} />
      <div className={`${corner} left-0 bottom-0 border-l-4 border-b-4 rounded-bl-lg`} />
      <div className={`${corner} right-0 bottom-0 border-r-4 border-b-4 rounded-br-lg`} />
    </div>
  );
}

function ResultCard({
  icon,
  eyebrow,
  title,
  subtitle,
  message,
  rows,
  actions,
}: {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  message?: string;
  rows?: [string, string][];
  actions: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8">
      {eyebrow && <p className="text-[11px] uppercase tracking-widest text-[#B8952F]">{eyebrow}</p>}
      {icon}
      <h2 className="text-lg font-semibold text-[#F0E6C8]">{title}</h2>
      {subtitle && <p className="text-sm text-[#B8AE7A]">{subtitle}</p>}
      {message && <p className="text-sm text-[#B8AE7A]">{message}</p>}
      {rows && rows.length > 0 && (
        <div className="w-full divide-y divide-white/10 rounded-lg border border-white/10 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2">
              <span className="text-[#8C8265]">{label}</span>
              <span className="text-[#F0E6C8]">{value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 w-full">{actions}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#B8952F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3831f] transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-[#F0E6C8] hover:bg-white/5 transition-colors"
    >
      {children}
    </button>
  );
}
