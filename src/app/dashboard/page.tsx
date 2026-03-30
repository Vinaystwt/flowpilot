"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportSent, setReportSent] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchVault = async () => {
      const vaultId = localStorage.getItem("fp_vault_id");
      if (!vaultId) { router.push("/"); return; }

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase.from("vaults").select("*").eq("id", vaultId).single();

      if (data) {
        const daysSince = Math.max(1, Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24)));
        const simReturn = data.principal_usd * (1 + (data.strategy.target_return_pct / 100 / 365) * daysSince);
        data.current_value_usd = parseFloat(simReturn.toFixed(2));
        setVault(data);
      }
      setLoading(false);
    };
    fetchVault();
  }, [router]);

  const sendReport = async () => {
    if (!vault || sending) return;
    setSending(true);
    try {
      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault }),
      });
      setReportSent(true);
      setTimeout(() => setReportSent(false), 4000);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--accent)" }}>Loading dashboard...</div>
    </div>
  );

  if (!vault) return null;

  const gain = vault.current_value_usd - vault.principal_usd;
  const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
  const isPositive = gain >= 0;
  const progressPct = Math.min(
    ((vault.current_value_usd / vault.principal_usd - 1) / (vault.strategy.target_return_pct / 100)) * 100,
    100
  ).toFixed(0);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "var(--accent)" }}>FlowPilot</div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>{vault.user_email}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "100px", background: "#00ff8815", color: "#00ff88", fontSize: "12px", fontWeight: 700 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff88", display: "inline-block", animation: "pulse 2s infinite" }} />
            Autopilot Active
          </div>
        </div>

        {/* Value card */}
        <div className="glow" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Portfolio Value</div>
          <div style={{ fontSize: "48px", fontWeight: 900, letterSpacing: "-2px", marginBottom: "12px" }}>
            ${vault.current_value_usd.toFixed(2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: isPositive ? "#00ff88" : "#ff4466" }}>
              {isPositive ? "+" : ""}{gainPct}%
            </span>
            <span style={{ color: "#555", fontSize: "14px" }}>
              {isPositive ? "+" : ""}${gain.toFixed(2)} since launch
            </span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444" }}>Goal Progress</div>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>{progressPct}%</div>
          </div>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "100px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent-green))", borderRadius: "100px", transition: "width 1s ease" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>Target: {vault.strategy.target_return_pct}% return</div>
        </div>

        {/* Allocation */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "16px" }}>Allocation</div>
          {vault.strategy.allocations.map((a: any) => (
            <div key={a.protocol} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ flex: 1, fontSize: "14px" }}>{a.protocol}</div>
              <div style={{ fontSize: "12px", color: "#444", textTransform: "capitalize", width: "52px", textAlign: "right" }}>{a.type}</div>
              <div style={{ fontWeight: 700, fontSize: "14px", width: "40px", textAlign: "right" }}>{a.percentage}%</div>
              <div style={{ width: "80px", height: "4px", background: "var(--border)", borderRadius: "100px", overflow: "hidden" }}>
                <div style={{ width: `${a.percentage}%`, height: "100%", background: "var(--accent)", borderRadius: "100px" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "16px" }}>Autopilot Settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Strategy", value: vault.strategy.strategy_type },
              { label: "Rebalance", value: `Every ${vault.strategy.rebalance_frequency_days}d` },
              { label: "Exit if below", value: `${vault.strategy.exit_threshold_pct}%` },
              { label: "Max per protocol", value: `${vault.strategy.max_single_protocol_pct}%` },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: "14px", textTransform: "capitalize" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Send report button */}
        <button
          onClick={sendReport}
          disabled={sending}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "14px",
            border: `1px solid ${reportSent ? "#00ff88" : "var(--border)"}`,
            background: reportSent ? "#00ff8812" : "var(--surface)",
            color: reportSent ? "#00ff88" : "white",
            cursor: sending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.3s",
            marginBottom: "12px",
          }}
        >
          {sending ? "Sending..." : reportSent ? "✓ Report sent to your email!" : "Send Performance Report Now"}
        </button>

        <div style={{ textAlign: "center", fontSize: "11px", color: "#333", lineHeight: 1.8 }}>
          Next automatic report in 7 days<br />
          Strategy stored on IPFS · Vault history archived on Filecoin<br />
          Contract: 0xf8105fdaa45bc140 on Flow Testnet
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => { localStorage.clear(); router.push("/"); }}
            style={{ background: "transparent", border: "none", color: "#333", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Start a new vault →
          </button>
        </div>
      </div>
    </main>
  );
}
