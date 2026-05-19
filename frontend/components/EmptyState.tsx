import Link from "next/link";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{text}</p>
      <Link href="/photographer/create-event" className="mt-5 inline-flex rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white">
        Create event
      </Link>
    </div>
  );
}

