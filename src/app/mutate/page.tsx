"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MutatePage() {
  const [strategy, setStrategy] = useState<any>(null);
  const [vaultId, setVaultId] = useState("");
  const [mutation, setMutation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [newStrategy, setNewStrategy] = useState<any>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = localStorage.getItem("fp_strategy");
    const v = localStorage.getItem("fp_vault_id");
    if (!s || !v) { router.push("/"); return; }
    setStrategy(JSON.parse(s));
    setVaultId(v);
  }, [router]);

  const handleMutation = async () => {
    if (!mutation.trim() || !strategy) return;
    setIsProcessing(true);
    setNewStrategy(null);
    setChanges([]);
    try {
      const res = await fetch("/api/mutate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStrategy: strategy, mutationIntent: mutation, vaultId }),
      });
      const data = await res.json();
      if (data.success) {
        setNewStrategy(data.newStrategy);
        setChanges(data.changes);
      }
    } catch { alert("Mutation failed."); }
    finally { setIsProcessing(false); }
  };

  const confirmMutation = async () => {
    if (!newStrategy) return;
    const email = localStorage.getItem("fp_email") || "";
    const ipfsRes = await fetch("/api/store-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: newStrategy, userEmail: email }),
    });
    const ipfsData = await ipfsRes.json();
    if (ipfsData.cid) localStorage.setItem("fp_ipfs_cid", ipfsData.cid);
    localStorage.setItem("fp_strategy", JSON.stringify(newStrategy));
    setStrategy(newStrategy);
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); setNewStrategy(null); setMutation(""); setChanges([]); }, 2500);
  };

  if (!strategy) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
      <div style={{ color: "#00d4ff" }}>Loading...</div>
    </div>
  );

  const examples = [
    "Make it more aggressive, I want more growth",
    "Reduce risk, focus on lending only",
    "Rebalance daily instead of weekly",
    "Increase my target return to 15%",
    "Split equally between all protocols",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
            back
          </button>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#00d4ff", letterSpacing: "-1px" }}>Strategy Lab</div>
          <div style={{ marginLeft: "auto", fontSize: "11px", color: "#333" }}>Powered by Groq AI</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: newStrategy ? "1fr 1fr" : "1fr", gap: "12px", marginBottom: "16px" }}>

          {/* Current strategy */}
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "14px" }}>
              {newStrategy ? "Current" : "Your Strategy"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
              {[
                { label: "Type", value: strategy.strategy_type },
                { label: "Target", value: strategy.target_return_pct + "%" },
                { label: "Principal", value: "$" + strategy.principal_usd },
                { label: "Rebalance", value: strategy.rebalance_frequency_days + "d" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#151515", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#444", marginBottom: "2px" }}>{item.label}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{item.value}</div>
                </div>
              ))}
            </div>
            {strategy.allocations.map((a: any) => (
              <div key={a.protocol} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1a1a1a", fontSize: "12px" }}>
                <span style={{ color: "#888" }}>{a.protocol}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "40px", height: "3px", background: "#1a1a1a", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: a.percentage + "%", height: "100%", background: "#00d4ff" }} />
                  </div>
                  <span style={{ color: "white", fontWeight: 700, minWidth: "30px", textAlign: "right" }}>{a.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* New strategy comparison */}
          {newStrategy && (
            <div style={{ background: "#0a1a0a", border: "1px solid #00ff8830", borderRadius: "20px", padding: "20px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#00ff88", marginBottom: "14px" }}>
                Updated
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {[
                  { label: "Type", value: newStrategy.strategy_type, changed: newStrategy.strategy_type !== strategy.strategy_type },
                  { label: "Target", value: newStrategy.target_return_pct + "%", changed: newStrategy.target_return_pct !== strategy.target_return_pct },
                  { label: "Principal", value: "$" + newStrategy.principal_usd, changed: false },
                  { label: "Rebalance", value: newStrategy.rebalance_frequency_days + "d", changed: newStrategy.rebalance_frequency_days !== strategy.rebalance_frequency_days },
                ].map((item) => (
                  <div key={item.label} style={{ background: item.changed ? "#00ff8812" : "#151515", borderRadius: "8px", padding: "8px", border: item.changed ? "1px solid #00ff8830" : "none" }}>
                    <div style={{ fontSize: "10px", color: item.changed ? "#00ff88" : "#444", marginBottom: "2px" }}>{item.label}{item.changed ? " ✓" : ""}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: item.changed ? "#00ff88" : "white", textTransform: "capitalize" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {newStrategy.allocations.map((a: any) => {
                const old = strategy.allocations.find((o: any) => o.protocol === a.protocol);
                const changed = old && old.percentage !== a.percentage;
                return (
                  <div key={a.protocol} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1a2a1a", fontSize: "12px" }}>
                    <span style={{ color: changed ? "#00ff88" : "#888" }}>{a.protocol}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {changed && old && (
                        <span style={{ fontSize: "10px", color: "#555" }}>{old.percentage}%</span>
                      )}
                      {changed && <span style={{ fontSize: "10px", color: "#00ff88" }}>→</span>}
                      <div style={{ width: "40px", height: "3px", background: "#1a2a1a", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: a.percentage + "%", height: "100%", background: changed ? "#00ff88" : "#00d4ff" }} />
                      </div>
                      <span style={{ color: changed ? "#00ff88" : "white", fontWeight: 700, minWidth: "30px", textAlign: "right" }}>{a.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Changes summary */}
        {changes.length > 0 && (
          <div style={{ background: "#0a1a0a", border: "1px solid #00ff8820", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#00ff88", marginBottom: "10px" }}>Changes</div>
            {changes.map((change, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", fontSize: "13px", color: "#aaa" }}>
                <span style={{ color: "#00ff88", fontSize: "10px" }}>→</span>
                {change}
              </div>
            ))}
          </div>
        )}

        {/* Confirm button */}
        {newStrategy && (
          <button onClick={confirmMutation} style={{ width: "100%", padding: "14px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", background: confirmed ? "#00ff8820" : "#00ff88", color: confirmed ? "#00ff88" : "#000", fontFamily: "inherit", marginBottom: "12px" }}>
            {confirmed ? "✓ Strategy updated and stored on IPFS" : "Confirm Strategy Update →"}
          </button>
        )}

        {/* Mutation input */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "20px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Modify with AI</div>
          <textarea
            value={mutation}
            onChange={(e) => setMutation(e.target.value)}
            placeholder="e.g. Make it more aggressive, reduce risk, rebalance daily..."
            rows={2}
            style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "12px", color: "white", fontSize: "14px", lineHeight: 1.5, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <button
            onClick={handleMutation}
            disabled={!mutation.trim() || isProcessing}
            style={{ width: "100%", padding: "12px", marginTop: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", border: "none", cursor: (!mutation.trim() || isProcessing) ? "not-allowed" : "pointer", background: (!mutation.trim() || isProcessing) ? "#1a1a1a" : "linear-gradient(135deg, #00d4ff, #00ff88)", color: (!mutation.trim() || isProcessing) ? "#333" : "#000", fontFamily: "inherit" }}
          >
            {isProcessing ? "AI is updating your strategy..." : "Apply Mutation →"}
          </button>
        </div>

        {/* Example mutations */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#2a2a2a", marginBottom: "10px" }}>Try an example</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => setMutation(ex)} style={{ fontSize: "12px", color: "#555", padding: "6px 12px", borderRadius: "100px", border: "1px solid #1a1a1a", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
