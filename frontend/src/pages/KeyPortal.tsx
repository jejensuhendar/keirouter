import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchKeyUsage, fetchKeyUsageById, APIError } from "../lib/api";
import { Activity, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";

export function KeyPortalPage() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get("id") || "";
  const activeKey = params.get("key") || "";
  const [apiKeyInput, setApiKeyInput] = useState(activeKey || activeId);

  const authValue = activeId || activeKey;
  const isIdMode = !!activeId;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const val = apiKeyInput.trim();
    if (val) {
      if (val.startsWith("sk-")) {
        setParams({ key: val });
      } else {
        setParams({ id: val });
      }
    }
  };

  const handleLogout = () => {
    setParams({});
    setApiKeyInput("");
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["key-usage", authValue, isIdMode],
    queryFn: () => isIdMode ? fetchKeyUsageById(authValue) : fetchKeyUsage(authValue),
    enabled: !!authValue,
    retry: false,
    refetchInterval: 30000,
  });

  if (!authValue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-zinc-300 font-mono p-4">
        <div className="w-full max-w-md border-2 border-zinc-800 bg-black p-8 relative overflow-hidden">
          {/* Decorative Corner markers */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-zinc-600"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-zinc-600"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-zinc-600"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-zinc-600"></div>

          <div className="mb-8 flex flex-col items-center">
            <div className="h-12 w-12 border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-sm mb-4">
              <KeyRound size={24} />
            </div>
            <h1 className="text-xl tracking-widest text-white uppercase font-bold">Access Terminal</h1>
            <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wide">Enter valid API Key or ID to view telemetry</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-... or key ID"
                className="w-full bg-zinc-900 border-2 border-zinc-700 p-3 text-emerald-400 font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={!apiKeyInput.trim()}
              className="w-full bg-zinc-800 text-white border-2 border-zinc-700 py-3 uppercase tracking-wider font-bold hover:bg-zinc-700 hover:border-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-emerald-500 font-mono">
        <div className="flex items-center gap-3">
          <Activity className="animate-pulse" />
          <span className="uppercase tracking-widest">Establishing secure link...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    let msg = "Authentication failed or server error.";
    if (error instanceof APIError) {
      msg = error.message;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-zinc-300 font-mono p-4">
        <div className="w-full max-w-md border-2 border-red-900/50 bg-red-950/20 p-8 text-center relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/50"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/50"></div>
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-lg uppercase text-red-400 font-bold tracking-widest mb-2">Access Denied</h1>
          <p className="text-sm text-red-300/70">{msg}</p>
          <button 
            onClick={handleLogout}
            className="mt-6 border border-red-800 bg-red-900/20 text-red-400 px-6 py-2 text-xs uppercase tracking-wider hover:bg-red-900/40 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-mono p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-zinc-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Telemetry Dashboard</h1>
            </div>
            <div className="text-xs text-zinc-500 flex gap-4 uppercase">
              <span>ID: <span className="text-zinc-300">{d.key_id.split('-')[0]}***</span></span>
              <span>Name: <span className="text-emerald-400">{d.key_name}</span></span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-xs uppercase tracking-wider hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors self-start md:self-auto"
          >
            Disconnect
          </button>
        </header>

        {/* Allowed Models Panel */}
        {d.allowed_models && d.allowed_models.length > 0 && (
          <section className="border border-zinc-800 bg-black p-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">Authorized Models</h2>
            <div className="flex flex-wrap gap-2">
              {d.allowed_models.map(m => (
                <span key={m} className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  {m}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Current Period Usage Stats */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Current Period Diagnostics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Total Requests" value={d.current_period.total_requests.toLocaleString()} />
            <MetricCard label="Prompt Tokens" value={d.current_period.prompt_tokens.toLocaleString()} />
            <MetricCard label="Completion Tokens" value={d.current_period.completion_tokens.toLocaleString()} />
            <MetricCard label="Accrued Cost" value={`$${d.current_period.cost_usd.toFixed(4)}`} highlight />
          </div>
        </section>

        {/* Budgets */}
        {d.budgets && d.budgets.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">Active Constraints</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {d.budgets.map((b, i) => (
                <div key={i} className="border border-zinc-800 bg-black p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-emerald-500/50 transition-colors"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Budget Limit</h3>
                      <p className="text-xs text-zinc-500 uppercase">Period: {b.period}</p>
                    </div>
                    {b.alert && (
                      <span className="flex items-center gap-1 text-xs bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-1">
                        <AlertTriangle size={12} /> ALARM
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {b.limit_tokens > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="uppercase text-zinc-400">Tokens</span>
                          <span className="font-bold text-white">
                            {b.tokens_used.toLocaleString()} / {b.limit_tokens.toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar pct={b.tokens_pct_used} alert={b.alert} />
                        <p className="text-right text-[10px] text-zinc-500 mt-1 uppercase">
                          {b.tokens_remaining.toLocaleString()} remaining
                        </p>
                      </div>
                    )}

                    {b.limit_usd > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="uppercase text-zinc-400">USD Spend</span>
                          <span className="font-bold text-white">
                            ${b.spent_usd.toFixed(4)} / ${b.limit_usd.toFixed(2)}
                          </span>
                        </div>
                        <ProgressBar pct={b.usd_pct_used} alert={b.alert} />
                        <p className="text-right text-[10px] text-zinc-500 mt-1 uppercase">
                          ${b.usd_remaining.toFixed(4)} remaining
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`border p-4 relative ${highlight ? 'border-emerald-900/30 bg-emerald-950/10' : 'border-zinc-800 bg-black'}`}>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function ProgressBar({ pct, alert }: { pct: number, alert: boolean }) {
  const safePct = Math.min(Math.max(pct, 0), 100);
  const colorClass = alert 
    ? "bg-red-500" 
    : safePct > 80 ? "bg-amber-500" : "bg-emerald-500";
    
  return (
    <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 overflow-hidden relative">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,.5) 50%)', backgroundSize: '4px 4px' }}></div>
      <div 
        className={`h-full relative z-10 transition-all duration-1000 ease-out ${colorClass}`}
        style={{ width: `${safePct}%` }}
      >
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(0,0,0,.5) 25%, rgba(0,0,0,.5) 50%, transparent 50%, transparent 75%, rgba(0,0,0,.5) 75%, rgba(0,0,0,.5) 100%)', backgroundSize: '4px 4px' }}></div>
      </div>
    </div>
  );
}
