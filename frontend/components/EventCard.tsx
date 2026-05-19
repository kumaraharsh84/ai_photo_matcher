"use client";

import Link from "next/link";
import { Download, ExternalLink, Link2, Settings } from "lucide-react";
import { API_URL, assetUrl, EventItem } from "@/lib/api";

export function EventCard({ event }: { event: EventItem }) {
  async function copyLink() {
    await navigator.clipboard.writeText(event.event_link);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[16/10] bg-slate-100">
        {event.cover_image ? (
          <img loading="lazy" decoding="async" src={assetUrl(event.cover_image)} alt={event.event_name} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-400">No cover image</div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{event.event_name}</h3>
          <p className="text-sm text-slate-500">{formatEventDate(event.event_date)}</p>
          <p className="mt-2 text-sm font-medium text-meadow">{event.total_photos} uploaded photos</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`${API_URL}/events/${event.id}/qr`}
            download={`${event.event_name}-qr.png`}
            className="grid h-10 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50"
            title="Download QR code"
          >
            <Download size={18} />
          </a>
          <button
            onClick={copyLink}
            className="grid h-10 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50"
            title="Copy share link"
          >
            <Link2 size={18} />
          </button>
          <Link
            href={`/photographer/event/${event.id}`}
            className="grid h-10 place-items-center rounded-lg bg-ink text-white transition hover:bg-slate-800"
            title="Manage event"
          >
            <Settings size={18} />
          </Link>
        </div>
        <a href={event.event_link} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-ink">
          Guest link <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
