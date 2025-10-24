// script.js - client
// Uses relative endpoint so it works on the same domain as your Vercel deployment.
const BACKEND_PATH = "/api/create-checkout";

const form = document.getElementById('paymentForm');
const feedback = document.getElementById('feedback');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = "Preparing payment…";

  const formData = Object.fromEntries(new FormData(form).entries());
  const amountZAR = parseFloat(formData.amount) || 0;

  // Convert ZAR to cents (YOCO expects integer cents)
  const amountCents = Math.round(amountZAR * 100);

  try {
    const resp = await fetch(BACKEND_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'ZAR',
        metadata: { reference: formData.reference || '' },
        successUrl: window.location.origin + '/success.html',
        cancelUrl: window.location.origin + '/cancel.html'
      })
    });

    const body = await resp.json();

    if (!resp.ok) {
      feedback.textContent = 'Payment could not be started: ' + (body && body.error ? body.error : resp.statusText);
      console.error('Backend error:', body);
      return;
    }

    // Backend returns { checkout_url: "https://..." }
    if (body.checkout_url) {
      window.location.href = body.checkout_url;
    } else {
      feedback.textContent = 'Payment could not be started. Please try again.';
      console.error('Missing checkout_url in response', body);
    }
  } catch (err) {
    console.error(err);
    feedback.textContent = 'Error initiating payment: ' + err.message;
  }
});
