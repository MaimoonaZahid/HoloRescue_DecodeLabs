import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type DemoSearch = {
  order?: string;
  title?: string;
  amount?: string;
  return?: string;
  cancel?: string;
};

export const Route = createFileRoute("/checkout/demo")({
  head: () => ({
    meta: [
      { title: "Demo checkout — Emerald LMS" },
      {
        name: "description",
        content: "Simulated PayPal sandbox checkout used while real credentials are not configured.",
      },
      { property: "og:title", content: "Demo checkout — Emerald LMS" },
      {
        property: "og:description",
        content: "Simulated PayPal sandbox checkout for testing premium enrolment.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): DemoSearch => {
    const pick = (key: keyof DemoSearch) =>
      typeof search[key] === "string" ? (search[key] as string) : undefined;
    const out: DemoSearch = {};
    for (const key of ["order", "title", "amount", "return", "cancel"] as const) {
      const value = pick(key);
      if (value !== undefined) out[key] = value;
    }
    return out;
  },
  component: DemoCheckout,
});

function samePath(url: string | undefined, fallback: string) {
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin ? parsed.pathname + parsed.search : fallback;
  } catch {
    return fallback;
  }
}

function DemoCheckout() {
  const search = Route.useSearch();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);

  function go(target: string | undefined, fallback: string, kind: "pay" | "cancel") {
    setBusy(kind);
    window.location.href = samePath(target, fallback);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden />
          Simulated payment page — no real money moves
        </div>

        <div className="surface-panel p-7">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold">Demo PayPal</p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              Sandbox
            </span>
          </div>

          <div className="mt-6 space-y-3 border-y border-border py-5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Item</span>
              <span className="text-right font-medium">{search.title ?? "Premium course"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order</span>
              <span className="font-mono text-xs">{search.order ?? "DEMO"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paying with</span>
              <span>Test wallet •••• 4242</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display text-xl font-semibold">
                ${search.amount ?? "0.00"} USD
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              className="w-full"
              disabled={busy !== null}
              onClick={() => go(search.return, "/courses", "pay")}
            >
              {busy === "pay" ? "Processing…" : "Pay now (demo)"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={busy !== null}
              onClick={() => go(search.cancel, "/courses", "cancel")}
            >
              Cancel and return
            </Button>
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            This stand-in runs because no PayPal credentials are set. Add a sandbox client ID and
            secret and the real PayPal flow takes over automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
