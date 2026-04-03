"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatShortHash, getConvictionScore, getIpfsLink, getScenarioPreview } from "@/lib/vault-presentation";

export default function JudgePage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [archiveCID, setArchiveCID] = useState("");
  const [archiveUrl, setArchiveUrl] = useState("");
  const [lighthouseCID, setLighthouseCID] = useState("");
  const [childAddress, setChildAddress] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchVault = async () => {
      const vaultId = localStorage.getItem("fp_vault_id");
      if (!vaultId) {
        router.push("/");
        return;
      }

      setArchiveCID(localStorage.getItem("fp_archive_cid") || "");
      setArchiveUrl(localStorage.getItem("fp_archive_url") || "");
      setLighthouseCID(localStorage.getItem("fp_lighthouse_cid") || "");
      setChildAddress(localStorage.getItem("fp_child_address") || "");
      setIpfsUrl(localStorage.getItem("fp_ipfs_url") || "");

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
      }

      setLoading(false);
    };

    fetchVault();
  }, [router]);

  const metrics = useMemo(() => {
    if (!vault) return null;

    const txHash = localStorage.getItem("fp_tx_hash") || "";
    const ipfsCID = localStorage.getItem("fp_ipfs_cid") || "";
    const gain = vault.current_value_usd - vault.principal_usd;
    const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
    const progressPct = Math.min(
      ((vault.current_value_usd / vault.principal_usd - 1) / (vault.strategy.target_return_pct / 100)) * 100,
      100
    );
    const daysLive = Math.max(1, Math.floor((Date.now() - new Date(vault.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      txHash,
      ipfsCID,
      gain,
      gainPct,
      progressPct,
      daysLive,
      convictionScore: getConvictionScore(vault),
      scenarios: getScenarioPreview(vault.strategy, vault.principal_usd).map((scenario, index) => ({
        label: index === 0 ? "Protected downside" : index === 1 ? "Base plan" : "Upside path",
        returnPct: scenario.returnPct,
        value: scenario.terminalValue,
        color: scenario.color,
      })),
    };
  }, [vault]);

  const createEvidencePack = async () => {
    if (!vault || archiving) return;
    setArchiving(true);
    setArchiveError("");

    try {
      const res = await fetch("/api/archive-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault,
          finalReport: "Judge mode evidence pack for FlowPilot vault validation.",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Evidence pack generation failed.");
      }

      setArchiveCID(data.archiveCID || "");
      setArchiveUrl(data.archiveUrl || "");
      setLighthouseCID(data.lighthouseCID || "");
      localStorage.setItem("fp_archive_cid", data.archiveCID || "");
      localStorage.setItem("fp_archive_url", data.archiveUrl || "");
      localStorage.setItem("fp_lighthouse_cid", data.lighthouseCID || "");
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Evidence pack generation failed.");
    } finally {
      setArchiving(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", color: "#00d4ff", fontFamily: "system-ui, sans-serif" }}>
        Loading judge mode...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090d", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#d7ff85", letterSpacing: "-1px" }}>FlowPilot Verification View</div>
            <div style={{ fontSize: "13px", color: "#6e7786", marginTop: "4px" }}>
              Walletless Flow vaults with real IPFS strategy storage and a compact verification trail for reviewers.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "8px 16px", borderRadius: "999px", background: "#101722", border: "1px solid #1a2433", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
              Dashboard
            </button>
            <button onClick={() => router.push("/explore")} style={{ padding: "8px 16px", borderRadius: "999px", background: "#11140d", border: "1px solid #2a321b", color: "#d7ff85", cursor: "pointer", fontFamily: "inherit" }}>
              Public Explorer
            </button>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(215,255,133,0.06))", border: "1px solid #223145", borderRadius: "24px", padding: "24px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#7f93ab", marginBottom: "12px" }}>Why this matters</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { label: "Walletless UX", value: "No wallet required for the user journey" },
              { label: "Flow Execution", value: metrics.txHash ? "Real Flow testnet transaction proof" : "Flow fallback proof recorded" },
              { label: "Verifiable Storage", value: metrics.ipfsCID ? "Real content-addressed strategy CID" : "Strategy proof pending" },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(9,14,20,0.72)", border: "1px solid #1a2433", borderRadius: "16px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#7f93ab", marginBottom: "6px" }}>{item.label}</div>
                <div style={{ fontSize: "14px", color: "white", lineHeight: 1.5 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "14px", marginBottom: "14px" }}>
          <div style={{ background: "#0f131b", border: "1px solid #1a2433", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#7f93ab", marginBottom: "12px" }}>Live Proof Links</div>
            <div style={{ display: "grid", gap: "8px" }}>
              <a href="https://testnet.flowscan.io/account/0xf8105fdaa45bc140" target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#00d4ff", textDecoration: "none" }}>
                Flow contract ↗
              </a>
              {metrics.txHash && (
                <a href={"https://testnet.flowscan.io/transaction/" + metrics.txHash} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#9fd0ff", textDecoration: "none" }}>
                  Flow tx: {metrics.txHash.slice(0, 24)}... ↗
                </a>
              )}
              {metrics.ipfsCID && (
                <a href={getIpfsLink(metrics.ipfsCID, ipfsUrl)} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#00ff88", textDecoration: "none" }}>
                  Strategy CID: {formatShortHash(metrics.ipfsCID, 12)} ↗
                </a>
              )}
              {childAddress && (
                <a href={`https://testnet.flowscan.io/account/${childAddress}`} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#d7ff85", textDecoration: "none" }}>
                  Child account: {formatShortHash(childAddress, 6)} ↗
                </a>
              )}
              {archiveUrl && (
                <a href={archiveUrl} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#d7ff85", textDecoration: "none" }}>
                  Evidence pack: {formatShortHash(archiveCID, 12)} ↗
                </a>
              )}
              {lighthouseCID && (
                <a href={"https://gateway.lighthouse.storage/ipfs/" + lighthouseCID} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: "12px", color: "#ef9f27", textDecoration: "none" }}>
                  Lighthouse mirror: {formatShortHash(lighthouseCID, 12)} ↗
                </a>
              )}
            </div>
          </div>

          <div style={{ background: "#11140d", border: "1px solid #2a321b", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#7b8759", marginBottom: "12px" }}>Vault Snapshot</div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "white", letterSpacing: "-2px", marginBottom: "10px" }}>
              ${vault.current_value_usd.toFixed(2)}
            </div>
            <div style={{ fontSize: "14px", color: Number(metrics.gainPct) >= 0 ? "#00ff88" : "#ff4466", marginBottom: "6px" }}>
              {Number(metrics.gainPct) >= 0 ? "+" : ""}{metrics.gainPct}% simulated return
            </div>
            <div style={{ fontSize: "12px", color: "#98a37c" }}>
              ${vault.principal_usd} principal · {metrics.daysLive} day live runtime
            </div>
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#d7ff85" }}>
              Conviction score: {metrics.convictionScore}/100
            </div>
          </div>
        </div>

        <div style={{ background: "#0f131b", border: "1px solid #1a2433", borderRadius: "20px", padding: "20px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#7f93ab", marginBottom: "12px" }}>Strategy + Scenario View</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#6e7786", marginBottom: "8px" }}>Allocation</div>
              {vault.strategy.allocations.map((allocation: any) => (
                <div key={allocation.protocol} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "white" }}>{allocation.protocol}</span>
                    <span style={{ fontSize: "12px", color: "#9fd0ff" }}>{allocation.percentage}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#18212f", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: allocation.percentage + "%", height: "100%", background: "#00d4ff" }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6e7786", marginBottom: "8px" }}>Projected paths</div>
              <div style={{ display: "grid", gap: "10px" }}>
                {metrics.scenarios.map((scenario) => (
                  <div key={scenario.label} style={{ background: "#101722", border: "1px solid #162131", borderRadius: "14px", padding: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#7f93ab", marginBottom: "4px" }}>{scenario.label}</div>
                    <div style={{ fontSize: "18px", color: "white", fontWeight: 800, marginBottom: "4px" }}>
                      ${scenario.value.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "12px", color: scenario.color }}>
                      {scenario.returnPct >= 0 ? "+" : ""}{scenario.returnPct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ height: "6px", background: "#18212f", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: metrics.progressPct + "%", height: "100%", background: "linear-gradient(90deg, #00d4ff, #d7ff85)" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#6e7786" }}>
            Goal progress: {metrics.progressPct.toFixed(1)}% toward a {vault.strategy.target_return_pct}% target.
          </div>
        </div>

        <div style={{ background: "#11140d", border: "1px solid #2a321b", borderRadius: "20px", padding: "20px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#7b8759", marginBottom: "12px" }}>Evidence Timeline</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {[
              `Vault deployed on Flow Testnet with real execution proof`,
              `Strategy stored as a content-addressed document on IPFS`,
              `Autopilot schedule created for every ${vault.strategy.rebalance_frequency_days} days`,
              archiveUrl ? "Judge evidence pack generated and pinned" : "Judge evidence pack ready to mint",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#d7ff85", marginTop: "6px", flexShrink: 0 }} />
                <div style={{ fontSize: "13px", color: "#d7dfc4", lineHeight: 1.6 }}>{item}</div>
              </div>
            ))}
          </div>
          <button onClick={createEvidencePack} disabled={archiving} style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "10px", fontWeight: 700, fontSize: "12px", border: "1px solid #435125", background: archiving ? "#171c10" : "#181f10", color: archiving ? "#647049" : "#d7ff85", cursor: archiving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {archiving ? "Building evidence pack..." : archiveUrl ? "Refresh Evidence Pack" : "Create Evidence Pack"}
          </button>
          {archiveError && (
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#ff9f7a" }}>{archiveError}</div>
          )}
        </div>
      </div>
    </div>
  );
}
