"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Images, PlusCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, DashboardStats, EventItem } from "@/lib/api";

export default function PhotographerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DashboardStats>("/dashboard").then(setStats).catch((err) => setError(err.message));
  }, []);

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg bg-meadow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-meadow">
                <Sparkles size={14} />
                Photographer workspace
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Manage your event galleries</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Create albums, upload photos, share QR links, and review AI face processing from one place.
              </p>
            </div>
            <Link
              href="/photographer/create-event"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <PlusCircle size={18} />
              Create Event
            </Link>
          </div>
        </section>

        {error && <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard label="Total Events" value={stats?.total_events ?? 0} icon={<CalendarDays size={22} />} loading={!stats && !error} />
          <Link
            href="/photographer/events"
            className="group rounded-lg border border-slate-200 bg-ink p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/10">
                <Images size={21} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-white/60">View</span>
            </div>
            <p className="mt-6 text-sm text-white/70">Quick access</p>
            <p className="mt-1 text-2xl font-bold">My Events</p>
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold">Recent Events</h2>
              <p className="mt-1 text-sm text-slate-500">Latest albums created by you.</p>
            </div>
            <Link href="/photographer/events" className="inline-flex items-center gap-2 text-sm font-semibold text-rosewood hover:text-rosewood/80">
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {!stats && !error ? (
              <RecentEventsLoading />
            ) : stats?.recent_events?.length ? (
              stats.recent_events.map((event) => <RecentEventRow key={event.id} event={event} />)
            ) : (
              <div className="px-5 py-10 text-center sm:px-6">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <CalendarDays size={22} />
                </div>
                <h3 className="mt-4 font-semibold">No events yet</h3>
                <p className="mt-1 text-sm text-slate-500">Create your first wedding or event gallery to begin.</p>
                <Link href="/photographer/create-event" className="mt-5 inline-flex rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Create Event
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-rosewood/10 text-rosewood">{icon}</div>
        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">Live</span>
      </div>
      <p className="mt-6 text-sm font-medium text-slate-500">{label}</p>
      {loading ? <div className="mt-2 h-9 w-20 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>}
    </div>
  );
}

function RecentEventRow({ event }: { event: EventItem }) {
  return (
    <Link href={`/photographer/event/${event.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6">
      <div>
        <p className="font-semibold text-ink">{event.event_name}</p>
        <p className="mt-1 text-sm text-slate-500">{formatEventDate(event.event_date)}</p>
      </div>
      <p className="w-fit rounded-lg bg-meadow/10 px-3 py-1.5 text-sm font-semibold text-meadow">{event.total_photos} photos</p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
        Manage
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function RecentEventsLoading() {
  return (
    <div className="space-y-1 px-5 py-4 sm:px-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 py-3">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
