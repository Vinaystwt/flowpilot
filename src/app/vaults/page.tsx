"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatShortHash, getConvictionScore } from "@/lib/vault-presentation";

export default function VaultsPage() {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchVaults = async () => {
      const email = localStorage.getItem("fp_email");
      if (!email) { router.push("/"); return; }

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase
        .from("vaults")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false });

      if (data) {
        const enriched = data.map((v: any) => {
          const secsSince = Math.max(1, (Date.now() - new Date(v.created_at).getTime()) / 1000);
          const annualRate = v.strategy.target_return_pct / 100;
          const simReturn = v.principal_usd * (1 + annualRate * (secsSince / (365 * 24 * 3600)));
          return { ...v, current_value_usd: parseFloat(simReturn.toFixed(2)) };
        });
        setVaults(enriched);
      }
      setLoading(false);
    };
    fetchVaults();
  }, [router]);

  const totalValue = vaults.reduce((sum, v) => sum + v.current_value_usd, 0);
  const totalPrincipal = vaults.reduce((sum, v) => sum + v.principal_usd, 0);
  const totalGain = totalValue - totalPrincipal;
  const totalGainPct = totalPrincipal > 0 ? ((totalGain / totalPrincipal) * 100).toFixed(2) : "0.00";

  const strategyColors: any = { conservative: "#00ff88", balanced: "#00d4ff", growth: "#ff6644" };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
      <div style={{ color: "#00d4ff" }}>Loading portfolio...</div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff" }}>FlowPilot</div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>Portfolio Overview</div>
          </div>
          <button
            onClick={() => { setCreating(true); router.push("/"); }}
            style={{ padding: "10px 20px", borderRadius: "100px", background: "linear-gradient(135deg, #00d4ff, #00ff88)", color: "#000", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            + New Vault
          </button>
        </div>

        {/* Portfolio summary */}
        {vaults.length > 0 && (
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "28px", marginBottom: "20px", boxShadow: "0 0 60px rgba(0,212,255,0.06)" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Total Portfolio</div>
            <div style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-2px", color: "white", marginBottom: "8px" }}>
              ${totalValue.toFixed(2)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700, color: totalGain >= 0 ? "#00ff88" : "#ff4466" }}>
                {totalGain >= 0 ? "+" : ""}{totalGainPct}%
              </span>
              <span style={{ color: "#444", fontSize: "13px" }}>
                {totalGain >= 0 ? "+" : ""}${totalGain.toFixed(2)} across {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Risk heatmap */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#333", marginBottom: "10px" }}>Risk Distribution</div>
              <div style={{ display: "flex", height: "8px", borderRadius: "100px", overflow: "hidden", gap: "2px" }}>
                {vaults.map((v, i) => {
                  const pct = (v.principal_usd / totalPrincipal) * 100;
                  return (
                    <div key={i} style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: strategyColors[v.strategy.strategy_type] || "#444",
                      borderRadius: "2px",
                    }} title={`${v.strategy.strategy_type}: ${pct.toFixed(0)}%`} />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                {["conservative", "balanced", "growth"].map((type) => {
                  const count = vaults.filter(v => v.strategy.strategy_type === type).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#444" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: strategyColors[type] }} />
                      {type} ({count})
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Individual vaults */}
        {vaults.length === 0 ? (
          <div style={{ textAlign: "center" as const, padding: "60px 20px", color: "#333" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#555", marginBottom: "8px" }}>No vaults yet</div>
            <div style={{ fontSize: "14px", marginBottom: "24px" }}>Create your first autopilot vault</div>
            <button onClick={() => router.push("/")}
              style={{ padding: "12px 24px", borderRadius: "100px", background: "linear-gradient(135deg, #00d4ff, #00ff88)", color: "#000", fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Create Vault →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
            {vaults.map((vault, i) => {
              const gain = vault.current_value_usd - vault.principal_usd;
              const gainPct = ((gain / vault.principal_usd) * 100).toFixed(3);
              const isPositive = gain >= 0;
              const color = strategyColors[vault.strategy.strategy_type] || "#444";
              const convictionScore = getConvictionScore(vault);

              return (
                <div
                  key={vault.id}
                  onClick={() => { localStorage.setItem("fp_vault_id", vault.id); router.push("/dashboard"); }}
                  style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px", cursor: "pointer", transition: "all 0.2s", position: "relative" as const }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "#1a1a1a"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "100px", background: `${color}15`, color, fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>
                        ● {vault.strategy.strategy_type}
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "999px", background: "#101722", color: "#a78bfa", fontWeight: 700 }}>
                          Score {convictionScore}/100
                        </span>
                        {vault.ipfs_cid && (
                          <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "999px", background: "#0d1711", color: "#8fffbf", fontWeight: 700 }}>
                            CID {formatShortHash(vault.ipfs_cid, 6)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "white" }}>
                        ${vault.current_value_usd.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: isPositive ? "#00ff88" : "#ff4466" }}>
                        {isPositive ? "+" : ""}{gainPct}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>
                        of {vault.strategy.target_return_pct}% goal
                      </div>
                    </div>
                  </div>

                  {/* Mini allocation bar */}
                  <div style={{ display: "flex", height: "3px", borderRadius: "100px", overflow: "hidden", gap: "2px", marginBottom: "12px" }}>
                    {vault.strategy.allocations.map((a: any, j: number) => (
                      <div key={j} style={{ width: `${a.percentage}%`, height: "100%", background: j === 0 ? "#00d4ff" : j === 1 ? "#00ff88" : "#a78bfa", borderRadius: "2px" }} />
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#444" }}>
                    <span>Principal: ${vault.principal_usd}</span>
                    <span>Created {new Date(vault.created_at).toLocaleDateString()}</span>
                    <span style={{ color: "#00d4ff" }}>View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center" as const, marginTop: "24px" }}>
          <button onClick={() => router.push("/dashboard")}
            style={{ background: "transparent", border: "none", color: "#333", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to current vault
          </button>
        </div>
      </div>
    </main>
  );
}
