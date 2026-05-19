"use client";

import { ArrowLeft, Check, Download, ImageOff, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { assetUrl, GuestMatchPhoto, GuestMatchResponse, matchZipDownloadUrl, photoDownloadUrl, publicApiFetch } from "@/lib/api";

export default function GuestGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState<GuestMatchPhoto[]>([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<GuestMatchPhoto | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [matchSessionId, setMatchSessionId] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session") || sessionStorage.getItem(`guest_match_${id}`);
    if (!sessionId) {
      setStatus("missing");
      return;
    }
    setMatchSessionId(sessionId);
    publicApiFetch<GuestMatchResponse>(`/public/matches/${sessionId}`)
      .then((data) => {
        setMatches(data.matches);
        setStatus(data.status);
        setError(data.error_message || "");
      })
      .catch((err) => {
        setStatus("failed");
        setError(err.message);
      });
  }, [id, searchParams]);

  function togglePhoto(photoId: string) {
    setSelectedPhotoIds((current) => (current.includes(photoId) ? current.filter((idValue) => idValue !== photoId) : [...current, photoId]));
  }

  function toggleSelectAll() {
    setSelectedPhotoIds((current) => (current.length === matches.length ? [] : matches.map((match) => match.photo_id)));
  }

  function startSelecting() {
    setSelecting(true);
    setSelectedPhotoIds([]);
  }

  function cancelSelecting() {
    setSelecting(false);
    setSelectedPhotoIds([]);
  }

  function downloadSelected() {
    if (!selectedPhotoIds.length) return;
    const link = document.createElement("a");
    link.href = selectedPhotoIds.length === 1 ? photoDownloadUrl(selectedPhotoIds[0]) : matchZipDownloadUrl(matchSessionId, selectedPhotoIds);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-10">
      <section className="mx-auto max-w-6xl">
        <Link href={`/event/${id}/scan`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          Scan another selfie
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg bg-meadow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-meadow">
                <Sparkles size={14} />
                Personalized Gallery
              </p>
              <h1 className="mt-3 text-3xl font-bold">Your Matching Photos</h1>
              <p className="mt-2 text-sm text-slate-500">Results are sorted by strongest face similarity.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-fit rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">{matches.length} matches</p>
              {matches.length > 0 && !selecting && (
                <button onClick={startSelecting} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <Download size={16} />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>

        {matches.length > 0 && selecting && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-600">{selectedPhotoIds.length} of {matches.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleSelectAll} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50">
                {selectedPhotoIds.length === matches.length ? "Clear all" : "Select all"}
              </button>
              <button onClick={cancelSelecting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={downloadSelected}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                  selectedPhotoIds.length ? "bg-ink text-white hover:bg-slate-800" : "pointer-events-none bg-slate-200 text-slate-400"
                }`}
              >
                <Download size={16} />
                {selectedPhotoIds.length > 1 ? "Download ZIP" : "Download selected"}
              </button>
            </div>
          </div>
        )}

        {status === "loading" && <GallerySkeleton />}
        {status === "missing" && <EmptyGallery retryHref={`/event/${id}/scan`} text="Please scan your selfie first to create a personalized gallery." />}
        {error && status === "failed" && <EmptyGallery retryHref={`/event/${id}/scan`} text={error} />}
        {!error && status !== "loading" && status !== "missing" && matches.length === 0 && (
          <EmptyGallery retryHref={`/event/${id}/scan`} text="We could not find clear matches for this selfie." />
        )}

        {matches.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {matches.map((match) => (
              <button
                key={match.photo_id}
                onClick={() => (selecting ? togglePhoto(match.photo_id) : setSelected(match))}
                className={`group relative overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-meadow/15 ${
                  selectedPhotoIds.includes(match.photo_id) ? "border-meadow ring-2 ring-meadow/20" : "border-slate-200"
                }`}
              >
                {selecting && (
                  <span className={`absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border shadow-sm ${
                    selectedPhotoIds.includes(match.photo_id) ? "border-meadow bg-meadow text-white" : "border-white/70 bg-white/85 text-slate-400"
                  }`}>
                    {selectedPhotoIds.includes(match.photo_id) && <Check size={16} />}
                  </span>
                )}
                <img loading="lazy" decoding="async" src={assetUrl(match.image_path)} alt="Matched event photo" className="aspect-square h-full w-full object-cover transition group-hover:scale-105" />
                <span className="flex items-center justify-between gap-2 p-3 text-xs font-semibold text-slate-500">
                  Match
                  <span className="text-meadow">{Math.round(match.best_similarity * 100)}%</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center">
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-white text-ink shadow-sm transition hover:bg-slate-100" aria-label="Close preview">
              <X size={20} />
            </button>
            <img src={assetUrl(selected.image_path)} alt="Selected matched photo" className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            <a href={photoDownloadUrl(selected.photo_id)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-100">
              <Download size={18} />
              Download image
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyGallery({ text, retryHref }: { text: string; retryHref: string }) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <ImageOff size={22} />
      </div>
      <h2 className="mt-4 text-xl font-bold">No matches found</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{text}</p>
      <Link href={retryHref} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white">
        <RotateCcw size={16} />
        Try another selfie
      </Link>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="aspect-square animate-pulse bg-slate-200" />
          <div className="h-10 animate-pulse border-t border-slate-100 bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
