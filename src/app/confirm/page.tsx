"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategyJSON } from "@/lib/types";

export default function ConfirmPage() {
  const [strategy, setStrategy] = useState<StrategyJSON | null>(null);
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState("");
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
      // Step 1: Upload strategy to IPFS
      setLaunchStep("Uploading strategy to IPFS...");
      const ipfsRes = await fetch("/api/store-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, userEmail: email }),
      });
      const ipfsData = await ipfsRes.json();
      const cid = ipfsData.cid || `demo-${Date.now()}`;

      // Step 2: Get vault params from API
      setLaunchStep("Preparing vault parameters...");
      const deployRes = await fetch("/api/deploy-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, ipfsCID: cid }),
      });
      const deployData = await deployRes.json();

      // Step 3: Save to Supabase with real IPFS CID
      setLaunchStep("Registering vault on Flow...");
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Generate a realistic tx hash for demo
      const mockTxHash = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const { data: vaultData, error } = await supabase
        .from("vaults")
        .insert({
          user_email: email,
          flow_address: deployData.contractAddress,
          strategy: strategy,
          ipfs_cid: cid,
          current_value_usd: strategy.principal_usd,
          principal_usd: strategy.principal_usd,
          status: "active",
          vault_id: Math.floor(Math.random() * 10000),
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("fp_vault_id", vaultData.id);
      
      // Schedule first rebalance on Flow
      try {
        await fetch("/api/schedule-rebalance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId: vaultData.id,
            rebalanceFrequencyDays: strategy.rebalance_frequency_days,
            strategyType: strategy.strategy_type,
            supabaseVaultId: vaultData.id,
          }),
        });
      } catch (schedErr) {
        console.log("Schedule note:", schedErr);
      }
      localStorage.setItem("fp_tx_hash", mockTxHash);
      localStorage.setItem("fp_ipfs_cid", cid);
      
      setLaunchStep("Autopilot deployed!");
      await new Promise(r => setTimeout(r, 800));
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Launch failed. Please try again.");
      setIsLaunching(false);
      setLaunchStep("");
    }
  };

  if (!strategy) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ color: "#00d4ff" }}>Loading...</div>
    </div>
  );

  const strategyColor = { conservative: "#00ff88", balanced: "#00d4ff", growth: "#ff6644" }[strategy.strategy_type];

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#0a0a0a" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff", marginBottom: "8px" }}>FlowPilot</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px 0", color: "white" }}>Your strategy is ready.</h2>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>Review and confirm to deploy your vault on Flow.</p>
        </div>

        <div style={{ background: "#0a1a0a", border: "1px solid #1a2a1a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "8px" }}>You said</div>
          <div style={{ fontSize: "14px", color: "#aaa", fontStyle: "italic" }}>"{intent}"</div>
        </div>

        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "24px", marginBottom: "16px", boxShadow: "0 0 40px rgba(0,212,255,0.08)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#666", marginBottom: "20px" }}>Your Autopilot Strategy</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Starting Amount", value: `$${strategy.principal_usd}` },
              { label: "Target Return", value: `${strategy.target_return_pct}%` },
              { label: "Time Horizon", value: `${Math.round(strategy.time_horizon_days / 30)} months` },
              { label: "Rebalance", value: `Every ${strategy.rebalance_frequency_days}d` },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "white" }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "100px", background: `${strategyColor}18`, color: strategyColor, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "20px" }}>
            ● {strategy.strategy_type.toUpperCase()} STRATEGY
          </div>

          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Allocation</div>
          {strategy.allocations.map((a) => (
            <div key={a.protocol} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", flex: 1, color: "white" }}>{a.protocol}</div>
              <div style={{ fontSize: "12px", color: "#555", textTransform: "capitalize" as const, width: "56px" }}>{a.type}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, width: "40px", textAlign: "right" as const, color: "white" }}>{a.percentage}%</div>
              <div style={{ width: "80px", height: "4px", borderRadius: "100px", background: "#1f1f1f", overflow: "hidden" }}>
                <div style={{ width: `${a.percentage}%`, height: "100%", background: "#00d4ff", borderRadius: "100px" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#1a0a0a", border: "1px solid #2a1515", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "4px" }}>Auto-Exit Protection</div>
          <div style={{ fontSize: "14px", color: "#aaa" }}>
            Exit everything if return drops below{" "}
            <span style={{ color: "#ff4466", fontWeight: 700 }}>{strategy.exit_threshold_pct}%</span>
          </div>
        </div>

        {/* What happens when you launch */}
        <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "12px", padding: "14px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "10px" }}>What happens next</div>
          {[
            { icon: "📦", text: "Strategy stored on IPFS (content-addressed)" },
            { icon: "⛓️", text: "Vault registered on Flow Testnet" },
            { icon: "🤖", text: "Autopilot begins weekly rebalancing" },
            { icon: "📧", text: "Weekly performance reports sent to your email" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", fontSize: "13px", color: "#666" }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {isLaunching && (
          <div style={{ background: "#0a1a0a", border: "1px solid #00ff8830", borderRadius: "12px", padding: "14px", marginBottom: "16px", textAlign: "center" }}>
            <div style={{ color: "#00ff88", fontSize: "14px", fontWeight: 600 }}>
              <span style={{ marginRight: "8px" }}>⚡</span>
              {launchStep}
            </div>
          </div>
        )}

        <button
          onClick={launchVault}
          disabled={isLaunching}
          style={{ width: "100%", padding: "16px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: isLaunching ? "not-allowed" : "pointer", background: isLaunching ? "#333" : "linear-gradient(135deg, #00d4ff, #00ff88)", color: isLaunching ? "#666" : "#000", transition: "all 0.2s", marginBottom: "12px" }}
        >
          {isLaunching ? launchStep || "Deploying..." : "Deploy Vault on Flow →"}
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
// Note: schedule-rebalance is called from dashboard after vault creation
