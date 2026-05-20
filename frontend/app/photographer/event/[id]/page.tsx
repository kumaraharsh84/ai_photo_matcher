"use client";

import { Cloud, Download, Images, Instagram, Link2, QrCode, ScanFace, Share2, Trash2, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { ImageUploader } from "@/components/ImageUploader";
import { API_URL, apiFetch, assetUrl, EventItem, FaceItem, PhotoItem, ProcessingStatus } from "@/lib/api";

export default function ManageEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;
  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [faces, setFaces] = useState<FaceItem[]>([]);
  const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<string[]>([]);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadAiData() {
    const [faceData, statusData] = await Promise.all([
      apiFetch<FaceItem[]>(`/events/${eventId}/faces`),
      apiFetch<ProcessingStatus>(`/events/${eventId}/processing-status`)
    ]);
    setFaces(faceData);
    setProcessing(statusData);
  }

  useEffect(() => {
    async function load() {
      const [eventData, photoData, faceData, statusData] = await Promise.all([
        apiFetch<EventItem>(`/events/${eventId}`),
        apiFetch<PhotoItem[]>(`/events/${eventId}/photos`),
        apiFetch<FaceItem[]>(`/events/${eventId}/faces`),
        apiFetch<ProcessingStatus>(`/events/${eventId}/processing-status`)
      ]);
      setEvent(eventData);
      setPhotos(photoData);
      setFaces(faceData);
      setProcessing(statusData);
    }

    load();
  }, [eventId]);

  const facesByPhoto = useMemo(() => {
    return faces.reduce<Record<string, FaceItem[]>>((groups, face) => {
      groups[face.photo_id] = groups[face.photo_id] || [];
      groups[face.photo_id].push(face);
      return groups;
    }, {});
  }, [faces]);

  async function copyLink() {
    if (!event) return;
    await navigator.clipboard.writeText(event.event_link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function copyWifiLink() {
    if (!event || typeof window === "undefined") return;
    const wifiLink = `${window.location.origin}/event/${event.id}`;
    await navigator.clipboard.writeText(wifiLink);
    setWifiCopied(true);
    window.setTimeout(() => setWifiCopied(false), 1400);
  }

  async function deletePhoto(photo: PhotoItem) {
    const confirmed = window.confirm("Delete this photo from the event and storage?");
    if (!confirmed) return;

    setActionError("");
    setDeletingPhotoIds((current) => [...current, photo.id]);
    try {
      await apiFetch(`/events/${eventId}/photos/${photo.id}`, { method: "DELETE" });
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setFaces((current) => current.filter((face) => face.photo_id !== photo.id));
      setEvent((current) => current && { ...current, total_photos: Math.max(0, current.total_photos - 1) });
      await loadAiData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this photo.");
    } finally {
      setDeletingPhotoIds((current) => current.filter((id) => id !== photo.id));
    }
  }

  async function deleteCurrentEvent() {
    if (!event) return;
    const confirmed = window.confirm(`Delete "${event.event_name}" and all event photos? This cannot be undone.`);
    if (!confirmed) return;

    setActionError("");
    setDeletingEvent(true);
    try {
      await apiFetch(`/events/${event.id}`, { method: "DELETE" });
      router.push("/photographer/events");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this event.");
      setDeletingEvent(false);
    }
  }

  return (
    <DashboardShell title="Manage Event">
      {!event ? (
        <EventLoading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {actionError && <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[16/7] bg-slate-100">
                {event.cover_image ? (
                  <img loading="lazy" decoding="async" src={assetUrl(event.cover_image)} alt={event.event_name} className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-slate-400">No cover image</div>
                )}
              </div>
              <div className="p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h2 className="text-2xl font-bold">{event.event_name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{new Date(event.event_date).toLocaleDateString()}</p>
                  </div>
                  {event.instagram_username && (
                    <p className="inline-flex h-10 items-center gap-2 rounded-lg bg-rosewood/10 px-3 text-sm font-semibold text-rosewood">
                      <Instagram size={16} />
                      @{event.instagram_username}
                    </p>
                  )}
                </div>
                {event.description && <p className="mt-5 leading-7 text-slate-600">{event.description}</p>}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading icon={<Cloud size={19} />} title="Image Upload" text="Upload event photos to cloud storage. AI processing starts automatically after upload." />
              <div className="mt-5">
                <ImageUploader
                  eventId={event.id}
                  onUploaded={async (newPhotos) => {
                    setPhotos((current) => [...newPhotos, ...current]);
                    setEvent((current) => current && { ...current, total_photos: current.total_photos + newPhotos.length });
                    await loadAiData();
                  }}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <SectionHeading icon={<ScanFace size={19} />} title="AI Processing" text="Detected faces and processing health for this album." />
                <span className="rounded-lg bg-meadow/10 px-3 py-2 text-sm font-semibold capitalize text-meadow">
                  {(processing?.status || "loading").replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <AiStat label="Total uploaded images" value={processing?.total_uploaded_images ?? photos.length} />
                <AiStat label="Total detected faces" value={processing?.total_detected_faces ?? faces.length} />
                <AiStat label="Failed images" value={processing?.failed_images ?? 0} />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <SectionHeading icon={<Images size={19} />} title="Uploaded Images Gallery" />
                <p className="text-sm font-semibold text-meadow">{photos.length} photos</p>
              </div>
              {photos.length ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <a href={assetUrl(photo.image_path)} target="_blank" className="block">
                        <img loading="lazy" decoding="async" src={assetUrl(photo.image_path)} alt="Uploaded event photo" className="aspect-square h-full w-full object-cover transition group-hover:scale-105" />
                      </a>
                      <button
                        onClick={() => deletePhoto(photo)}
                        disabled={deletingPhotoIds.includes(photo.id)}
                        className="flex h-10 w-full items-center justify-center gap-2 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        {deletingPhotoIds.includes(photo.id) ? "Deleting" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No uploaded images yet.</p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <SectionHeading icon={<ScanFace size={19} />} title="Face Detection Preview" />
                <p className="text-sm font-semibold text-meadow">{faces.length} faces</p>
              </div>
              {photos.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="relative aspect-square bg-slate-100">
                        <img loading="lazy" decoding="async" src={assetUrl(photo.image_path)} alt="Face detection preview" className="h-full w-full object-cover" />
                        {(facesByPhoto[photo.id] || []).map((face) => {
                          const box = face.face_coordinates;
                          const left = (box.x / box.image_width) * 100;
                          const top = (box.y / box.image_height) * 100;
                          const width = (box.width / box.image_width) * 100;
                          const height = (box.height / box.image_height) * 100;
                          return (
                            <div
                              key={face.id}
                              className="absolute border-2 border-sun shadow-[0_0_0_1px_rgba(16,24,40,0.45)]"
                              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                              title={`Confidence ${(face.confidence_score * 100).toFixed(1)}%`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 text-xs">
                        <span className="font-semibold capitalize text-slate-600">{photo.processing_status}</span>
                        <span className="text-slate-500">{facesByPhoto[photo.id]?.length || 0} faces</span>
                      </div>
                      {photo.processing_error && <p className="border-t border-red-100 bg-red-50 p-3 text-xs text-red-700">{photo.processing_error}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Upload event photos to see detected face boxes.</p>
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2">
                <QrCode size={20} className="text-rosewood" />
                <h2 className="text-xl font-bold">QR Code</h2>
              </div>
              <img src={`${API_URL}/events/${event.id}/qr`} alt="Event QR code" className="mx-auto mt-5 h-56 w-56 rounded-lg border border-slate-200 bg-white p-3" />
              <a
                href={`${API_URL}/events/${event.id}/qr`}
                download={`${event.event_name}-qr.png`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Download size={18} />
                Download QR
              </a>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Share2 size={20} className="text-meadow" />
                <h2 className="text-xl font-bold">Share Link</h2>
              </div>
              <p className="mt-3 break-all rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{event.event_link}</p>
              <button
                onClick={copyLink}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                <Link2 size={18} />
                {copied ? "Copied" : "Copy event link"}
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Wifi size={20} className="text-rosewood" />
                <h2 className="text-xl font-bold">WiFi Share</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                For same-WiFi event testing, open this dashboard using your computer&apos;s local network address, then copy this link for guests.
              </p>
              <button
                onClick={copyWifiLink}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                <Link2 size={18} />
                {wifiCopied ? "Copied" : "Copy WiFi link"}
              </button>
            </section>

            <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Trash2 size={20} className="text-red-700" />
                <h2 className="text-xl font-bold text-red-800">Delete Event</h2>
              </div>
              <button
                onClick={deleteCurrentEvent}
                disabled={deletingEvent}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={18} />
                {deletingEvent ? "Deleting event" : "Delete event"}
              </button>
            </section>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}

function SectionHeading({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-rosewood/10 text-rosewood">{icon}</span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {text && <p className="mt-2 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

function AiStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function EventLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="aspect-[16/7] animate-pulse bg-slate-200" />
          <div className="space-y-3 p-6">
            <div className="h-7 w-56 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-52 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        <div className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}
