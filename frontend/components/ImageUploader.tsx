"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { apiFetch, PhotoItem } from "@/lib/api";

export function ImageUploader({ eventId, onUploaded }: { eventId: string; onUploaded: (photos: PhotoItem[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) return;

    const form = new FormData();
    selected.forEach((file) => form.append("files", file));
    setBusy(true);
    setError("");
    setProgress(20);
    let timer: number | undefined;
    try {
      timer = window.setInterval(() => setProgress((value) => Math.min(value + 18, 88)), 180);
      const photos = await apiFetch<PhotoItem[]>(`/events/${eventId}/photos`, { method: "POST", body: form });
      setProgress(100);
      onUploaded(photos);
      if (inputRef.current) inputRef.current.value = "";
      window.setTimeout(() => setProgress(0), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setProgress(0);
    } finally {
      if (timer) window.clearInterval(timer);
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed bg-white p-8 text-center transition ${
          dragging ? "border-rosewood bg-rosewood/5" : "border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(event) => event.target.files && upload(event.target.files)}
        />
        <UploadCloud className="mx-auto text-rosewood" size={36} />
        <p className="mt-3 font-semibold">{busy ? "Uploading and processing..." : "Drop event photos here"}</p>
        <p className="text-sm text-slate-500">Select clear JPG or PNG images. Face processing starts automatically.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Choose images"}
        </button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {progress > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Upload progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-meadow transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
