import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Check,
  KeyRound,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  WifiOff,
  ArrowUpRight,
} from "lucide-react";
import {
  api,
  type APIKey,
  type CreatedKey,
  type TailscaleEnableResult,
} from "../lib/api";
import { PageHeader } from "../components/Layout";
import {
  Card,
  CardHeader,
  Button,
  Input,
  Field,
  Badge,
  Spinner,
  EmptyState,
} from "../components/ui";

// Polling intervals (ms).
const STATUS_POLL_FAST = 5000;
const STATUS_POLL_SLOW = 30000;
const PING_INTERVAL = 2000;
const PING_TIMEOUT = 5000;
const PING_MAX_MS = 300000;
const REACHABLE_MISS_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Brand SVG logos — inline to avoid external dependencies.
// ---------------------------------------------------------------------------

function CloudflareLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 2400 480" className={className} fill="currentColor" aria-label="Cloudflare">
      <path d="M1578.8 276.4c-7.2-2.2-14.8 2-17 9.2l-14.8 48.6c19.2 8.8 39.6 10.4 60.8 4.2 22.2-6.6 37.4-22.2 42.6-46.2-13.8-3.2-27.8-5-42-4.6-10.6.2-21 1.6-29.6-11.2zm-82-66.4c-30 2.2-56.4 13.8-79 34.6-18.6-12.8-41-18.4-63.2-15.6-44.4 5.6-71.6 41.8-67.8 83.2H1500c10.6 0 19.2 7.6 20.4 17.8l2.6 28.4c50-3.6 95.6-11.2 133.2-23.2-4.4-40.8-33.6-74-77.2-80.2a108.6 108.6 0 0 0-30.2 0zM416.4 172c-34.4-1.6-66 12.2-91 35.2-20.6-11.6-45.4-15.6-69.2-10.2-45 10.2-73.2 52.4-63 97.4H420c11.2 0 20.8 8.4 22 19.4l3 32.4c54-4 104.8-12.4 148-26.8-5-45.2-38.4-81.8-85.8-87.2a116.4 116.4 0 0 0-33-1.4c-17 1-33.2 5-48 10.4.4-.4.8-.6 1.2-1 24.4-23 57.6-37.2 94-39.6 7.8-.4 15.4-.4 23 0 22 2.2 42.6 10.6 59.2 24.4l8.4-11.6c-19.4-15.2-43-24.4-68.2-26.2-7.4-.6-15-.6-22.4 0zm1030.4 16.6c-27 0-52.6 7.6-74.6 21.4-18.4-13.6-41.6-20.6-65.4-18.6-45.4 3.8-78 40-74.2 83.4h218.6c11.2 0 20.8 8.4 22 19.4l2.6 28.4c50-3.6 95.6-11.2 133.2-23.2-4.4-40.8-33.6-74-77.2-80.2a108.6 108.6 0 0 0-30.2 0c-8.6 2.2-16.2 7.2-22 13.6l-8.4-11.8c18.4-16 42.4-26.2 69-28.2 7.6-.6 15.2-.6 22.6 0 26.4 2.4 50.8 12.2 70.4 27.2l8.4-11.6c-22.4-17.6-50.6-28.4-81.4-30.4-7.2-.6-14.6-.8-21.6-.4zm-1016 101.6H420c-2.2 22.8-20.6 41-43.4 43l-4 .4c-3.2-22.2-21.2-39.6-43.8-40.8h-4.8c-25.2-1.6-47 16.8-48.6 40h-.8c-2.2 22.8-20.6 41-43.4 43l-102 8.4c-6 .4-11.8-1.6-16.2-5.6-4.4-4-6.8-9.8-6.8-15.8L90.4 172c-2-21.8-20-39.4-42.4-41.2-22.8-2-42.4 13.4-46.6 35L0 218.4v.4l-.6.2c0 .2-.4.6-.4 1 0 144.8 117.4 262.2 262.2 262.2 144.8 0 262.2-117.4 262.2-262.2 0-.2 0-.4-.2-.6v-.4L523 218.2c-2.2-21.8-20-39.4-42.4-41.2-6.4-.6-12.6 0-18.2 2.2zm-253 164.6H427.4c-17.4 0-31.6 14.2-31.6 31.6 0 17.4 14.2 31.6 31.6 31.6h208.4c17.4 0 31.6-14.2 31.6-31.6 0-17.4-14.2-31.6-31.6-31.6zm1180.8 0h-208.4c-17.4 0-31.6 14.2-31.6 31.6 0 17.4 14.2 31.6 31.6 31.6h208.4c17.4 0 31.6-14.2 31.6-31.6 0-17.4-14.2-31.6-31.6-31.6z" />
    </svg>
  );
}

function TailscaleLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-label="Tailscale">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2zm0 3.6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function EndpointsPage() {
  return (
    <>
      <PageHeader
        title="Endpoints"
        description="How your applications connect to KeiRouter."
      />
      <div className="space-y-6">
        <PrimaryEndpoint />
        <TunnelSection />
        <APIKeys />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Primary endpoint — hero card
// ---------------------------------------------------------------------------

function PrimaryEndpoint() {
  const access = useQuery({ queryKey: ["access-settings"], queryFn: () => api.accessSettings() });
  const [copied, setCopied] = useState(false);
  const url = access.data?.endpoint_url ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  };

  return (
    <Card>
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Primary endpoint
        </p>
        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <span className="truncate font-mono text-sm text-[var(--text)]">
              {url || "Loading…"}
            </span>
          </div>
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Point your applications at this URL. All providers are accessible through this single endpoint.
        </p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tunnel section — side-by-side cards
// ---------------------------------------------------------------------------

function TunnelSection() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Tunnels</h2>
        <p className="text-xs text-[var(--text-muted)]">Expose KeiRouter to external networks</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CloudflareTunnel />
        <TailscaleTunnel />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cloudflare tunnel card
// ---------------------------------------------------------------------------

function CloudflareTunnel() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const missRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();

  const status = useQuery({
    queryKey: ["tunnel-status"],
    queryFn: () => api.tunnelStatus(),
    refetchInterval: STATUS_POLL_SLOW,
  });

  const tunnel = status.data?.tunnel;
  const download = status.data?.download;
  const tunnelUrl = tunnel?.tunnelUrl || "";
  const publicUrl = tunnel?.publicUrl || "";
  const isRunning = tunnel?.running ?? false;
  const displayUrl = publicUrl || tunnelUrl;

  const pingTunnel = useCallback(async () => {
    const url = publicUrl || tunnelUrl;
    if (!url) return;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT);
      const res = await fetch(`${url}/healthz`, { mode: "cors", signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        setReachable(true);
        missRef.current = 0;
      } else {
        missRef.current++;
        if (missRef.current >= REACHABLE_MISS_THRESHOLD) setReachable(false);
      }
    } catch {
      missRef.current++;
      if (missRef.current >= REACHABLE_MISS_THRESHOLD) setReachable(false);
    }
  }, [publicUrl, tunnelUrl]);

  useEffect(() => {
    if (isRunning && (publicUrl || tunnelUrl)) {
      pingTunnel();
      pingTimerRef.current = setInterval(pingTunnel, PING_INTERVAL);
      const stopAt = Date.now() + PING_MAX_MS;
      const check = setInterval(() => {
        if (Date.now() > stopAt) {
          clearInterval(pingTimerRef.current);
          clearInterval(check);
        }
      }, 10000);
      return () => {
        clearInterval(pingTimerRef.current);
        clearInterval(check);
      };
    } else {
      setReachable(null);
      missRef.current = 0;
    }
  }, [isRunning, publicUrl, tunnelUrl, pingTunnel]);

  useEffect(() => {
    if (loading) {
      pollTimerRef.current = setInterval(
        () => qc.invalidateQueries({ queryKey: ["tunnel-status"] }),
        STATUS_POLL_FAST,
      );
      return () => clearInterval(pollTimerRef.current);
    }
  }, [loading, qc]);

  const enable = useMutation({
    mutationFn: () => api.tunnelEnable(),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      setLoading(false);
      qc.invalidateQueries({ queryKey: ["tunnel-status"] });
      qc.invalidateQueries({ queryKey: ["access-settings"] });
    },
    onError: () => setLoading(false),
  });

  const disable = useMutation({
    mutationFn: () => api.tunnelDisable(),
    onSuccess: () => {
      setReachable(null);
      qc.invalidateQueries({ queryKey: ["tunnel-status"] });
      qc.invalidateQueries({ queryKey: ["access-settings"] });
    },
  });

  return (
    <TunnelCard
      name="Cloudflare Tunnel"
      description="Quick tunnel — no account needed"
      logo={<CloudflareLogo className="h-5 w-5 text-[#F6821F]" />}
      brandColor="bg-[#F6821F]/10 text-[#F6821F] dark:bg-[#F6821F]/15"
      isRunning={isRunning}
      reachable={reachable}
      loading={loading}
      displayUrl={displayUrl}
      statusText={
        loading ? "Connecting…" : isRunning ? "Tunnel active" : "Tunnel inactive"
      }
      subText={
        download?.downloading
          ? `Downloading cloudflared… ${download.progress}%`
          : undefined
      }
      onEnable={() => enable.mutate()}
      onDisable={() => disable.mutate()}
      enablePending={enable.isPending}
      disablePending={disable.isPending}
    />
  );
}

