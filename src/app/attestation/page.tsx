"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIpfsLink } from "@/lib/vault-presentation";

export default function AttestationPage() {
  const [vault, setVault] = useState<any>(null);
  const [attestation, setAttestation] = useState<any>(null);
  const [attestationCID, setAttestationCID] = useState("");
  const [attestationUrl, setAttestationUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
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
        const secsSince = Math.max(1, (Date.now() - new Date(data.created_at).getTime()) / 1000);
        const simReturn = data.principal_usd * (1 + (data.strategy.target_return_pct / 100) * (secsSince / (365 * 24 * 3600)));
        data.current_value_usd = parseFloat(simReturn.toFixed(2));
        setVault(data);
      }
    };
    fetchVault();
  }, [router]);

  const generateAttestation = async () => {
    if (!vault || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/mint-attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault }),
      });
      const data = await res.json();
      if (data.success) {
        setAttestation(data.attestation);
        setAttestationCID(data.attestationCID);
        setAttestationUrl(data.ipfsUrl || "");
        setGenerated(true);
      }
    } catch {
      alert("Failed. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!vault) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
        <div style={{ color: "#00d4ff" }}>Loading...</div>
      </div>
    );
  }

  const gain = vault.current_value_usd - vault.principal_usd;
  const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
  const isPositive = gain >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
            back
          </button>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#a78bfa" }}>Attestation</div>
        </div>
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "#151515", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>Principal</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>${vault.principal_usd}</div>
            </div>
            <div style={{ background: "#151515", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>Current Value</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>${vault.current_value_usd.toFixed(2)}</div>
            </div>
            <div style={{ background: "#151515", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>Return</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: isPositive ? "#00ff88" : "#ff4466" }}>{isPositive ? "+" : ""}{gainPct}%</div>
            </div>
            <div style={{ background: "#151515", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>Strategy</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>{vault.strategy.strategy_type}</div>
            </div>
          </div>
        </div>
        {!generated ? (
          <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "20px", padding: "28px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏅</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "8px" }}>Generate Performance Attestation</div>
            <div style={{ fontSize: "14px", color: "#555", marginBottom: "24px", lineHeight: 1.6 }}>AI-generated performance summary packaged as a verifiable IPFS attestation.</div>
            <button onClick={generateAttestation} disabled={generating} style={{ padding: "14px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: generating ? "not-allowed" : "pointer", background: generating ? "#1a1a2a" : "linear-gradient(135deg, #a78bfa, #00d4ff)", color: generating ? "#555" : "#000", fontFamily: "inherit" }}>
              {generating ? "Generating..." : "Mint Attestation"}
            </button>
          </div>
        ) : (
          <div style={{ background: "#0a0a14", border: "1px solid #a78bfa40", borderRadius: "20px", padding: "24px", marginBottom: "16px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "16px" }}>Attestation Generated</div>
            {attestation && attestation.aiVerdict && (
              <div style={{ background: "#111", borderRadius: "12px", padding: "16px", marginBottom: "16px", borderLeft: "3px solid #a78bfa" }}>
                <div style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.6, fontStyle: "italic" }}>{attestation.aiVerdict}</div>
              </div>
            )}
            {attestationCID && (
              <a href={getIpfsLink(attestationCID, attestationUrl)} target="_blank" rel="noreferrer" style={{ display: "block", padding: "12px", background: "#111", borderRadius: "10px", textDecoration: "none", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", wordBreak: "break-all" }}>
                {"ipfs://" + attestationCID}
              </a>
            )}
          </div>
        )}
        <button onClick={() => router.push("/dashboard")} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#0f0f0f", border: "1px solid #1a1a1a", color: "white", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
