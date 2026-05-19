"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicEvent, publicApiFetch } from "@/lib/api";

export default function FollowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [instagramOpened, setInstagramOpened] = useState(false);

  useEffect(() => {
    publicApiFetch<PublicEvent>(`/public/events/${id}`).then((data) => {
      setEvent(data);
      if (data.payment_required && localStorage.getItem(`event_paid_${id}`) !== "true") {
        router.replace(`/event/${id}/payment`);
      }
    });
  }, [id, router]);

  const instagramUrl = event?.instagram_username ? `https://instagram.com/${event.instagram_username.replace("@", "")}` : "https://instagram.com";

  return (
    <main className="min-h-screen bg-mist px-4 py-12">
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <Link href={`/event/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          Back to album
        </Link>
        <p className="inline-flex items-center gap-2 rounded-lg bg-rosewood/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rosewood">
          <Instagram size={14} />
          One quick step
        </p>
        <h1 className="mt-3 text-3xl font-bold">Follow the photographer</h1>
        <p className="mt-3 text-slate-600">Confirm this step before scanning your selfie for matching event photos.</p>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => setInstagramOpened(true)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rosewood px-5 py-3 font-semibold text-white hover:bg-rosewood/90"
        >
          <Instagram size={18} />
          {event?.instagram_username ? `Open @${event.instagram_username}` : "Open Instagram"}
        </a>
        <label className={`mt-6 flex items-start gap-3 rounded-lg border p-4 transition ${
          confirmed ? "border-meadow bg-meadow/5" : instagramOpened ? "cursor-pointer border-slate-200 hover:bg-slate-50" : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
        }`}>
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!instagramOpened}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 disabled:cursor-not-allowed"
          />
          <span className="flex-1 text-sm font-medium text-slate-700">I followed the photographer on Instagram</span>
          {confirmed && <CheckCircle2 size={18} className="text-meadow" />}
        </label>
        {!instagramOpened && <p className="mt-3 text-xs font-medium text-slate-500">Open the Instagram profile first to unlock confirmation.</p>}
        <Link
          href={instagramOpened && confirmed ? `/event/${id}/scan` : "#"}
          aria-disabled={!instagramOpened || !confirmed}
          className={`mt-6 inline-flex w-full justify-center rounded-lg px-5 py-3 font-semibold ${
            instagramOpened && confirmed ? "bg-ink text-white hover:bg-slate-800" : "pointer-events-none bg-slate-200 text-slate-400"
          }`}
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
