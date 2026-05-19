import Link from "next/link";
import { ArrowRight, Camera, QrCode, UserRound } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-mist">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-lg bg-rosewood/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rosewood">
            <QrCode size={14} />
            Wedding and event gallery finder
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-6xl">AI Face-Based Photo Finder</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Create private event albums, process faces automatically, and help guests find their own photos through a QR-powered selfie flow.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Link
            href="/photographer/login"
            className="group rounded-lg border border-slate-200 bg-white p-8 shadow-soft transition hover:-translate-y-1 hover:border-rosewood/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-rosewood text-white">
                <Camera size={28} />
              </div>
              <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-rosewood" size={22} />
            </div>
            <h2 className="mt-8 text-2xl font-bold">Photographer Side</h2>
            <p className="mt-3 text-slate-600">Register, create event albums, upload photos, generate QR codes, and manage galleries.</p>
            <span className="mt-8 inline-flex font-semibold text-rosewood">Open photographer workspace</span>
          </Link>

          <Link
            href="/user"
            className="group rounded-lg border border-slate-200 bg-white p-8 shadow-soft transition hover:-translate-y-1 hover:border-meadow/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-meadow text-white">
                <UserRound size={28} />
              </div>
              <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-meadow" size={22} />
            </div>
            <h2 className="mt-8 text-2xl font-bold">User Side</h2>
            <p className="mt-3 text-slate-600">Open a private album link or QR code, follow the photographer, and scan a selfie to find matching photos.</p>
            <span className="mt-8 inline-flex font-semibold text-meadow">Find guest photos</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
