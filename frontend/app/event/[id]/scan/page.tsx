"use client";

import Link from "next/link";
import { ArrowLeft, Camera, RefreshCcw, ScanFace, UploadCloud } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { GuestMatchResponse, PublicEvent, publicApiFetch } from "@/lib/api";

export default function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    publicApiFetch<PublicEvent>(`/public/events/${id}`).then((event) => {
      if (event.payment_required && localStorage.getItem(`event_paid_${id}`) !== "true") {
        router.replace(`/event/${id}/payment`);
      }
    });

    return () => {
      stopCamera();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [id, router]);

  function setSelectedFile(nextFile: File) {
    setFile(nextFile);
    setError("");
    setProgressText("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(nextFile);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) setSelectedFile(selected);
  }

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError("Camera access was blocked or is unavailable on this device.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function captureSelfie() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.videoWidth || !video.videoHeight) {
      setError("Camera is still warming up. Please try capture again in a second.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Could not capture this selfie. Please try again.");
      return;
    }
    setSelectedFile(new File([blob], "camera-selfie.jpg", { type: "image/jpeg" }));
    stopCamera();
  }

  async function submitSelfie() {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgressText("Uploading selfie...");
    const form = new FormData();
    form.append("selfie", file);
    try {
      window.setTimeout(() => setProgressText("Detecting your face..."), 500);
      window.setTimeout(() => setProgressText("Comparing with event photos..."), 1400);
      const result = await publicApiFetch<GuestMatchResponse>(`/public/events/${id}/selfie-match`, {
        method: "POST",
        body: form
      });
      sessionStorage.setItem(`guest_match_${id}`, result.match_session_id);
      router.push(`/event/${id}/gallery?session=${result.match_session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not match this selfie.");
    } finally {
      setBusy(false);
      setProgressText("");
    }
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <Link href={`/event/${id}/follow`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          Back to Instagram step
        </Link>
        <p className="inline-flex items-center gap-2 rounded-lg bg-meadow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-meadow">
          <ScanFace size={14} />
          Selfie scan
        </p>
        <h1 className="mt-3 text-3xl font-bold">Scan Your Selfie</h1>
        <p className="mt-2 text-slate-600">Use one clear selfie with only your face visible.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid min-h-48 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-rosewood hover:bg-rosewood/5">
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleUpload} />
            <span>
              <UploadCloud className="mx-auto text-rosewood" size={34} />
              <span className="mt-3 block font-semibold">Upload selfie</span>
              <span className="mt-1 block text-sm text-slate-500">JPG, PNG, or camera image</span>
            </span>
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <video ref={videoRef} autoPlay playsInline muted className={`aspect-video w-full rounded-lg bg-black object-cover ${cameraActive ? "block" : "hidden"}`} />
            {!cameraActive && (
              <div className="grid aspect-video place-items-center rounded-lg bg-slate-100 text-center text-sm text-slate-500">
                Camera preview
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={cameraActive ? captureSelfie : startCamera} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                <Camera size={17} />
                {cameraActive ? "Capture" : "Use camera"}
              </button>
              <button type="button" onClick={stopCamera} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-white disabled:opacity-60">
                <RefreshCcw size={17} />
                Retake
              </button>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold">Image preview</p>
            <img src={preview} alt="Selected selfie" className="max-h-80 w-full rounded-lg border border-slate-200 object-contain" />
          </div>
        )}

        {error && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {progressText && (
          <div className="mt-5 rounded-lg bg-meadow/10 px-4 py-3 text-sm font-semibold text-meadow">
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-meadow/15">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-meadow" />
            </div>
            {progressText}
          </div>
        )}

        <button
          onClick={submitSelfie}
          disabled={!file || busy}
          className="mt-6 w-full rounded-lg bg-meadow px-5 py-3 font-semibold text-white hover:bg-meadow/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "Finding your photos..." : "Find matching photos"}
        </button>
      </div>
    </main>
  );
}
