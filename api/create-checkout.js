// api/create-checkout.js
// Vercel serverless function (Node ESM); uses node-fetch (already in your package.json)
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // parse JSON body
    const body = req.body && Object.keys(req.body).length ? req.body : JSON.parse(req.rawBody || '{}');

    let { amount, currency = 'ZAR', metadata = {}, successUrl, cancelUrl } = body;

    // Basic validation
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    // YOCO expects amount in cents (integer). If client already sends cents, remove conversion.
    // Here we assume client sends cents already (see client below); if client sends ZAR, multiply by 100.
    const amountInt = Number(amount); // e.g., 10000 for R100.00

    // Build the YOCO checkout body (simple required fields)
    const checkoutBody = {
      amount: amountInt,
      currency,
      // Optionally pass metadata so you can identify this checkout from webhooks or in app.
      metadata: metadata || {},
      // Optional: pass return URLs (YOCO will redirect after payment)
      successUrl: successUrl || 'https://your-site-domain/success.html',
      cancelUrl: cancelUrl || 'https://your-site-domain/cancel.html'
    };

    // Read secret from environment (set in Vercel as YOCO_SECRET_KEY)
    const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
    if (!YOCO_SECRET_KEY) {
      console.error('YOCO_SECRET_KEY missing in environment');
      res.status(500).json({ error: 'Server misconfiguration: missing YOCO key' });
      return;
    }

    const resp = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutBody)
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Bubble up useful error to client for debugging
      console.error('YOCO responded with error', resp.status, data);
      res.status(502).json({ error: 'YOCO API error', status: resp.status, detail: data });
      return;
    }

    // YOCO returns a redirect URL or checkout URL object — check common fields
    // Some docs/examples send back data.checkout_url or data.redirectUrl — normalize both.
    const checkoutUrl = data.checkout_url || data.redirectUrl || (data && data.data && data.data.redirectUrl);

    if (!checkoutUrl) {
      console.error('No redirect URL from YOCO', data);
      res.status(500).json({ error: 'No redirect URL from YOCO', data });
      return;
    }

    // Return the checkout URL to the client
    res.status(200).json({ checkout_url: checkoutUrl, raw: data });
  } catch (err) {
    console.error('Server error in create-checkout:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
