import { redirect } from "next/navigation";

export default async function LegacyGuestEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/event/${id}`);
}
