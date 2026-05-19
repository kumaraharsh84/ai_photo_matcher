"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ImagePlus, IndianRupee, Instagram, Type } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, EventItem } from "@/lib/api";

export default function CreateEventPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const created = await apiFetch<EventItem>("/events", { method: "POST", body: form });
      router.push(`/photographer/event/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell title="Create Event">
      <form onSubmit={submit} className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wide text-rosewood">New album</p>
          <h2 className="mt-2 text-2xl font-bold">Event details</h2>
          <p className="mt-2 text-sm text-slate-500">Create a shareable event gallery with a cover image, QR code, and private guest link.</p>
        </div>
        <div className="grid gap-5 p-6 sm:p-8">
          <label className="block">
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><Type size={16} />Event Name</span>
            <input name="event_name" placeholder="Hiren Wedding" className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Event Description</span>
            <textarea name="description" rows={4} placeholder="Short note guests will see on the album page" className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} />Event Date</span>
              <input name="event_date" type="date" className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" required />
            </label>
            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Instagram size={16} />Instagram Username</span>
              <input name="instagram_username" placeholder="studio_name" className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" />
            </label>
          </div>
          <label className="block">
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><IndianRupee size={16} />Guest Payment Amount</span>
            <input
              name="payment_amount"
              type="number"
              min="1"
              step="1"
              placeholder="299"
              className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              required
            />
            <span className="mt-1 block text-xs text-slate-500">Guests pay this amount before Instagram follow and selfie matching.</span>
          </label>
          <label className="block">
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><ImagePlus size={16} />Event Cover Image</span>
            <input name="cover_image" type="file" accept="image/*" className="focus-ring mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-3" />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.push("/photographer/events")} className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button disabled={busy} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Creating event..." : "Create event"}
            </button>
          </div>
        </div>
      </form>
    </DashboardShell>
  );
}
