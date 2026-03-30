"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ExplorePage() {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalValue: 0, avgReturn: 0 });
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase
        .from("vaults")
        .select("id, strategy, principal_usd, current_value_usd, status, created_at, ipfs_cid")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        const enriched = data.map((v: any) => {
          const secsSince = Math.max(1, (Date.now() - new Date(v.created_at).getTime()) / 1000);
          const simReturn = v.principal_usd * (1 + (v.strategy.target_return_pct / 100) * (secsSince / (365 * 24 * 3600)));
          return { ...v, current_value_usd: parseFloat(simReturn.toFixed(2)) };
        });
        setVaults(enriched);
        const totalValue = enriched.reduce((s: number, v: any) => s + v.current_value_usd, 0);
        const totalPrincipal = enriched.reduce((s: number, v: any) => s + v.principal_usd, 0);
        const avgReturn = totalPrincipal > 0 ? ((totalValue - totalPrincipal) / totalPrincipal) * 100 : 0;
        setStats({ total: enriched.length, totalValue, avgReturn });
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const strategyColors: any = { conservative: "#00ff88", balanced: "#00d4ff", growth: "#ff6644" };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#00d4ff", letterSpacing: "-1px" }}>FlowPilot</div>
            <div style={{ fontSize: "13px", color: "#444", marginTop: "2px" }}>Public Vault Explorer</div>
          </div>
          <button onClick={() => router.push("/")} style={{ padding: "8px 18px", borderRadius: "100px", background: "linear-gradient(135deg, #00d4ff, #00ff88)", color: "#000", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Create Vault
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "28px" }}>
          {[
            { label: "Active Vaults", value: stats.total.toString() },
            { label: "Total Value", value: "$" + stats.totalValue.toFixed(0) },
            { label: "Avg Return", value: "+" + stats.avgReturn.toFixed(3) + "%" },
          ].map((item) => (
            <div key={item.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "white", letterSpacing: "-1px" }}>{item.value}</div>
              <div style={{ fontSize: "11px", color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#333", marginBottom: "12px" }}>
          Live Vaults on Flow Testnet
        </div>

        {loading ? (
          <div style={{ color: "#444", textAlign: "center", padding: "40px" }}>Loading vaults...</div>
        ) : vaults.length === 0 ? (
          <div style={{ color: "#444", textAlign: "center", padding: "40px" }}>No vaults yet. Be the first.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {vaults.map((vault, i) => {
              const gain = vault.current_value_usd - vault.principal_usd;
              const gainPct = ((gain / vault.principal_usd) * 100).toFixed(3);
              const color = strategyColors[vault.strategy.strategy_type] || "#444";
              return (
                <div key={vault.id} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: color + "20", border: "1px solid " + color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>${vault.current_value_usd.toFixed(2)}</span>
                      <span style={{ fontSize: "12px", color: gain >= 0 ? "#00ff88" : "#ff4466", fontWeight: 600 }}>+{gainPct}%</span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: color + "15", color, fontWeight: 700 }}>{vault.strategy.strategy_type}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {vault.strategy.allocations.map((a: any) => (
                        <span key={a.protocol} style={{ fontSize: "10px", color: "#444" }}>{a.protocol} {a.percentage}%</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "11px", color: "#444", marginBottom: "2px" }}>
                    Score: <span style={{ color: "#a78bfa", fontWeight: 700 }}>
                      {Math.min(100, Math.round(
                        ((vault.current_value_usd - vault.principal_usd) / vault.principal_usd / (vault.strategy.target_return_pct / 100)) * 60 +
                        (vault.strategy.strategy_type === "conservative" ? 20 : vault.strategy.strategy_type === "balanced" ? 15 : 10) +
                        Math.min(20, ((Date.now() - new Date(vault.created_at).getTime()) / (1000 * 60 * 60 * 24)) * 2)
                      ))}
                    </span>/100
                  </div>
                  <div style={{ fontSize: "11px", color: "#333" }}>{new Date(vault.created_at).toLocaleDateString()}</div>
                    {vault.ipfs_cid && (
                      <a href={"https://ipfs.io/ipfs/" + vault.ipfs_cid} target="_blank" rel="noreferrer" style={{ fontSize: "10px", color: "#00ff88", textDecoration: "none", fontFamily: "monospace" }}>
                        IPFS ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", color: "#1a1a1a" }}>
          All vaults run on Flow Testnet · Strategy configs stored on IPFS · 15% performance fee on gains
        </div>
      </div>
    </div>
  );
}
