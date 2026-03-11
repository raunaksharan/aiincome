// api/validate.js — Passcode Validation
// Vercel serverless function: POST /api/validate
//
// Request body:  { code: string }
// Response:      { valid: true }  or  { valid: false }
//
// Valid codes are defined below. Additional codes can be added here
// or sourced from the PASSCODE_SECRET environment variable in future.
//
// Environment variables (optional):
//   PASSCODE_SECRET — reserved for future dynamic validation logic

const VALID_CODES = new Set([
  'EARLYADOPTER',
  'FOUNDER50',
  'LAUNCH27',
]);

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body — Vercel's default bodyParser handles JSON automatically
  let body = req.body;

  // If body is a string (raw body parsing edge case), parse it
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const { code } = body;

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ valid: false, error: 'Code is required' });
  }

  // Normalize: trim whitespace, uppercase
  const normalizedCode = code.trim().toUpperCase();

  const isValid = VALID_CODES.has(normalizedCode);

  // Add a small constant-time delay to prevent timing-based enumeration attacks
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (isValid) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(200).json({ valid: false });
  }
}
