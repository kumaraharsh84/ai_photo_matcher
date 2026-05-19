"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { apiFetch, EventItem } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<EventItem[]>("/events")
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <DashboardShell title="My Events">
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-2xl font-bold">Event Albums</h2>
            <p className="mt-1 text-sm text-slate-500">Manage QR links, uploaded photos, and event AI processing.</p>
          </div>
          <Link href="/photographer/create-event" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800">
            <PlusCircle size={18} />
            Create Event
          </Link>
        </section>

        {!loaded ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : events.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <EmptyState title="No events yet" text="Create your first wedding or event gallery, then upload images and share its QR code." />
        )}
        </div>
    </DashboardShell>
  );
}
