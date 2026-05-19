"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, IndianRupee, LockKeyhole, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PaymentOrder, PublicEvent, publicApiFetch } from "@/lib/api";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  theme: { color: string };
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export default function EventPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    publicApiFetch<PublicEvent>(`/public/events/${id}`)
      .then((data) => {
        setEvent(data);
        if (!data.payment_required) router.replace(`/event/${id}/follow`);
      })
      .catch((err) => setError(err.message));
  }, [id, router]);

  function loadRazorpayScript() {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function startPayment() {
    setError("");
    setBusy(true);
    try {
      const order = await publicApiFetch<PaymentOrder>(`/public/events/${id}/payment/order`, { method: "POST" });
      if (order.demo_mode) {
        await publicApiFetch(`/public/events/${id}/payment/verify`, {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: order.order_id,
            razorpay_payment_id: `demo_pay_${Date.now()}`,
            razorpay_signature: "demo_signature"
          })
        });
        localStorage.setItem(`event_paid_${id}`, "true");
        router.push(`/event/${id}/follow`);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Could not load Razorpay checkout. Please check your internet connection.");

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: "Photo Finder",
        description: order.event_name,
        order_id: order.order_id,
        theme: { color: "#101828" },
        modal: {
          ondismiss: () => setBusy(false)
        },
        handler: async (response) => {
          await publicApiFetch(`/public/events/${id}/payment/verify`, {
            method: "POST",
            body: JSON.stringify(response)
          });
          localStorage.setItem(`event_paid_${id}`, "true");
          router.push(`/event/${id}/follow`);
        }
      });
      checkout.open();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-12">
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <Link href={`/event/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          Back to album
        </Link>
        <p className="inline-flex items-center gap-2 rounded-lg bg-meadow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-meadow">
          <LockKeyhole size={14} />
          Secure access
        </p>
        <h1 className="mt-3 text-3xl font-bold">Unlock Your Photos</h1>
        <p className="mt-3 text-slate-600">Complete the photographer&apos;s access payment before Instagram confirmation and selfie matching.</p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">{event?.event_name || "Event album"}</p>
          <p className="mt-2 flex items-center gap-1 text-4xl font-bold text-ink">
            <IndianRupee size={28} />
            {event ? (event.payment_amount_paise / 100).toFixed(0) : "--"}
          </p>
        </div>

        {error && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo note: if Razorpay test keys are not configured, this button uses a safe demo payment bypass for presentation. Add real test keys later to open Razorpay checkout.
        </div>

        <button
          onClick={startPayment}
          disabled={!event || busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
        >
          {busy ? <PlayCircle size={18} /> : <CreditCard size={18} />}
          {busy ? "Processing..." : "Pay and continue"}
        </button>
      </div>
    </main>
  );
}
