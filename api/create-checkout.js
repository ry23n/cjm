// api/create-checkout.js
// Vercel serverless function — must not expose secret keys in client code.
import dotenv from "dotenv";
dotenv.config();

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await (req.body && Object.keys(req.body).length ? req.body : JSON.parse(req.rawBody || '{}'));
    // Ensure the amount is provided
    let { amount, currency = 'ZAR', metadata = {}, successUrl, cancelUrl } = body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    // YOCO expects amount in cents (integer). Convert ZAR to cents.
    const amountInCents = Math.round(Number(amount) * 100);

    // Build payload for YOCO checkout creation
    const payload = {
      amount: amountInCents,
      currency,
      successUrl: successUrl || `${process.env.PUBLIC_BASE_URL || ''}/success.html`,
      cancelUrl: cancelUrl || `${process.env.PUBLIC_BASE_URL || ''}/cancel.html`,
      metadata
    };

    // Call YOCO Checkout API
    const resp = await fetch('https://api.yoco.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // DO NOT put secret keys in the client - server uses secret key from environment.
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('YOCO error', resp.status, text);
      res.status(502).json({ error: 'YOCO API error', detail: text });
      return;
    }

    const data = await resp.json();

    // YOCO returns a redirect URL in the checkout response (e.g., data.redirectUrl or data.redirect_url).
    // Inspect returned object in logs and adapt field name if different.
    const redirectUrl = data.redirect_url || data.redirectUrl || (data && data.checkout && data.checkout.redirect_url);

    if (!redirectUrl) {
      console.error('No redirect URL from YOCO', data);
      res.status(500).json({ error: 'No redirect URL from YOCO', data });
      return;
    }

    // Return redirect URL to the client
    res.status(200).json({ redirectUrl, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
