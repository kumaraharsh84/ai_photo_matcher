"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, IndianRupee, Instagram, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { assetUrl, PublicEvent, publicApiFetch } from "@/lib/api";

export default function PublicEventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    publicApiFetch<PublicEvent>(`/public/events/${id}`).then(setEvent).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <GuestMessage title="Event not found" text={error} />;
  if (!event) return <GuestMessage title="Loading event..." text="Getting this gallery ready." />;

  return (
    <main className="min-h-screen bg-mist">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/user" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          User entry
        </Link>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="aspect-[16/8] bg-slate-100">
            {event.cover_image ? (
              <img loading="lazy" decoding="async" src={assetUrl(event.cover_image)} alt={event.event_name} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">Event gallery</div>
            )}
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.event_name}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays size={16} />
                  {new Date(event.event_date).toLocaleDateString()}
                </p>
              </div>
              {event.instagram_username && (
                <p className="inline-flex items-center gap-2 rounded-lg bg-rosewood/10 px-3 py-2 text-sm font-semibold text-rosewood">
                  <Instagram size={16} />@{event.instagram_username}
                </p>
              )}
              {event.payment_required && (
                <p className="inline-flex items-center gap-2 rounded-lg bg-meadow/10 px-3 py-2 text-sm font-semibold text-meadow">
                  <IndianRupee size={16} />{(event.payment_amount_paise / 100).toFixed(0)} access fee
                </p>
              )}
            </div>
            {event.description && <p className="mt-5 max-w-3xl leading-7 text-slate-600">{event.description}</p>}
            <Link href={event.payment_required ? `/event/${event.id}/payment` : `/event/${event.id}/follow`} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 font-semibold text-white transition hover:bg-slate-800">
              <Search size={18} />
              Find My Photos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function GuestMessage({ title, text }: { title: string; text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-slate-600">{text}</p>
        <Link href="/user" className="mt-5 inline-flex rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          Back to user entry
        </Link>
      </div>
    </main>
  );
}
