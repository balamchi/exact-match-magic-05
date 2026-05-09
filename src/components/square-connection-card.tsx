import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectSquare, getSquareConnection } from "@/lib/square/connection.functions";

interface Props {
  clinicId: string;
}

interface Conn {
  merchant_id: string;
  business_name: string | null;
  country: string | null;
  currency: string | null;
  status: string;
  connected_at: string;
  location_id: string | null;
  token_expires_at: string;
}

export function SquareConnectionCard({ clinicId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState<Conn | null>(null);
  const fetchConn = useServerFn(getSquareConnection);
  const disconnect = useServerFn(disconnectSquare);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetchConn({ data: { clinic_id: clinicId } });
      setConn((res.connection as Conn | null) ?? null);
    } catch (e) {
      console.error("Failed to load Square connection", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Handle OAuth callback redirect query string
    const url = new URL(window.location.href);
    const status = url.searchParams.get("square");
    const detail = url.searchParams.get("detail");
    if (status === "connected") {
      toast.success(`Square connected${detail ? ` — ${detail}` : ""}`);
      url.searchParams.delete("square");
      url.searchParams.delete("detail");
      window.history.replaceState({}, "", url.toString());
    } else if (status === "error") {
      toast.error(`Square connection failed: ${detail ?? "unknown error"}`);
      url.searchParams.delete("square");
      url.searchParams.delete("detail");
      window.history.replaceState({}, "", url.toString());
    }
  }, [clinicId]);

  const handleConnect = () => {
    window.location.href = `/api/public/square/start?clinic_id=${encodeURIComponent(clinicId)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Square? Existing subscriptions will continue to bill until canceled in Square.")) return;
    setBusy(true);
    try {
      await disconnect({ data: { clinic_id: clinicId } });
      toast.success("Square disconnected");
      setConn(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking Square connection…
      </div>
    );
  }

  if (!conn) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Square</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <AlertCircle className="h-3 w-3" /> Not connected
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your clinic's Square account to enable membership recurring billing, plan management, and automated invoices.
            </p>
            <Button onClick={handleConnect} className="mt-4 gap-2" size="sm">
              <ExternalLink className="h-4 w-4" /> Connect Square
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{conn.business_name ?? "Square account"}</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            <div><dt className="text-[10px] uppercase tracking-wider">Merchant</dt><dd className="font-mono">{conn.merchant_id.slice(0, 12)}…</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Country</dt><dd>{conn.country ?? "—"}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Currency</dt><dd>{conn.currency ?? "—"}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider">Location</dt><dd className="font-mono">{conn.location_id ? `${conn.location_id.slice(0, 8)}…` : "—"}</dd></div>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Connected {new Date(conn.connected_at).toLocaleDateString()}. Token refreshes automatically.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
