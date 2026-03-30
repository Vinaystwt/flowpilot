"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategyJSON } from "@/lib/types";

export default function ConfirmPage() {
  const [strategy, setStrategy] = useState<StrategyJSON | null>(null);
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = localStorage.getItem("fp_strategy");
    const i = localStorage.getItem("fp_intent");
    const e = localStorage.getItem("fp_email");
    if (!s || !i || !e) { router.push("/"); return; }
    setStrategy(JSON.parse(s));
    setIntent(i);
    setEmail(e);
  }, [router]);

  const launchVault = async () => {
    if (!strategy || !email) return;
    setIsLaunching(true);
    try {
      const ipfsRes = await fetch("/api/store-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, userEmail: email }),
      });
      const ipfsData = await ipfsRes.json();

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: vaultData, error } = await supabase
        .from("vaults")
        .insert({
          user_email: email,
          flow_address: "0xf8105fdaa45bc140",
          strategy: strategy,
          ipfs_cid: ipfsData.cid || "demo-cid",
          current_value_usd: strategy.principal_usd,
          principal_usd: strategy.principal_usd,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      localStorage.setItem("fp_vault_id", vaultData.id);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Launch failed. Please try again.");
      setIsLaunching(false);
    }
  };

  if (!strategy) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--accent)" }}>Loading...</div>
    </div>
  );

  const strategyColor = { conservative: "#00ff88", balanced: "#00d4ff", growth: "#ff6644" }[strategy.strategy_type];

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-1px", color: "var(--accent)", marginBottom: "8px" }}>FlowPilot</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px 0" }}>Your strategy is ready.</h2>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>Review and confirm to launch your autopilot.</p>
        </div>

        {/* Intent echo */}
        <div style={{ background: "#0a1a0a", border: "1px solid #1a2a1a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "8px" }}>You said</div>
          <div style={{ fontSize: "14px", color: "#aaa", fontStyle: "italic" }}>"{intent}"</div>
        </div>

        {/* Strategy card */}
        <div className="glow" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-muted)", marginBottom: "20px" }}>Your Autopilot Strategy</div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Starting Amount", value: `$${strategy.principal_usd}` },
              { label: "Target Return", value: `${strategy.target_return_pct}%` },
              { label: "Time Horizon", value: `${Math.round(strategy.time_horizon_days / 30)} months` },
              { label: "Rebalance", value: `Every ${strategy.rebalance_frequency_days}d` },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Strategy badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "100px", background: `${strategyColor}18`, color: strategyColor, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "20px" }}>
            ● {strategy.strategy_type.toUpperCase()} STRATEGY
          </div>

          {/* Allocations */}
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Allocation</div>
          {strategy.allocations.map((a) => (
            <div key={a.protocol} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", flex: 1 }}>{a.protocol}</div>
              <div style={{ fontSize: "12px", color: "#555", textTransform: "capitalize", width: "56px" }}>{a.type}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, width: "40px", textAlign: "right" }}>{a.percentage}%</div>
              <div style={{ width: "80px", height: "4px", borderRadius: "100px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${a.percentage}%`, height: "100%", background: "var(--accent)", borderRadius: "100px" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Exit protection */}
        <div style={{ background: "#1a0a0a", border: "1px solid #2a1515", borderRadius: "12px", padding: "14px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "4px" }}>Auto-Exit Protection</div>
          <div style={{ fontSize: "14px", color: "#aaa" }}>
            Exit everything if return drops below{" "}
            <span style={{ color: "#ff4466", fontWeight: 700 }}>{strategy.exit_threshold_pct}%</span>
          </div>
        </div>

        <button
          onClick={launchVault}
          disabled={isLaunching}
          style={{ width: "100%", padding: "16px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: isLaunching ? "not-allowed" : "pointer", background: isLaunching ? "#333" : "linear-gradient(135deg, var(--accent), var(--accent-green))", color: isLaunching ? "#666" : "#000", transition: "all 0.2s", marginBottom: "12px" }}
        >
          {isLaunching ? "Deploying vault on Flow..." : "Launch Autopilot →"}
        </button>

        <button
          onClick={() => router.push("/")}
          style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "#555", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
        >
          ← Edit my goal
        </button>
      </div>
    </main>
  );
}
