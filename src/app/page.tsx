"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const examples = [
    "Grow my $500 by 10% in 6 months. Keep it safe.",
    "Invest $200 and earn passive income. Rebalance weekly.",
    "Put $1000 to work. Never lose more than 5% of my money.",
    "Save $300 and grow it steadily over the next year.",
  ];

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
        router.push("/confirm");
      } else {
        alert("Could not parse your goal. Please try rephrasing it.");
        setIsLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--bg)" }}>
      
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-2px", color: "var(--accent)" }}>
          FlowPilot
        </div>
        <div style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" }}>
          Your money. On autopilot.
        </div>
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center", marginBottom: "48px", maxWidth: "600px" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", margin: "0 0 20px 0" }}>
          Tell us your{" "}
          <span style={{ color: "var(--accent)" }}>financial goal.</span>
          <br />
          We handle everything else.
        </h1>
        <p style={{ color: "#888", fontSize: "17px", lineHeight: 1.6, margin: 0 }}>
          No wallet setup. No gas fees. No manual rebalancing.
          Just type what you want — FlowPilot builds and runs your
          personalized DeFi strategy automatically.
        </p>
      </div>

      {/* Input Card */}
      <div className="glow" style={{ width: "100%", maxWidth: "520px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-muted)", marginBottom: "10px" }}>
            Your financial goal
          </label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. Grow my $500 by 8% over 6 months. Keep it relatively safe."
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", color: "white", fontSize: "14px", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "inherit", minHeight: "90px" }}
            rows={3}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "var(--text-muted)", marginBottom: "10px" }}>
            Email for weekly reports
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", color: "white", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!intent.trim() || !email.trim() || isLoading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "14px",
            letterSpacing: "0.5px",
            border: "none",
            cursor: (!intent.trim() || !email.trim() || isLoading) ? "not-allowed" : "pointer",
            background: (!intent.trim() || !email.trim() || isLoading)
              ? "#333"
              : "linear-gradient(135deg, var(--accent), var(--accent-green))",
            color: (!intent.trim() || !email.trim() || isLoading) ? "#666" : "#000",
            transition: "all 0.2s",
          }}
        >
          {isLoading ? "Building your strategy..." : "Launch My Autopilot →"}
        </button>
      </div>

      {/* Examples */}
      <div style={{ width: "100%", maxWidth: "520px", marginBottom: "48px" }}>
        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "#444", textAlign: "center", marginBottom: "12px" }}>
          Try an example
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setIntent(ex)}
              style={{ textAlign: "left", fontSize: "13px", color: "#666", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "#ccc"; (e.target as HTMLButtonElement).style.borderColor = "#333"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "#666"; (e.target as HTMLButtonElement).style.borderColor = "var(--border)"; }}
            >
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div style={{ display: "flex", gap: "40px", textAlign: "center" }}>
        {[
          { icon: "🔑", label: "No Wallet Needed" },
          { icon: "⛽", label: "Zero Gas Fees" },
          { icon: "🤖", label: "Fully Automated" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "24px" }}>{item.icon}</div>
            <div style={{ fontSize: "11px", color: "#444", textTransform: "uppercase", letterSpacing: "1px" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
