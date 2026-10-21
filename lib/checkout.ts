import { inAndroidApp } from "@/lib/twa";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export interface BuyPackOptions {
  packId?: string; // defaults to "pack_trial_29" (₹29)
  email?: string;
  onSuccess?: () => void;
  onDismiss?: () => void;
  onError?: (err: Error) => void;
}

export async function buyStarterPack(options: BuyPackOptions = {}): Promise<void> {
  const packId = options.packId || "pack_trial_29";
  if (inAndroidApp()) {
    window.location.href = "/topup";
    return;
  }

  const ok = await loadRazorpayCheckout();
  if (!ok) {
    const err = new Error("Could not load payment checkout.");
    options.onError?.(err);
    throw err;
  }

  const res = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "Could not start checkout.");
    options.onError?.(err);
    throw err;
  }

  const rzp = new window.Razorpay!({
    key: data.keyId,
    order_id: data.orderId,
    amount: data.amount,
    currency: "INR",
    name: "PaperGen",
    description: "10 paper generations (₹59)",
    prefill: { email: options.email },
    theme: { color: "#4f46e5" },
    handler: () => {
      void fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment_completed",
          metadata: { packId, amountInr: 59 },
        }),
        keepalive: true,
      }).catch(() => undefined);
      options.onSuccess?.();
    },
    modal: {
      ondismiss: () => options.onDismiss?.(),
    },
  });

  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "payment_started",
      metadata: { packId, amountInr: 59 },
    }),
    keepalive: true,
  }).catch(() => undefined);

  rzp.open();
}
