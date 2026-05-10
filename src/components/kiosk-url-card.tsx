import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Variant = "card" | "banner";

export function KioskUrlCard({ variant = "card" }: { variant?: Variant }) {
  const { activeClinic } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClinic) return;
    supabase
      .from("clinics")
      .select("slug")
      .eq("id", activeClinic.clinic_id)
      .maybeSingle()
      .then(({ data }) => setSlug(data?.slug ?? null));
  }, [activeClinic?.clinic_id]);

  if (!slug) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/kiosk/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("Kiosk link copied");
  };

  if (variant === "banner") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
          <Tablet className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Self check-in kiosk</div>
          <p className="text-xs text-muted-foreground">
            Open this link on an iPad at reception. New arrivals appear here in real time.
          </p>
          <code className="mt-2 block truncate rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {url}
          </code>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-lg bg-white p-1.5">
            <QRCodeSVG value={url} size={64} />
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
          <Tablet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Self check-in kiosk</h2>
          <p className="text-xs text-muted-foreground">
            Set up an iPad at reception so clients can check themselves in.
          </p>
        </div>
      </header>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-3">
          <code className="block truncate rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">
            {url}
          </code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Open kiosk
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: scan the QR code with an iPad camera, then add the page to the home screen
            for full-screen kiosk mode.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="rounded-xl bg-white p-3 shadow-card">
            <QRCodeSVG value={url} size={140} />
          </div>
        </div>
      </div>
    </section>
  );
}