// ---------------------------------------------------------------------------
// Tailscale tunnel card
// ---------------------------------------------------------------------------

function TailscaleTunnel() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [sudoPassword, setSudoPassword] = useState("");
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const missRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval>>();

  const status = useQuery({
    queryKey: ["tunnel-status"],
    queryFn: () => api.tunnelStatus(),
    refetchInterval: STATUS_POLL_SLOW,
  });

  const tsCheck = useQuery({
    queryKey: ["tailscale-check"],
    queryFn: () => api.tailscaleCheck(),
    refetchInterval: STATUS_POLL_SLOW,
  });

  const ts = status.data?.tailscale;
  const isRunning = ts?.running ?? false;
  const isLoggedIn = ts?.loggedIn ?? false;
  const isInstalled = tsCheck.data?.installed ?? false;
  const tunnelUrl = ts?.tunnelUrl || "";

  const pingTailscale = useCallback(async () => {
    if (!tunnelUrl) return;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT);
      const res = await fetch(`${tunnelUrl}/healthz`, { mode: "cors", signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        setReachable(true);
        missRef.current = 0;
      } else {
        missRef.current++;
        if (missRef.current >= REACHABLE_MISS_THRESHOLD) setReachable(false);
      }
    } catch {
      missRef.current++;
      if (missRef.current >= REACHABLE_MISS_THRESHOLD) setReachable(false);
    }
  }, [tunnelUrl]);

  useEffect(() => {
    if (isRunning && tunnelUrl) {
      pingTailscale();
      pingTimerRef.current = setInterval(pingTailscale, PING_INTERVAL);
      return () => clearInterval(pingTimerRef.current);
    } else {
      setReachable(null);
    }
  }, [isRunning, tunnelUrl, pingTailscale]);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallLog([]);
    try {
      const res = await fetch("/api/tunnel/tailscale-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sudoPassword }),
      });
      if (!res.ok || !res.body) {
        setInstallLog((prev) => [...prev, "Failed to start install"]);
        setInstalling(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const event = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith("data: ")) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                if (event === "progress") {
                  setInstallLog((prev) => [...prev, data.message]);
                } else if (event === "done") {
                  setInstallLog((prev) => [...prev, "Installation complete!"]);
                  setInstalling(false);
                  qc.invalidateQueries({ queryKey: ["tailscale-check"] });
                } else if (event === "error") {
                  setInstallLog((prev) => [...prev, `Error: ${data.error}`]);
                  setInstalling(false);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } catch (e) {
      setInstallLog((prev) => [...prev, `Error: ${(e as Error).message}`]);
      setInstalling(false);
    }
  };

  const enable = useMutation({
    mutationFn: () => api.tailscaleEnable(sudoPassword || undefined),
    onMutate: () => setLoading(true),
    onSuccess: (data: TailscaleEnableResult) => {
      setLoading(false);
      if (data.needsLogin && data.authUrl) {
        setAuthUrl(data.authUrl);
        window.open(data.authUrl, "_blank", "width=600,height=700");
      } else if (data.funnelNotEnabled && data.enableUrl) {
        window.open(data.enableUrl, "_blank", "width=600,height=700");
      } else if (data.success) {
        setAuthUrl(null);
        qc.invalidateQueries({ queryKey: ["tunnel-status"] });
        qc.invalidateQueries({ queryKey: ["access-settings"] });
      }
    },
    onError: () => setLoading(false),
  });

  const disable = useMutation({
    mutationFn: () => api.tailscaleDisable(),
    onSuccess: () => {
      setReachable(null);
      qc.invalidateQueries({ queryKey: ["tunnel-status"] });
      qc.invalidateQueries({ queryKey: ["access-settings"] });
    },
  });

  // Not installed — show install prompt.
  if (!isInstalled) {
    return (
      <Card className="flex flex-col">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2255CC]/10 text-[#2255CC] dark:bg-[#5990FF]/15 dark:text-[#5990FF]">
            <TailscaleLogo className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Tailscale</h3>
            <p className="text-xs text-[var(--text-muted)]">Private network with HTTPS</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between border-t border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Not installed on this machine</span>
          </div>
          {showInstall ? (
            <div className="mt-4 space-y-3">
              <Field label="Sudo password (for installation)">
                <Input
                  type="password"
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  placeholder="Required for system install"
                />
              </Field>
              <div className="flex gap-2">
                <Button onClick={handleInstall} disabled={installing || !sudoPassword.trim()}>
                  {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Install"}
                </Button>
                <Button variant="ghost" onClick={() => setShowInstall(false)}>
                  Cancel
                </Button>
              </div>
              {installLog.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-lg bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-ink-300">
                  {installLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => setShowInstall(true)} className="mt-4 w-full">
              Install Tailscale
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Installed — show tunnel controls.
  const statusText = loading
    ? "Connecting…"
    : isRunning
      ? "Funnel active"
      : isLoggedIn
        ? "Logged in"
        : "Not connected";

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2255CC]/10 text-[#2255CC] dark:bg-[#5990FF]/15 dark:text-[#5990FF]">
          <TailscaleLogo className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Tailscale</h3>
          <p className="text-xs text-[var(--text-muted)]">Private network with HTTPS</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-[var(--border)] px-5 py-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TunnelDot running={isRunning} reachable={reachable} loading={loading} />
            <span className="text-sm font-medium">{statusText}</span>
          </div>
          {isRunning && (
            <TunnelBadge reachable={reachable} />
          )}
        </div>

        {/* URL */}
        {isRunning && tunnelUrl && (
          <a
            href={tunnelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            {tunnelUrl}
            <ArrowUpRight className="h-3 w-3 shrink-0" />
          </a>
        )}

        {/* Auth URL */}
        {authUrl && (
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 dark:border-accent-800/50 dark:bg-accent-800/20">
            <p className="text-xs text-accent-700 dark:text-accent-200">
              Login required —{" "}
              <a href={authUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                authenticate here
              </a>
            </p>
          </div>
        )}

        {/* Sudo password for enable */}
        {!isRunning && isLoggedIn && (
          <Field label="Sudo password (optional, for TUN mode)">
            <Input
              type="password"
              value={sudoPassword}
              onChange={(e) => setSudoPassword(e.target.value)}
              placeholder="Leave empty for userspace"
            />
          </Field>
        )}

        {!isLoggedIn && (
          <p className="text-xs text-[var(--text-muted)]">
            Log in to your Tailscale account to enable the funnel.
          </p>
        )}

        {/* Actions — pushed to bottom */}
        <div className="mt-auto pt-2">
          {isRunning ? (
            <Button variant="danger" onClick={() => disable.mutate()} disabled={disable.isPending} className="w-full">
              {disable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
            </Button>
          ) : (
            <Button onClick={() => enable.mutate()} disabled={loading || enable.isPending} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared tunnel card (Cloudflare uses this, Tailscale has custom layout)
// ---------------------------------------------------------------------------

function TunnelCard({
  name,
  description,
  logo,
  brandColor,
  isRunning,
  reachable,
  loading,
  displayUrl,
  statusText,
  subText,
  onEnable,
  onDisable,
  enablePending,
  disablePending,
}: {
  name: string;
  description: string;
  logo: React.ReactNode;
  brandColor: string;
  isRunning: boolean;
  reachable: boolean | null;
  loading: boolean;
  displayUrl: string;
  statusText: string;
  subText?: string;
  onEnable: () => void;
  onDisable: () => void;
  enablePending: boolean;
  disablePending: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${brandColor}`}>
          {logo}
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{name}</h3>
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-[var(--border)] px-5 py-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TunnelDot running={isRunning} reachable={reachable} loading={loading} />
            <span className="text-sm font-medium">{statusText}</span>
          </div>
          {isRunning && (
            <TunnelBadge reachable={reachable} />
          )}
        </div>

        {/* URL */}
        {isRunning && displayUrl && (
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            {displayUrl}
            <ArrowUpRight className="h-3 w-3 shrink-0" />
          </a>
        )}

        {/* Download progress */}
        {subText && (
          <p className="text-xs text-[var(--text-muted)]">{subText}</p>
        )}

        {/* Actions — pushed to bottom */}
        <div className="mt-auto pt-2">
          {isRunning ? (
            <Button variant="danger" onClick={onDisable} disabled={disablePending} className="w-full">
              {disablePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
            </Button>
          ) : (
            <Button onClick={onEnable} disabled={loading || enablePending} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared tunnel UI atoms
// ---------------------------------------------------------------------------

function TunnelDot({
  running,
  reachable,
  loading,
}: {
  running: boolean;
  reachable: boolean | null;
  loading: boolean;
}) {
  const color = running
    ? reachable === true
      ? "bg-green-500"
      : reachable === false
        ? "bg-red-500"
        : "bg-amber-500 animate-pulse"
    : "bg-ink-300 dark:bg-ink-600";
  return <span className={`block h-2 w-2 rounded-full ${color}`} />;
}

function TunnelBadge({ reachable }: { reachable: boolean | null }) {
  const tone = reachable === true ? "success" : reachable === false ? "danger" : "neutral";
  const label = reachable === true ? "Reachable" : reachable === false ? "Unreachable" : "Checking…";
  return <Badge tone={tone}>{label}</Badge>;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

function APIKeys() {
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ["keys"], queryFn: () => api.listKeys() });
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => api.createKey(name),
    onSuccess: (data) => {
      setCreated(data);
      setName("");
      setError("");
      qc.invalidateQueries({ queryKey: ["keys"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });

  const toggleDisabled = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => api.updateKey(id, { disabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });

  return (
    <Card>
      <CardHeader
        title="API keys"
        description="Authenticate your applications"
        action={
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name"
              className="w-40 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) create.mutate();
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              <Plus className="h-4 w-4" />
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      />

      {created && (
        <div className="mx-5 mt-4 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 dark:border-accent-800/50 dark:bg-accent-800/20">
          <p className="text-xs font-medium text-accent-700 dark:text-accent-200">
            Copy this key now — it won't be shown again.
          </p>
          <code className="mt-1.5 block break-all font-mono text-sm">{created.key}</code>
        </div>
      )}

      {error && (
        <p className="mx-5 mt-3 text-xs text-[color:var(--color-danger)]">{error}</p>
      )}

      {keys.isLoading ? (
        <Spinner />
      ) : !keys.data?.keys?.length ? (
        <EmptyState title="No API keys yet" hint="Create a key to authenticate your app." />
      ) : (
        <div className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {keys.data.keys.map((k) => (
            <KeyRow
              key={k.id}
              k={k}
              onDelete={() => remove.mutate(k.id)}
              onToggle={() => toggleDisabled.mutate({ id: k.id, disabled: !k.disabled })}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function KeyRow({ k, onDelete, onToggle }: { k: APIKey; onDelete: () => void; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{k.name}</p>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">{k.display}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={k.disabled ? "neutral" : "success"}>
          {k.disabled ? "Disabled" : "Active"}
        </Badge>
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-ink-100 hover:text-[var(--text)] dark:hover:bg-ink-800"
          title={k.disabled ? "Enable key" : "Disable key"}
        >
          {k.disabled ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          title="Delete key"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
