// api/send-email.js — Triggered from thankyou.html after Razorpay redirect
// Vercel serverless function: POST /api/send-email
//
// Flow:
//   1. thankyou.html reads razorpay_payment_id from URL params
//   2. POSTs it here
//   3. We verify the payment with Razorpay API (status === 'captured')
//   4. Send access email via Resend
//
// Required env vars (Vercel → Settings → Environment Variables):
//   RAZORPAY_KEY_ID       — from Razorpay dashboard → API Keys
//   RAZORPAY_KEY_SECRET   — from Razorpay dashboard → API Keys
//   RESEND_API_KEY        — from resend.com
//   FROM_EMAIL            — e.g. "AI Income Playbooks <noreply@notiondemand.com>"
//   SITE_URL              — e.g. "https://notionwealth.ai"

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payment_id } = req.body || {};

  if (!payment_id || typeof payment_id !== 'string') {
    return res.status(400).json({ error: 'payment_id is required' });
  }

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('[send-email] Missing Razorpay API credentials');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // ── 1. Verify payment with Razorpay API ──
  let payment;
  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });

    if (!rzpRes.ok) {
      console.warn('[send-email] Razorpay API returned', rzpRes.status);
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    payment = await rzpRes.json();
  } catch (err) {
    console.error('[send-email] Failed to fetch payment from Razorpay:', err);
    return res.status(500).json({ error: 'Could not verify payment' });
  }

  // ── 2. Confirm payment is captured ──
  if (payment.status !== 'captured') {
    console.warn('[send-email] Payment not captured:', payment.status);
    return res.status(400).json({ error: 'Payment not completed' });
  }

  // ── 3. Extract customer details ──
  const customerEmail = payment.email || null;
  const customerName  = payment.notes?.name || 'there';

  if (!customerEmail) {
    console.warn('[send-email] No email on payment:', payment_id);
    return res.status(200).json({ sent: false, note: 'No email found on payment' });
  }

  // ── 4. Deduplicate — skip if already sent for this payment ──
  // (client-side guard in thankyou.html handles most cases)

  // ── 5. Send email via Resend ──
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail    = process.env.FROM_EMAIL || 'AI Income Playbooks <noreply@notiondemand.com>';
  const siteUrl      = (process.env.SITE_URL || '').replace(/\/$/, '');
  const loginUrl     = `${siteUrl}/app.html`;
  const calendlyUrl  = 'https://calendly.com/team-notiondemand';

  if (!resendApiKey) {
    console.error('[send-email] RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const firstName = customerName.split(' ')[0];

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your AI Income Playbooks are ready!</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#141414;border-radius:16px;border:1px solid #262626;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#f59e0b;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#000;letter-spacing:-0.02em;">AI Income Playbooks</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(0,0,0,0.6);font-weight:500;">by NotionDemand</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f5f5f5;letter-spacing:-0.02em;">You're in! 🎉</h2>
              <p style="margin:0 0 24px;font-size:16px;color:#a3a3a3;">
                Hey ${firstName},<br/>your AI Income Playbooks are ready. Here's everything you need.
              </p>

              <!-- Access Code -->
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a3a3a3;">Your Access Code</p>
                <p style="margin:0 0 12px;font-size:36px;font-weight:900;color:#f59e0b;letter-spacing:0.1em;font-family:monospace;">FASTSCALE</p>
                <p style="margin:0;font-size:13px;color:#a3a3a3;">Go to <strong style="color:#f5f5f5;">notionwealth.ai</strong>, scroll to the bottom of the page, and enter this code to access your playbooks anytime</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#000;font-size:16px;font-weight:800;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:-0.01em;">
                  Access Your Playbooks →
                </a>
              </div>

              <!-- Steps -->
              <h3 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#f5f5f5;">Here's what to do next:</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:10px 0;border-bottom:1px solid #262626;"><span style="color:#f59e0b;font-weight:700;">1.</span><span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Click the button above to open your Notion playbooks</span></td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #262626;"><span style="color:#f59e0b;font-weight:700;">2.</span><span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Duplicate it to your own Notion workspace</span></td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #262626;"><span style="color:#f59e0b;font-weight:700;">3.</span><span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Use the "Which Model Fits You" guide to pick ONE playbook</span></td></tr>
                <tr><td style="padding:10px 0;"><span style="color:#f59e0b;font-weight:700;">4.</span><span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Follow the 7-day plan. Take action every day.</span></td></tr>
              </table>

              <!-- DFY Upsell -->
              <div style="background:#1a1a1a;border:1px solid #262626;border-radius:10px;padding:20px;margin-top:28px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#f5f5f5;">Want us to build it for you?</p>
                <p style="margin:0 0 14px;font-size:13px;color:#a3a3a3;">Done-For-You AI services: <strong style="color:#f59e0b;">₹1L – ₹3L</strong></p>
                <a href="${calendlyUrl}" style="display:inline-block;background:transparent;color:#f59e0b;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;border:1px solid rgba(245,158,11,0.3);">
                  Book a Strategy Call →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #262626;text-align:center;">
              <p style="margin:0;font-size:12px;color:#525252;">
                NotionDemand · <a href="mailto:team@notiondemand.com" style="color:#525252;">team@notiondemand.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const textBody = `
You're in! 🎉

Hey ${firstName},
Your AI Income Playbooks are ready.

YOUR ACCESS CODE: FASTSCALE

Go to notionwealth.ai, scroll to the bottom of the page, and enter this code.
Or access directly: ${loginUrl}

What to do next:
1. Open your Notion playbooks: ${loginUrl}
2. Duplicate it to your Notion workspace
3. Use the "Which Model Fits You" guide to pick ONE playbook
4. Follow the 7-day plan

Want us to build it for you?
Done-For-You AI services: ₹1L–₹3L
Book a call: ${calendlyUrl}

Questions? team@notiondemand.com

NotionDemand 2026`.trim();

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customerEmail],
        subject: 'Your AI Income Playbooks are ready! 🚀',
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[send-email] Resend error:', errText);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log('[send-email] Email sent to:', customerEmail);
    return res.status(200).json({ sent: true });

  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
