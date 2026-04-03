"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [onboarded, setOnboarded] = useState<any>(null);
  const [onboardError, setOnboardError] = useState("");
  const router = useRouter();

  const examples = [
    "Grow my $500 by 10% in 6 months. Keep it safe.",
    "Invest $200 aggressively for maximum yield.",
    "Put $1000 to work. Never lose more than 5%.",
    "Save $300 and grow it steadily over a year.",
  ];

  const handleEmailBlur = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return;
    if (onboarding) return;
    if (onboarded?.email === normalized) return;

    setFocused(null);
    setOnboarding(true);
    setOnboardError("");

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Onboarding failed");
      }

      const next = { ...data, email: normalized };
      setOnboarded(next);
      localStorage.setItem("fp_child_address", data.childAddress || "");
      localStorage.setItem("fp_onboard_tx_hash", data.accountTxHash || "");
      localStorage.setItem("fp_onboard_flowscan_url", data.flowscanUrl || "");
    } catch (error) {
      setOnboarded(null);
      setOnboardError(error instanceof Error ? error.message : "Onboarding failed");
    } finally {
      setOnboarding(false);
    }
  };

  const handleSubmit = async () => {
    if (!intent.trim() || !email.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIntent: intent }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("fp_strategy", JSON.stringify(data.strategy));
        localStorage.setItem("fp_intent", intent);
        localStorage.setItem("fp_email", email);
        if (onboarded?.childAddress) {
          localStorage.setItem("fp_child_address", onboarded.childAddress);
        }
        router.push("/confirm");
      } else {
        alert("Could not parse your goal. Try rephrasing.");
        setIsLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#080808", color: "white", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Nav */}
      <nav style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #111" }}>
        <div style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "-1px", color: "#00d4ff" }}>FlowPilot</div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#444" }}>Built on Flow</span>
          <span style={{ fontSize: "13px", color: "#444" }}>Powered by Groq</span>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
          <span style={{ fontSize: "12px", color: "#00ff88" }}>Testnet Live</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 40px 60px" }}>
        
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", background: "#00d4ff12", border: "1px solid #00d4ff30", marginBottom: "32px" }}>
          <span style={{ fontSize: "12px", color: "#00d4ff" }}>⚡ Natural Language DeFi · Flow Blockchain · IPFS Storage</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-3px", margin: "0 0 24px 0" }}>
          Your financial goal,<br />
          <span style={{ background: "linear-gradient(135deg, #00d4ff, #00ff88)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            executed automatically.
          </span>
        </h1>

        <p style={{ fontSize: "18px", color: "#666", lineHeight: 1.7, maxWidth: "560px", margin: "0 0 56px 0" }}>
          Type what you want in plain English. FlowPilot builds a personalized DeFi strategy and runs it autonomously on Flow — no wallet, no gas, no complexity.
        </p>

        {/* Main input card */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "24px", padding: "32px", marginBottom: "16px", boxShadow: "0 0 80px rgba(0,212,255,0.06)" }}>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "10px" }}>
              Your financial goal
            </label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onFocus={() => setFocused("intent")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. Grow my $500 by 8% over 6 months. Keep it relatively safe."
              rows={3}
              style={{
                width: "100%",
                background: focused === "intent" ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${focused === "intent" ? "#00d4ff40" : "#1a1a1a"}`,
                borderRadius: "14px",
                padding: "16px",
                color: "white",
                fontSize: "15px",
                lineHeight: 1.6,
                resize: "none" as const,
                outline: "none",
                fontFamily: "inherit",
                transition: "all 0.2s",
                boxSizing: "border-box" as const,
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#444", marginBottom: "10px" }}>
              Email for weekly reports
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={handleEmailBlur}
              type="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                background: focused === "email" ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${focused === "email" ? "#00d4ff40" : "#1a1a1a"}`,
                borderRadius: "14px",
                padding: "16px",
                color: "white",
                fontSize: "15px",
                outline: "none",
                fontFamily: "inherit",
                transition: "all 0.2s",
                boxSizing: "border-box" as const,
              }}
            />
            {onboarding && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#98e7ff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 10px rgba(0,212,255,0.8)" }} />
                Creating your Flow child account...
              </div>
            )}
            {onboarded?.childAddress && !onboarding && (
              <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", background: "#08140d", border: "1px solid #143020", color: "#8fffbf", fontSize: "12px", lineHeight: 1.6 }}>
                Child account ready: {onboarded.childAddress.slice(0, 12)}... Gas sponsored
              </div>
            )}
            {onboardError && !onboarding && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#ff8d8d" }}>
                {onboardError}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!intent.trim() || !email.trim() || isLoading}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "14px",
              fontWeight: 800,
              fontSize: "15px",
              letterSpacing: "0.3px",
              border: "none",
              cursor: (!intent.trim() || !email.trim() || isLoading) ? "not-allowed" : "pointer",
              background: (!intent.trim() || !email.trim() || isLoading)
                ? "#1a1a1a"
                : "linear-gradient(135deg, #00d4ff, #00ff88)",
              color: (!intent.trim() || !email.trim() || isLoading) ? "#333" : "#000",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "Building your strategy with AI..." : "Launch My Autopilot →"}
          </button>
        </div>

        {/* Examples */}
        <div style={{ marginBottom: "80px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#2a2a2a", marginBottom: "12px" }}>
            Try an example
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setIntent(ex)}
                style={{
                  fontSize: "13px",
                  color: "#555",
                  padding: "8px 14px",
                  borderRadius: "100px",
                  border: "1px solid #1a1a1a",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#555";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a1a1a";
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: "80px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "3px", color: "#333", marginBottom: "40px", textAlign: "center" as const }}>
            How It Works
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {[
              {
                step: "01",
                title: "You type a goal",
                desc: "Plain English. No financial jargon. Just tell FlowPilot what you want.",
                color: "#00d4ff",
              },
              {
                step: "02",
                title: "AI builds your strategy",
                desc: "Groq parses your intent into a structured DeFi allocation stored on IPFS.",
                color: "#00ff88",
              },
              {
                step: "03",
                title: "Autopilot takes over",
                desc: "A Cadence vault deploys on Flow. Rebalancing runs automatically. You do nothing.",
                color: "#a78bfa",
              },
            ].map((item) => (
              <div key={item.step} style={{ padding: "24px", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px" }}>
                <div style={{ fontSize: "11px", color: item.color, fontWeight: 700, letterSpacing: "2px", marginBottom: "12px" }}>{item.step}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "white" }}>{item.title}</div>
                <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats / Trust */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "80px" }}>
          {[
            { value: "0", label: "Wallet needed" },
            { value: "$0", label: "Gas fees ever" },
            { value: "3", label: "Contracts on Flow" },
            { value: "∞", label: "Autopilot runtime" },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" as const, padding: "20px", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "16px" }}>
              <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-1px", color: "white", marginBottom: "4px" }}>{item.value}</div>
              <div style={{ fontSize: "11px", color: "#444", textTransform: "uppercase" as const, letterSpacing: "1px" }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0c1016", border: "1px solid #182536", borderRadius: "20px", padding: "20px", marginBottom: "56px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "2px", color: "#5f748d", marginBottom: "14px" }}>
            Verification Surface
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { label: "Walletless", value: "Child account provisioning on email blur" },
              { label: "Execution", value: "Flow testnet vault + scheduler proof links" },
              { label: "Storage", value: "Real content-addressed IPFS strategy payloads" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#101722", border: "1px solid #162131", borderRadius: "14px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#70859c", marginBottom: "6px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "white", lineHeight: 1.5 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div style={{ borderTop: "1px solid #111", paddingTop: "40px", display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap" as const }}>
          {[
            { name: "Flow Blockchain", desc: "Cadence smart contracts" },
            { name: "Groq AI", desc: "llama-3.3-70b intent parsing" },
            { name: "IPFS", desc: "Strategy storage" },
            { name: "Filecoin", desc: "Vault archival" },
          ].map((item) => (
            <div key={item.name} style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#555", marginBottom: "2px" }}>{item.name}</div>
              <div style={{ fontSize: "11px", color: "#2a2a2a" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
