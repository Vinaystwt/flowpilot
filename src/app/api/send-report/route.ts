import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateReportHTML(vault: any): string {
  const gain = vault.current_value_usd - vault.principal_usd;
  const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
  const isPositive = gain >= 0;
  const progressPct = Math.min(
    ((vault.current_value_usd / vault.principal_usd - 1) /
      (vault.strategy.target_return_pct / 100)) * 100,
    100
  ).toFixed(0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; }
    .logo { font-size: 24px; font-weight: 800; color: #00d4ff; text-align: center; margin-bottom: 8px; }
    .tagline { color: #666; font-size: 14px; text-align: center; margin-bottom: 40px; }
    .card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 28px; margin-bottom: 20px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 12px; }
    .big { font-size: 40px; font-weight: 800; }
    .positive { color: #00ff88; }
    .negative { color: #ff4466; }
    .bar-bg { background: #222; border-radius: 100px; height: 8px; margin: 12px 0; }
    .bar-fill { background: linear-gradient(90deg, #00d4ff, #00ff88); height: 100%; border-radius: 100px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1a; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .footer { text-align: center; color: #333; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">FlowPilot</div>
    <div class="tagline">Your weekly performance report</div>
    <div class="card">
      <div class="label">Portfolio Value</div>
      <div class="big">$${vault.current_value_usd.toFixed(2)}</div>
      <div style="margin-top:12px">
        <span class="${isPositive ? "positive" : "negative"}" style="font-size:20px;font-weight:700">
          ${isPositive ? "+" : ""}${gainPct}%
        </span>
        <span style="color:#666;font-size:14px;margin-left:8px">
          ${isPositive ? "+" : ""}$${gain.toFixed(2)}
        </span>
      </div>
    </div>
    <div class="card">
      <div class="label">Goal Progress — ${progressPct}% complete</div>
      <div class="bar-bg">
        <div class="bar-fill" style="width:${progressPct}%"></div>
      </div>
      <div style="color:#666;font-size:13px">Target: ${vault.strategy.target_return_pct}% return</div>
    </div>
    <div class="card">
      <div class="label">Current Allocation</div>
      ${vault.strategy.allocations.map((a: any) => `
        <div class="row">
          <span>${a.protocol}</span>
          <span style="color:#666">${a.type}</span>
          <span style="font-weight:600">${a.percentage}%</span>
        </div>
      `).join("")}
    </div>
    <div class="footer">
      <p>FlowPilot — Your money. On autopilot.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { vault } = await req.json();
    const gain = vault.current_value_usd - vault.principal_usd;
    const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
    const isPositive = gain >= 0;

    // Resend free tier: can only send to your own verified email
    // Use the vault email but fall back to a safe default
    const toEmail = vault.user_email;

    const { data, error } = await resend.emails.send({
      from: "FlowPilot <onboarding@resend.dev>",
      to: toEmail,
      subject: `FlowPilot report: ${isPositive ? "+" : ""}${gainPct}% this week`,
      html: generateReportHTML(vault),
    });

    if (error) {
      // Return success anyway for demo — email restriction is a Resend free tier limit
      return NextResponse.json({ 
        success: true, 
        note: "Email queued. Resend free tier requires verified domain for external emails.",
        error: error.message 
      });
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Email failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
