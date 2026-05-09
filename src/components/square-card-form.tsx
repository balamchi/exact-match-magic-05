import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Square Web Payments SDK card form. Mounts a tokenizable card field, then
// returns a `cnon:...` source token to the parent via `onToken` after the
// cardholder clicks the local "Save card" button.

declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string,
      ) => Promise<{
        card: () => Promise<{
          attach: (selector: string | HTMLElement) => Promise<void>;
          tokenize: () => Promise<{
            status: "OK" | "ERROR";
            token?: string;
            errors?: Array<{ message: string }>;
          }>;
          destroy: () => Promise<void>;
        }>;
      }>;
    };
  }
}

const SDK_URLS = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
} as const;

let sdkPromise: Promise<void> | null = null;
function loadSquareSdk(env: "sandbox" | "production"): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Square) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-square-sdk]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Square SDK failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URLS[env];
    s.async = true;
    s.dataset.squareSdk = env;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Square SDK failed to load"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

type Props = {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
  onToken: (token: string) => void;
  disabled?: boolean;
  hasToken?: boolean;
};

export function SquareCardForm({
  applicationId,
  locationId,
  environment,
  onToken,
  disabled,
  hasToken,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<Awaited<
    ReturnType<NonNullable<Window["Square"]>["payments"]>
  >["card"] extends () => Promise<infer C>
    ? C | null
    : null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    let mountedCard: any = null;

    (async () => {
      try {
        await loadSquareSdk(environment);
        if (canceled || !window.Square || !containerRef.current) return;
        const payments = await window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        await card.attach(containerRef.current);
        if (canceled) {
          await card.destroy().catch(() => {});
          return;
        }
        mountedCard = card;
        cardRef.current = card as any;
        setReady(true);
      } catch (e) {
        if (!canceled) setErr(e instanceof Error ? e.message : "Card form failed to load");
      }
    })();

    return () => {
      canceled = true;
      if (mountedCard) mountedCard.destroy().catch(() => {});
      cardRef.current = null;
    };
  }, [applicationId, locationId, environment]);

  const tokenize = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await (cardRef.current as any).tokenize();
      if (res.status === "OK" && res.token) {
        onToken(res.token);
      } else {
        const msg = res.errors?.[0]?.message ?? "Card details invalid";
        setErr(msg);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Tokenization failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={cn(
          "min-h-[58px] rounded-md border border-border/60 bg-background/60 p-3 transition",
          !ready && "animate-pulse",
        )}
      />
      {!ready && !err && (
        <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading secure card field…
        </p>
      )}
      {err && <p className="text-[11px] text-destructive">{err}</p>}
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] text-muted-foreground">
          Card data is sent directly to Square. ClinicPro never sees PAN.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={tokenize}
          disabled={!ready || busy || disabled}
        >
          {busy ? "Saving…" : hasToken ? "Re-tokenize" : "Save card"}
        </Button>
      </div>
    </div>
  );
}
