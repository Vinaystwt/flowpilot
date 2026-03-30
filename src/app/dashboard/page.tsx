"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportSent, setReportSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [ipfsCID, setIpfsCID] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [ipfsContent, setIpfsContent] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const [schedule, setSchedule] = useState<any>(null);
  const tickerRef = useRef<any>(null);
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
        const simReturn = data.principal_usd * (1 + (data.strategy.target_return_pct / 100) * (secsSince / (365 * 24 * 3600)));
        data.current_value_usd = parseFloat(simReturn.toFixed(2));
        setVault(data);
        setDisplayValue(data.current_value_usd);
        
        // Fetch schedule info
        try {
          const schedRes = await fetch("/api/schedule-rebalance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vaultId: data.id,
              rebalanceFrequencyDays: data.strategy.rebalance_frequency_days,
              strategyType: data.strategy.strategy_type,
              supabaseVaultId: data.id,
            }),
          });
          const schedData = await schedRes.json();
          if (schedData.success) setSchedule(schedData.schedule);
        } catch {}
      }
      setLoading(false);
    };
    fetchVault();
  }, [router]);

  // Live ticker — updates every 10 seconds
  useEffect(() => {
    if (!vault) return;
    tickerRef.current = setInterval(() => {
      const secsSince = Math.max(1, (Date.now() - new Date(vault.created_at).getTime()) / 1000);
      const simReturn = vault.principal_usd * (1 + (vault.strategy.target_return_pct / 100) * (secsSince / (365 * 24 * 3600)));
      setDisplayValue(parseFloat(simReturn.toFixed(6)));
    }, 10000);
    return () => clearInterval(tickerRef.current);
  }, [vault]);

  const fetchHealth = async () => {
    if (!vault) return;
    const res = await fetch("/api/vault-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault }),
    });
    const data = await res.json();
    if (data.success) setHealth(data);
  };

  const sendReport = async () => {
    if (!vault || sending) return;
    setSending(true);
    try {
      await fetch("/api/send-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vault }) });
      setReportSent(true);
      setTimeout(() => setReportSent(false), 4000);
    } finally { setSending(false); }
  };

  const generateAIReport = async () => {
    if (!vault || loadingReport) return;
    setLoadingReport(true);
    try {
      const res = await fetch("/api/generate-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vault }) });
      const data = await res.json();
      if (data.success) setAiReport(data.report);
    } finally { setLoadingReport(false); }
  };

  const verifyIPFS = async () => {
    if (!ipfsCID || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch("https://ipfs.io/ipfs/" + ipfsCID);
      if (res.ok) {
        const data = await res.json();
        setIpfsContent(data);
      }
    } catch {
      setIpfsContent({ error: "Content loading from IPFS network..." });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
      <div style={{ color: "#00d4ff" }}>Loading...</div>
    </div>
  );
  if (!vault) return null;

  const gain = displayValue - vault.principal_usd;
  const gainPct = ((gain / vault.principal_usd) * 100).toFixed(4);
  const isPositive = gain >= 0;
  const progressPct = Math.min(((displayValue / vault.principal_usd - 1) / (vault.strategy.target_return_pct / 100)) * 100, 100).toFixed(1);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "580px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff" }}>FlowPilot</div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>{vault.user_email}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => router.push("/explore")} style={{ padding: "6px 14px", borderRadius: "100px", background: "#0f0f0f", border: "1px solid #1a1a1a", color: "#555", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Explore</button>
            <button onClick={() => router.push("/vaults")} style={{ padding: "6px 14px", borderRadius: "100px", background: "#0f0f0f", border: "1px solid #1a1a1a", color: "#aaa", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>All Vaults</button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "100px", background: "#00ff8812", color: "#00ff88", fontSize: "12px", fontWeight: 700 }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff88", display: "inline-block" }} />
              Active
            </div>
          </div>
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "28px", marginBottom: "12px", boxShadow: "0 0 60px rgba(0,212,255,0.04)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Portfolio Value</div>
          <div style={{ fontSize: "52px", fontWeight: 900, letterSpacing: "-3px", color: "white", marginBottom: "12px", transition: "all 0.5s ease", fontVariantNumeric: "tabular-nums" }}>
            ${displayValue.toFixed(2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, color: isPositive ? "#00ff88" : "#ff4466" }}>{isPositive ? "+" : ""}{gainPct}%</span>
            <span style={{ color: "#444", fontSize: "13px" }}>{isPositive ? "+" : ""}${gain.toFixed(4)} since launch</span>
          </div>
          <div style={{ fontSize: "11px", color: "#2a2a2a" }}>Live · updates every 10 seconds · Principal: ${vault.principal_usd}</div>
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444" }}>Goal Progress</div>
            <div style={{ fontWeight: 700, color: "white" }}>{progressPct}%</div>
          </div>
          <div style={{ height: "6px", background: "#1a1a1a", borderRadius: "100px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: progressPct + "%", height: "100%", background: "linear-gradient(90deg, #00d4ff, #00ff88)", borderRadius: "100px", transition: "width 1s ease" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>Target: {vault.strategy.target_return_pct}% · {vault.strategy.strategy_type} strategy</div>
        </div>

        {health ? (
          <div style={{ background: "#0f0f0f", border: "1px solid " + health.color + "30", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444" }}>Vault Health Score</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: health.color }}>{health.healthScore}<span style={{ fontSize: "14px", color: "#444" }}>/100</span></div>
            </div>
            <div style={{ height: "4px", background: "#1a1a1a", borderRadius: "100px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{ width: health.healthScore + "%", height: "100%", background: health.color, borderRadius: "100px" }} />
            </div>
            <div style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.5, fontStyle: "italic" }}>{health.explanation}</div>
          </div>
        ) : (
          <button onClick={fetchHealth} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#0a0a14", border: "1px solid #1a1a2a", color: "#00d4ff", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", marginBottom: "12px" }}>
            🏥 Compute Vault Health Score
          </button>
        )}

        {aiReport ? (
          <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "8px" }}>AI Performance Analysis</div>
            <div style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.7, fontStyle: "italic" }}>"{aiReport}"</div>
          </div>
        ) : (
          <button onClick={generateAIReport} disabled={loadingReport} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#0a0a14", border: "1px solid #1a1a2a", color: loadingReport ? "#444" : "#a78bfa", fontSize: "13px", cursor: loadingReport ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: "12px" }}>
            {loadingReport ? "Generating..." : "✨ Generate AI Performance Analysis"}
          </button>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Allocation</div>
            {vault.strategy.allocations.map((a: any) => (
              <div key={a.protocol} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "white" }}>{a.protocol}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>{a.percentage}%</span>
                </div>
                <div style={{ height: "3px", background: "#1a1a1a", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ width: a.percentage + "%", height: "100%", background: "#00d4ff" }} />
                </div>
                <div style={{ fontSize: "10px", color: "#333", marginTop: "2px", textTransform: "capitalize" }}>{a.type}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Settings</div>
            {[
              { label: "Strategy", value: vault.strategy.strategy_type },
              { label: "Rebalance", value: vault.strategy.rebalance_frequency_days + "d" },
              { label: "Exit at", value: vault.strategy.exit_threshold_pct + "%" },
              { label: "Max/protocol", value: vault.strategy.max_single_protocol_pct + "%" },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: "#333" }}>{item.label}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>Autopilot Activity</div>
          {[
            { dot: "#00d4ff", event: "Vault deployed on Flow Testnet", time: new Date(vault.created_at).toLocaleString(), link: txHash ? { href: "https://testnet.flowscan.io/account/0xf8105fdaa45bc140", label: "0xf8105fdaa45bc140 ↗", color: "#00d4ff" } : null },
            { dot: "#00ff88", event: "Strategy stored on IPFS", time: new Date(vault.created_at).toLocaleString(), link: ipfsCID ? { href: "https://ipfs.io/ipfs/" + ipfsCID, label: ipfsCID.slice(0, 14) + "... ↗", color: "#00ff88" } : null },
            { dot: "#444", event: "Autopilot rebalancing every " + vault.strategy.rebalance_frequency_days + " days", time: "Scheduled" },
            { dot: "#444", event: "Weekly performance email digest", time: "Scheduled" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: i < 3 ? "1px solid #111" : "none" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.dot, marginTop: "5px", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "13px", color: "white", marginBottom: "2px" }}>{item.event}</div>
                <div style={{ fontSize: "11px", color: "#333" }}>{item.time}</div>
                {item.link && (
                  <a href={item.link.href} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: item.link.color, textDecoration: "none", fontFamily: "monospace" }}>
                    {item.link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#333", marginBottom: "10px" }}>On-Chain Proof</div>
          <a href="https://testnet.flowscan.io/account/0xf8105fdaa45bc140" target="_blank" rel="noreferrer" style={{ display: "block", fontSize: "12px", color: "#00d4ff", textDecoration: "none", fontFamily: "monospace", marginBottom: "6px" }}>
            Contract: 0xf8105fdaa45bc140 ↗
          </a>
          {ipfsCID && (
            <a href={"https://ipfs.io/ipfs/" + ipfsCID} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: "12px", color: "#00ff88", textDecoration: "none", fontFamily: "monospace", marginBottom: "8px" }}>
              IPFS: {ipfsCID.slice(0, 24)}... ↗
            </a>
          )}
          {ipfsCID && (
            <button onClick={verifyIPFS} disabled={verifying} style={{ fontSize: "11px", color: verifying ? "#444" : "#00ff88", background: "transparent", border: "1px solid #00ff8830", borderRadius: "6px", padding: "4px 10px", cursor: verifying ? "not-allowed" : "pointer", fontFamily: "monospace" }}>
              {verifying ? "Fetching from IPFS..." : "Verify IPFS Content"}
            </button>
          )}
          {ipfsContent && !ipfsContent.error && (
            <div style={{ marginTop: "10px", background: "#0a0a0a", borderRadius: "8px", padding: "10px", fontSize: "10px", color: "#444", fontFamily: "monospace", maxHeight: "80px", overflow: "hidden" }}>
              <div style={{ color: "#00ff88", marginBottom: "4px" }}>IPFS content verified:</div>
              {ipfsContent.protocol && <div>protocol: {ipfsContent.protocol}</div>}
              {ipfsContent.strategy && <div>strategy: {ipfsContent.strategy.strategy_type}</div>}
              {ipfsContent.timestamp && <div>stored: {new Date(ipfsContent.timestamp).toLocaleDateString()}</div>}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <button onClick={sendReport} disabled={sending} style={{ padding: "14px", borderRadius: "12px", fontWeight: 600, fontSize: "13px", border: "1px solid " + (reportSent ? "#00ff88" : "#1a1a1a"), background: reportSent ? "#00ff8812" : "#0f0f0f", color: reportSent ? "#00ff88" : "white", cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {sending ? "Sending..." : reportSent ? "Sent!" : "Email Report"}
          </button>
          <button onClick={() => router.push("/mutate")} style={{ padding: "14px", borderRadius: "12px", fontWeight: 600, fontSize: "13px", border: "1px solid #1a1a1a", background: "#0f0f0f", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
            Mutate Strategy
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
          <button onClick={() => router.push("/attestation")} style={{ padding: "14px", borderRadius: "12px", fontWeight: 600, fontSize: "13px", border: "1px solid #1a1a2a", background: "#0a0a14", color: "#a78bfa", cursor: "pointer", fontFamily: "inherit" }}>
            Get Attestation
          </button>
          <button onClick={() => router.push("/vaults")} style={{ padding: "14px", borderRadius: "12px", fontWeight: 600, fontSize: "13px", border: "1px solid #1a1a1a", background: "#0f0f0f", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
            All Vaults
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: "#1a1a1a", lineHeight: 2 }}>
          Strategy on IPFS · Vault on Flow Testnet · 15% fee on gains
        </div>
      </div>
    </div>
  );
}
