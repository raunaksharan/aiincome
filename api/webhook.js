// api/webhook.js — Razorpay Webhook Handler
// Vercel serverless function: POST /api/webhook
//
// Required environment variables (set in Vercel dashboard):
//   RAZORPAY_WEBHOOK_SECRET  — webhook secret from Razorpay dashboard
//   RESEND_API_KEY           — API key from resend.com
//   FROM_EMAIL               — sender address, e.g. "NotionDemand <noreply@notiondemand.com>"
//   SITE_URL                 — production URL, e.g. "https://notionwealth.com"

import crypto from 'crypto';

// Disable default body parsing so we can read the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Read the raw request body as a Buffer.
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Verify the Razorpay webhook signature.
 * Razorpay sends: X-Razorpay-Signature header
 * Expected HMAC: sha256(rawBody, webhookSecret)
 */
function verifyRazorpaySignature(rawBody, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Send a transactional email via the Resend API.
 */
async function sendEmailViaResend({ to, toName, fromEmail, resendApiKey, siteUrl }) {
  const loginUrl = `${siteUrl}/app.html`;
  const calendlyUrl = 'https://calendly.com/team-notiondemand'; // replace after setup

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
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#000;letter-spacing:-0.02em;">
                AI Income Playbooks
              </h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(0,0,0,0.6);font-weight:500;">by NotionDemand</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f5f5f5;letter-spacing:-0.02em;">
                You're in! 🎉
              </h2>
              <p style="margin:0 0 24px;font-size:16px;color:#a3a3a3;">
                Hey ${toName ? toName.split(' ')[0] : 'there'},<br/>
                your AI Income Playbooks are ready. Here's everything you need.
              </p>

              <!-- Access Code Box -->
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a3a3a3;">Your Access Code</p>
                <p style="margin:0 0 12px;font-size:36px;font-weight:900;color:#f59e0b;letter-spacing:0.1em;font-family:monospace;">FASTSCALE</p>
                <p style="margin:0;font-size:13px;color:#a3a3a3;">Save this — go to our website, scroll to the bottom of the page, and enter this code to access your playbooks anytime</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#000;font-size:16px;font-weight:800;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:-0.01em;">
                  Access Your Playbooks →
                </a>
              </div>

              <!-- Steps -->
              <h3 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#f5f5f5;">Here's what to do next:</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #262626;">
                    <span style="color:#f59e0b;font-weight:700;">1.</span>
                    <span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Open your Notion template using the button above</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #262626;">
                    <span style="color:#f59e0b;font-weight:700;">2.</span>
                    <span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Duplicate it to your own Notion workspace</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #262626;">
                    <span style="color:#f59e0b;font-weight:700;">3.</span>
                    <span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Use the "Which Model Fits You" guide to pick ONE playbook</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#f59e0b;font-weight:700;">4.</span>
                    <span style="color:#a3a3a3;font-size:14px;margin-left:8px;">Follow the 7-day plan. Take action every day.</span>
                  </td>
                </tr>
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
</html>
  `.trim();

  const textBody = `
You're in! 🎉

Hey ${toName ? toName.split(' ')[0] : 'there'},
Your AI Income Playbooks are ready.

YOUR ACCESS CODE: FASTSCALE

Go to our website, scroll to the bottom of the page, and enter this code to access your playbooks.
Or use the direct link: ${loginUrl}

What to do next:
1. Open your Notion template: ${loginUrl}
2. Duplicate it to your own Notion workspace
3. Use the "Which Model Fits You" guide to pick ONE playbook
4. Follow the 7-day plan

Want us to build it for you?
Done-For-You AI services: ₹1L–₹3L
Book a call: ${calendlyUrl}

Questions? Email us: team@notiondemand.com

NotionDemand 2026
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: 'Your AI Income Playbooks are ready! 🚀',
      html: htmlBody,
      text: textBody,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errText}`);
  }

  return response.json();
}

/**
 * Main webhook handler.
 */
export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read raw body (required for signature verification)
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[webhook] Failed to read request body:', err);
    return res.status(400).json({ error: 'Failed to read body' });
  }

  // Verify Razorpay signature
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET env var is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!signature) {
    console.warn('[webhook] Missing X-Razorpay-Signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    console.warn('[webhook] Invalid signature — request rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('[webhook] Failed to parse JSON payload:', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = payload.event;
  console.log('[webhook] Received event:', event);

  // Handle payment.captured
  if (event === 'payment.captured') {
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!paymentEntity) {
      console.warn('[webhook] payment.entity missing in payload');
      return res.status(200).json({ received: true, note: 'No payment entity' });
    }

    // Only handle payments from the aiincome payment link
    const allowedLinkId = process.env.RAZORPAY_PAYMENT_LINK_ID;
    if (allowedLinkId && paymentEntity.invoice_id !== allowedLinkId) {
      console.log('[webhook] Skipping — not an aiincome payment link');
      return res.status(200).json({ received: true, note: 'Not an aiincome payment' });
    }

    // Extract customer info
    // Razorpay stores email in payment entity; name may be in notes or customer fields
    const customerEmail = paymentEntity.email || null;
    const customerName =
      paymentEntity.notes?.name ||
      paymentEntity.contact || // sometimes phone is contact
      'Valued Customer';

    console.log('[webhook] Payment captured for:', customerEmail);

    if (!customerEmail) {
      console.warn('[webhook] No customer email found in payment payload');
      return res.status(200).json({ received: true, note: 'No email to send to' });
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'NotionDemand <noreply@notiondemand.com>';
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');

    if (!resendApiKey) {
      console.error('[webhook] RESEND_API_KEY env var is not set');
      // Return 200 so Razorpay doesn't retry — but log the issue
      return res.status(200).json({ received: true, note: 'Email not sent — missing API key' });
    }

    try {
      await sendEmailViaResend({
        to: customerEmail,
        toName: customerName,
        fromEmail,
        resendApiKey,
        siteUrl,
      });
      console.log('[webhook] Access email sent to:', customerEmail);
    } catch (emailErr) {
      console.error('[webhook] Failed to send email:', emailErr);
      // Still return 200 — payment is captured, don't block Razorpay
    }
  }

  // Always return 200 for all events so Razorpay stops retrying
  return res.status(200).json({ received: true });
}
