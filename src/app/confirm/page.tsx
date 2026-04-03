"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategyJSON } from "@/lib/types";
import { formatShortHash, getScenarioPreview } from "@/lib/vault-presentation";

export default function ConfirmPage() {
  const [strategy, setStrategy] = useState<StrategyJSON | null>(null);
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [childAddress, setChildAddress] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState("");
  const [txHash, setTxHash] = useState("");
  const [ipfsCID, setIpfsCID] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [ipfsProvider, setIpfsProvider] = useState("");
  const router = useRouter();

  useEffect(() => {
    const s = localStorage.getItem("fp_strategy");
    const i = localStorage.getItem("fp_intent");
    const e = localStorage.getItem("fp_email");
    if (!s || !i || !e) { router.push("/"); return; }
    setStrategy(JSON.parse(s));
    setIntent(i);
    setEmail(e);
    setChildAddress(localStorage.getItem("fp_child_address") || "");
  }, [router]);

  const launchVault = async () => {
    if (!strategy || !email) return;
    setIsLaunching(true);

    try {
      // Step 1: Upload to IPFS
      setLaunchStep("Uploading strategy to IPFS...");
      const ipfsRes = await fetch("/api/store-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, userEmail: email }),
      });
      const ipfsData = await ipfsRes.json();
      if (!ipfsRes.ok || !ipfsData.success || !ipfsData.real || !ipfsData.cid) {
        throw new Error(ipfsData.error || "Real IPFS upload failed.");
      }
      const cid = ipfsData.cid;
      setIpfsCID(cid);
      setIpfsUrl(ipfsData.ipfsUrl || "");
      setIpfsProvider(ipfsData.provider || "");

      // Step 2: Ensure walletless child account exists
      setLaunchStep("Provisioning walletless Flow account...");
      let resolvedChildAddress = childAddress;
      const onboardRes = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const onboardData = await onboardRes.json();
      if (onboardRes.ok && onboardData.success) {
        resolvedChildAddress = onboardData.childAddress || resolvedChildAddress;
        setChildAddress(resolvedChildAddress);
        localStorage.setItem("fp_child_address", resolvedChildAddress || "");
        localStorage.setItem("fp_onboard_tx_hash", onboardData.accountTxHash || "");
        localStorage.setItem("fp_onboard_flowscan_url", onboardData.flowscanUrl || "");
      }

      // Step 3: Real FCL transaction
      setLaunchStep("Connecting to Flow wallet...");
      let realTxHash = "";
      try {
        const { fcl } = await import("@/lib/fcl-config");
        
        // Authenticate user (pops FCL discovery modal on testnet)
        await fcl.authenticate();
        
        setLaunchStep("Submitting vault to Flow blockchain...");
        
        const txId = await fcl.mutate({
          cadence: `
            import FlowPilotRegistry from 0xf8105fdaa45bc140
            import FlowPilotVault from 0xf8105fdaa45bc140

            transaction(
              ipfsCID: String,
              strategyType: String,
              principalUSD: UFix64,
              targetReturnPct: UFix64,
              exitThresholdPct: UFix64,
              horizonDays: UInt64,
              maxSingleProtocolPct: UFix64,
              rebalanceFrequencyDays: UInt64
            ) {
              prepare(signer: &Account) {
                log("FlowPilot vault registration by: ".concat(signer.address.toString()))
              }
              execute {
                let vaultID = FlowPilotVault.createVault(
                  owner: 0xf8105fdaa45bc140,
                  principalUSD: principalUSD,
                  targetReturnPct: targetReturnPct,
                  exitThresholdPct: exitThresholdPct,
                  horizonDays: horizonDays,
                  maxSingleProtocolPct: maxSingleProtocolPct,
                  rebalanceFrequencyDays: rebalanceFrequencyDays,
                  strategyType: strategyType,
                  ipfsCID: ipfsCID
                )
                let regID = FlowPilotRegistry.registerVault(
                  userAddress: 0xf8105fdaa45bc140,
                  ipfsCID: ipfsCID
                )
                log("Vault ID: ".concat(vaultID.toString()))
              }
            }
          `,
          args: (arg: any, t: any) => [
            arg(cid, t.String),
            arg(strategy.strategy_type, t.String),
            arg(strategy.principal_usd.toFixed(2), t.UFix64),
            arg(strategy.target_return_pct.toFixed(2), t.UFix64),
            arg(Math.abs(strategy.exit_threshold_pct).toFixed(2), t.UFix64),
            arg(strategy.time_horizon_days.toString(), t.UInt64),
            arg(strategy.max_single_protocol_pct.toFixed(2), t.UFix64),
            arg(strategy.rebalance_frequency_days.toString(), t.UInt64),
          ],
          proposer: fcl.currentUser,
          payer: fcl.currentUser,
          authorizations: [fcl.currentUser],
          limit: 999,
        });

        realTxHash = txId;
        setLaunchStep("Waiting for Flow confirmation...");
        
        // Wait for transaction to seal
        try {
          await fcl.tx(txId).onceSealed();
          setLaunchStep("Vault confirmed on Flow!");
        } catch {
          setLaunchStep("Transaction submitted!");
        }
        
      } catch (fclErr: any) {
        console.log("FCL note:", fclErr?.message);
        // If user cancels wallet or FCL fails, generate a tx hash from Flow REST
        setLaunchStep("Registering vault on Flow...");
        const deployRes = await fetch("/api/deploy-vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategy, ipfsCID: cid }),
        });
        const deployData = await deployRes.json();
        realTxHash = deployData.txHash || "";
      }

      setTxHash(realTxHash);

      // Step 4: Save to Supabase
      setLaunchStep("Saving vault record...");
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: vaultData, error } = await supabase
        .from("vaults")
        .insert({
          user_email: email,
          flow_address: resolvedChildAddress || "0xf8105fdaa45bc140",
          strategy: strategy,
          ipfs_cid: cid,
          current_value_usd: strategy.principal_usd,
          principal_usd: strategy.principal_usd,
          status: "active",
          vault_id: Math.floor(Math.random() * 100000),
        })
        .select()
        .single();

      if (error) throw error;

      // Step 5: Schedule rebalance
      setLaunchStep("Scheduling autopilot...");
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
      } catch {}

      localStorage.setItem("fp_vault_id", vaultData.id);
      localStorage.setItem("fp_tx_hash", realTxHash);
      localStorage.setItem("fp_ipfs_cid", cid);
      localStorage.setItem("fp_ipfs_url", ipfsData.ipfsUrl || "");
      localStorage.setItem("fp_ipfs_provider", ipfsData.provider || "");

      setLaunchStep("Autopilot deployed!");
      await new Promise(r => setTimeout(r, 1000));
      router.push("/dashboard");

    } catch (err) {
      console.error(err);
      alert("Launch failed. Please try again.");
      setIsLaunching(false);
      setLaunchStep("");
    }
  };

  if (!strategy) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
      <div style={{ color: "#00d4ff" }}>Loading...</div>
    </div>
  );

  const strategyColor = { conservative: "#00ff88", balanced: "#00d4ff", growth: "#ff6644" }[strategy.strategy_type];
  const scenarios = getScenarioPreview(strategy);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#080808", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff", marginBottom: "8px" }}>FlowPilot</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px 0", color: "white" }}>Your strategy is ready.</h2>
          <p style={{ color: "#555", fontSize: "14px", margin: 0 }}>Review and deploy your vault on Flow blockchain.</p>
        </div>

        <div style={{ background: "#0a1a0a", border: "1px solid #1a2a1a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "8px" }}>You said</div>
          <div style={{ fontSize: "14px", color: "#aaa", fontStyle: "italic" }}>{intent}</div>
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", padding: "24px", marginBottom: "16px", boxShadow: "0 0 40px rgba(0,212,255,0.06)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#555", marginBottom: "20px" }}>Autopilot Strategy</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Starting Amount", value: "$" + strategy.principal_usd },
              { label: "Target Return", value: strategy.target_return_pct + "%" },
              { label: "Time Horizon", value: Math.round(strategy.time_horizon_days / 30) + " months" },
              { label: "Rebalance", value: "Every " + strategy.rebalance_frequency_days + "d" },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "white" }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "100px", background: strategyColor + "18", color: strategyColor, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "20px" }}>
            {strategy.strategy_type.toUpperCase()} STRATEGY
          </div>

          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "12px" }}>Allocation</div>
          {strategy.allocations.map((a) => (
            <div key={a.protocol} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", flex: 1, color: "white" }}>{a.protocol}</div>
              <div style={{ fontSize: "12px", color: "#444", textTransform: "capitalize", width: "56px" }}>{a.type}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, width: "40px", textAlign: "right", color: "white" }}>{a.percentage}%</div>
              <div style={{ width: "80px", height: "4px", borderRadius: "100px", background: "#1a1a1a", overflow: "hidden" }}>
                <div style={{ width: a.percentage + "%", height: "100%", background: "#00d4ff", borderRadius: "100px" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#1a0a0a", border: "1px solid #2a1515", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "4px" }}>Auto-Exit Protection</div>
          <div style={{ fontSize: "14px", color: "#aaa" }}>
            Exit if return drops below <span style={{ color: "#ff4466", fontWeight: 700 }}>{strategy.exit_threshold_pct}%</span>
          </div>
        </div>

        <div style={{ background: "#0a0a14", border: "1px solid #1a1a2a", borderRadius: "12px", padding: "14px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", marginBottom: "10px" }}>What happens when you launch</div>
          {[
            { icon: "📦", text: "Strategy uploaded to IPFS — content-addressed and verifiable" },
            { icon: "⛓", text: "Flow transaction submitted, or Flow fallback proof recorded" },
            { icon: "🪪", text: "Child account linked — walletless and gas-sponsored" },
            { icon: "🤖", text: "Rebalance schedule created on FlowPilotScheduler" },
            { icon: "📧", text: "Weekly performance reports to your email" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px", fontSize: "13px", color: "#666" }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d1016", border: "1px solid #1a2433", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#5f748d", marginBottom: "12px" }}>Readiness Check</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { label: "Child Account", value: childAddress ? formatShortHash(childAddress, 6) : "Will provision on launch", color: "#d7ff85" },
              { label: "IPFS Proof", value: ipfsCID ? formatShortHash(ipfsCID, 8) : "Real CID required", color: "#00ff88" },
              { label: "Provider", value: ipfsProvider || "Storacha/Pinata fallback", color: "#9fd0ff" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#101722", border: "1px solid #162131", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#70859c", marginBottom: "6px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0c1016", border: "1px solid #1a2433", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#5f748d", marginBottom: "12px" }}>Scenario Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
            {scenarios.map((scenario) => (
              <div key={scenario.label} style={{ background: "#101722", borderRadius: "12px", padding: "12px", border: "1px solid #162131" }}>
                <div style={{ fontSize: "11px", color: "#5f748d", marginBottom: "6px" }}>{scenario.label}</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "white", marginBottom: "4px" }}>
                  ${scenario.terminalValue.toFixed(2)}
                </div>
                <div style={{ fontSize: "12px", color: scenario.color }}>
                  {scenario.returnPct >= 0 ? "+" : ""}{scenario.returnPct}%
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "12px", color: "#70859c", lineHeight: 1.6 }}>
            This makes the strategy easier to demo: downside is capped by exit protection, base tracks the target plan, and upside reflects favorable compounding for the selected risk profile.
          </div>
        </div>

        {isLaunching && (
          <div style={{ background: "#0a1a0a", border: "1px solid #00ff8830", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
            <div style={{ color: "#00ff88", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
              {launchStep}
            </div>
            {ipfsCID && (
              <div style={{ marginBottom: "6px" }}>
                <a href={ipfsUrl || `https://storacha.link/ipfs/${ipfsCID}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: "11px", color: "#00ff88", textDecoration: "none", fontFamily: "monospace" }}>
                  CID: {formatShortHash(ipfsCID, 10)} via {ipfsProvider || "ipfs"}
                </a>
              </div>
            )}
            {txHash && (
              <a href={"https://testnet.flowscan.io/transaction/" + txHash} target="_blank" rel="noreferrer"
                style={{ fontSize: "11px", color: "#00d4ff", textDecoration: "none", fontFamily: "monospace" }}>
                {txHash.slice(0, 12)}...{txHash.slice(-8)} on Flowscan
              </a>
            )}
          </div>
        )}

        <button
          onClick={launchVault}
          disabled={isLaunching}
          style={{ width: "100%", padding: "18px", borderRadius: "14px", fontWeight: 800, fontSize: "15px", border: "none", cursor: isLaunching ? "not-allowed" : "pointer", background: isLaunching ? "#1a1a1a" : "linear-gradient(135deg, #00d4ff, #00ff88)", color: isLaunching ? "#444" : "#000", transition: "all 0.2s", marginBottom: "12px", fontFamily: "inherit" }}
        >
          {isLaunching ? launchStep || "Deploying..." : "Deploy Vault on Flow →"}
        </button>

        <button
          onClick={() => router.push("/")}
          style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "#444", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Edit my goal
        </button>
      </div>
    </div>
  );
}
