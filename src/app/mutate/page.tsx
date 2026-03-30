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
    } catch (err) {
      alert("Mutation failed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmMutation = async () => {
    if (!newStrategy) return;
    
    // Store updated strategy to IPFS
    const email = localStorage.getItem("fp_email") || "";
    await fetch("/api/store-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: newStrategy, userEmail: email }),
    });

    localStorage.setItem("fp_strategy", JSON.stringify(newStrategy));
    setStrategy(newStrategy);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      setNewStrategy(null);
      setMutation("");
      setChanges([]);
    }, 2000);
  };

  if (!strategy) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
      <div style={{ color: "#00d4ff" }}>Loading...</div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
            ← Dashboard
          </button>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#00d4ff", letterSpacing: "-1px" }}>Strategy Lab</div>
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "16px" }}>Current Strategy</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {[
              { label: "Type", value: strategy.strategy_type },
              { label: "Target", value: `${strategy.target_return_pct}%` },
              { label: "Principal", value: `$${strategy.principal_usd}` },
              { label: "Rebalance", value: `${strategy.rebalance_frequency_days}d` },
            ].map((item) => (
              <div key={item.label} style={{ background: "#151515", borderRadius: "10px", padding: "10px" }}>
                <div style={{ fontSize: "11px", color: "#444", marginBottom: "2px" }}>{item.label}</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "white", textTransform: "capitalize" as const }}>{item.value}</div>
              </div>
            ))}
          </div>
          {strategy.allocations.map((a: any) => (
            <div key={a.protocol} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #1a1a1a", fontSize: "13px" }}>
              <span style={{ color: "#aaa" }}>{a.protocol}</span>
              <span style={{ color: "white", fontWeight: 700 }}>{a.percentage}%</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "16px" }}>Modify Your Strategy</div>
          <textarea
            value={mutation}
            onChange={(e) => setMutation(e.target.value)}
            placeholder='e.g. "Make it more aggressive" or "Reduce risk, add more lending" or "Rebalance monthly instead"'
            rows={3}
            style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "14px", color: "white", fontSize: "14px", lineHeight: 1.6, resize: "none" as const, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
          />
          <button
            onClick={handleMutation}
            disabled={!mutation.trim() || isProcessing}
            style={{ width: "100%", padding: "14px", marginTop: "12px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: (!mutation.trim() || isProcessing) ? "not-allowed" : "pointer", background: (!mutation.trim() || isProcessing) ? "#1a1a1a" : "linear-gradient(135deg, #00d4ff, #00ff88)", color: (!mutation.trim() || isProcessing) ? "#333" : "#000", fontFamily: "inherit" }}
          >
            {isProcessing ? "AI is updating your strategy..." : "Apply Mutation with AI →"}
          </button>
        </div>

        {newStrategy && (
          <div style={{ background: "#0a1a0a", border: "1px solid #00ff8830", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#00ff88", marginBottom: "16px" }}>Strategy Updated</div>

            <div style={{ marginBottom: "16px" }}>
              {changes.map((change, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "13px", color: "#aaa" }}>
                  <span style={{ color: "#00ff88" }}>→</span>
                  {change}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "16px" }}>
              {newStrategy.allocations.map((a: any) => (
                <div key={a.protocol} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #1a2a1a", fontSize: "13px" }}>
                  <span style={{ color: "#aaa" }}>{a.protocol}</span>
                  <span style={{ color: "white", fontWeight: 700 }}>{a.percentage}%</span>
                </div>
              ))}
            </div>

            <button
              onClick={confirmMutation}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer", background: confirmed ? "#00ff8820" : "#00ff88", color: confirmed ? "#00ff88" : "#000", fontFamily: "inherit" }}
            >
              {confirmed ? "✓ Strategy updated and stored on IPFS" : "Confirm & Apply Strategy →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
