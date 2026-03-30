"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportSent, setReportSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [ipfsCID, setIpfsCID] = useState("");
  const [vaultCount, setVaultCount] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchVault = async () => {
      const vaultId = localStorage.getItem("fp_vault_id");
      const tx = localStorage.getItem("fp_tx_hash") || "";
      const cid = localStorage.getItem("fp_ipfs_cid") || "";
      setTxHash(tx);
      setIpfsCID(cid);

      if (!vaultId) { router.push("/"); return; }

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase.from("vaults").select("*").eq("id", vaultId).single();

      if (data) {
        const secsSince = Math.max(1, (Date.now() - new Date(data.created_at).getTime()) / 1000);
        const annualRate = data.strategy.target_return_pct / 100;
        const simReturn = data.principal_usd * (1 + annualRate * (secsSince / (365 * 24 * 3600)));
        data.current_value_usd = parseFloat(simReturn.toFixed(2));
        setVault(data);
      }
      setLoading(false);
    };
    fetchVault();

    // Fetch real vault count from chain
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/get-vault");
        const data = await res.json();
        if (data.totalVaults !== undefined) setVaultCount(data.totalVaults);
      } catch {}
    };
    fetchCount();
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ color: "#00d4ff" }}>Loading dashboard...</div>
    </div>
  );

  if (!vault) return null;

  const gain = vault.current_value_usd - vault.principal_usd;
  const gainPct = ((gain / vault.principal_usd) * 100).toFixed(4);
  const isPositive = gain >= 0;
  const progressPct = Math.min(
    ((vault.current_value_usd / vault.principal_usd - 1) / (vault.strategy.target_return_pct / 100)) * 100, 100
  ).toFixed(1);

  const activityFeed = [
    { time: "Just now", event: "Vault deployed on Flow Testnet", type: "deploy", hash: txHash },
    { time: "Just now", event: `Strategy uploaded to IPFS`, type: "ipfs", cid: ipfsCID },
    { time: "Scheduled", event: `Next rebalance check in ${vault.strategy.rebalance_frequency_days} days`, type: "schedule" },
    { time: "Scheduled", event: "Weekly performance report via email", type: "email" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", padding: "32px 20px" }}>
      <div style={{ maxWidth: "580px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff" }}>FlowPilot</div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>{vault.user_email}</div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "100px", background: "#00ff8812", color: "#00ff88", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff88", display: "inline-block" }} />
              Autopilot Active
            </div>
            {vaultCount !== null && (
              <div style={{ fontSize: "11px", color: "#333" }}>{vaultCount} vault{vaultCount !== 1 ? "s" : ""} on chain</div>
            )}
          </div>
        </div>

        {/* Main value */}
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "28px", marginBottom: "12px", boxShadow: "0 0 40px rgba(0,212,255,0.08)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Portfolio Value</div>
          <div style={{ fontSize: "52px", fontWeight: 900, letterSpacing: "-3px", color: "white", marginBottom: "12px" }}>
            ${vault.current_value_usd.toFixed(2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, color: isPositive ? "#00ff88" : "#ff4466" }}>
              {isPositive ? "+" : ""}{gainPct}%
            </span>
            <span style={{ color: "#444", fontSize: "13px" }}>
              {isPositive ? "+" : ""}${gain.toFixed(4)} since launch
            </span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#333" }}>
            Principal: ${vault.principal_usd.toFixed(2)} · Started {new Date(vault.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Goal progress */}
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444" }}>Goal Progress</div>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "white" }}>{progressPct}%</div>
          </div>
          <div style={{ height: "6px", background: "#1f1f1f", borderRadius: "100px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #00d4ff, #00ff88)", borderRadius: "100px" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>Target: {vault.strategy.target_return_pct}% · {vault.strategy.strategy_type} strategy</div>
        </div>

        {/* Two column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          {/* Allocation */}
          <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Allocation</div>
            {vault.strategy.allocations.map((a: any) => (
              <div key={a.protocol} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "white" }}>{a.protocol}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>{a.percentage}%</span>
                </div>
                <div style={{ height: "3px", background: "#1f1f1f", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ width: `${a.percentage}%`, height: "100%", background: "#00d4ff", borderRadius: "100px" }} />
                </div>
                <div style={{ fontSize: "10px", color: "#444", marginTop: "2px", textTransform: "capitalize" as const }}>{a.type}</div>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Settings</div>
            {[
              { label: "Strategy", value: vault.strategy.strategy_type },
              { label: "Rebalance", value: `${vault.strategy.rebalance_frequency_days}d` },
              { label: "Exit at", value: `${vault.strategy.exit_threshold_pct}%` },
              { label: "Max/protocol", value: `${vault.strategy.max_single_protocol_pct}%` },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: "#444", textTransform: "capitalize" as const }}>{item.label}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "white", textTransform: "capitalize" as const }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Autopilot Activity</div>
          {activityFeed.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: i < activityFeed.length - 1 ? "1px solid #1a1a1a" : "none" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.type === "deploy" ? "#00d4ff" : item.type === "ipfs" ? "#00ff88" : "#444", marginTop: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", color: "white", marginBottom: "2px" }}>{item.event}</div>
                <div style={{ fontSize: "11px", color: "#444" }}>{item.time}</div>
                {item.hash && (
                  <a href={`https://testnet.flowscan.io/transaction/${item.hash}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: "11px", color: "#00d4ff", textDecoration: "none", display: "block", marginTop: "2px", fontFamily: "monospace" }}>
                    {item.hash.slice(0, 12)}...{item.hash.slice(-8)} ↗
                  </a>
                )}
                {item.cid && item.cid.length > 10 && (
                  <a href={`https://ipfs.io/ipfs/${item.cid}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: "11px", color: "#00ff88", textDecoration: "none", display: "block", marginTop: "2px", fontFamily: "monospace" }}>
                    ipfs://{item.cid.slice(0, 12)}...{item.cid.slice(-6)} ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contract proof */}
        <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "10px" }}>On-Chain Proof</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
            <a href={`https://testnet.flowscan.io/account/0xf8105fdaa45bc140`} target="_blank" rel="noreferrer"
              style={{ fontSize: "12px", color: "#00d4ff", textDecoration: "none", fontFamily: "monospace" }}>
              Contract: 0xf8105fdaa45bc140 ↗
            </a>
            {ipfsCID && (
              <a href={`https://ipfs.io/ipfs/${ipfsCID}`} target="_blank" rel="noreferrer"
                style={{ fontSize: "12px", color: "#00ff88", textDecoration: "none", fontFamily: "monospace" }}>
                IPFS Strategy: {ipfsCID.slice(0, 20)}... ↗
              </a>
            )}
            <div style={{ fontSize: "12px", color: "#333", fontFamily: "monospace" }}>
              Network: Flow Testnet
            </div>
          </div>
        </div>

        {/* Send report */}
        <button
          onClick={sendReport}
          disabled={sending}
          style={{ width: "100%", padding: "16px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: `1px solid ${reportSent ? "#00ff88" : "#1f1f1f"}`, background: reportSent ? "#00ff8812" : "#111", color: reportSent ? "#00ff88" : "white", cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.3s", marginBottom: "12px" }}
        >
          {sending ? "Sending..." : reportSent ? "✓ Report sent!" : "Send Performance Report Now"}
        </button>

        <div style={{ textAlign: "center" as const, fontSize: "11px", color: "#2a2a2a", lineHeight: 2 }}>
          Strategy stored on IPFS · Vault registered on Flow Testnet<br />
          Autopilot checks every {vault.strategy.rebalance_frequency_days} days · 15% performance fee on gains
        </div>

        <div style={{ textAlign: "center" as const, marginTop: "16px" }}>
          <button onClick={() => { localStorage.clear(); router.push("/"); }}
            style={{ background: "transparent", border: "none", color: "#2a2a2a", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            Modify strategy with AI →
          </button>
        </div>
      </div>
    </main>
  );
}
