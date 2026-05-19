"use client";

import Link from "next/link";
import { ArrowLeft, Link2, QrCode, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DetectedBarcode = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export default function UserPage() {
  const router = useRouter();
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const [eventInput, setEventInput] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  function openEventValue(value: string) {
    setError("");

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError("Please paste an event link or enter an event ID.");
      return;
    }

    const match = trimmedValue.match(/\/event\/([^/?#]+)/);
    const eventId = match?.[1] || trimmedValue;
    router.push(`/event/${encodeURIComponent(eventId)}`);
  }

  function openEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openEventValue(eventInput);
  }

  async function scanQrImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.BarcodeDetector) {
      setError("QR scanning is not supported in this browser. Please paste the event link instead.");
      event.target.value = "";
      return;
    }

    try {
      setError("");
      setScanning(true);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();

      if (!codes.length || !codes[0].rawValue) {
        setError("No QR code found in this image. Please try a clearer QR photo.");
        return;
      }

      openEventValue(codes[0].rawValue);
    } catch {
      setError("Could not read this QR code. Please try again or paste the event link.");
    } finally {
      setScanning(false);
      event.target.value = "";
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
            <ArrowLeft size={16} />
            Mode selection
          </Link>
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rosewood/10 text-rosewood">
              <QrCode size={24} />
            </div>
            <h1 className="mt-4 text-3xl font-bold">Find My Photos</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">Scan the event QR code or paste the private event link shared by the photographer.</p>
          </div>

          <form onSubmit={openEvent} className="mt-8 space-y-4">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="event-link">
              Event link or event ID
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="event-link"
                value={eventInput}
                onChange={(event) => setEventInput(event.target.value)}
                placeholder="Paste event link or ID"
                className="min-h-12 flex-1 rounded-lg border border-slate-300 px-4 outline-none transition focus:border-rosewood focus:ring-2 focus:ring-rosewood/20"
              />
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <Link2 size={18} />
                Open Album
              </button>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </form>

          <div className="mt-8">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <QrCode className="text-rosewood" size={22} />
              <h2 className="mt-3 font-semibold">Scan or Upload QR Code</h2>
              <p className="mt-1 text-sm text-slate-500">Use a QR image from the photographer to open the private album.</p>
              <input ref={qrInputRef} type="file" accept="image/*" capture="environment" onChange={scanQrImage} className="hidden" />
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:bg-slate-50"
              >
                <Upload size={18} />
                {scanning ? "Reading QR..." : "Scan / Upload QR"}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-ink">
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
