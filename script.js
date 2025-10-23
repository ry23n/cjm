// Edit BACKEND_URL to your Vercel function URL (or use relative '/api/create-checkout' if deployed together)
const BACKEND_URL = "https://<your-backend-deployment>.vercel.app/api/create-checkout";

const form = document.getElementById('paymentForm');
const feedback = document.getElementById('feedback');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = "Preparing payment…";

  const data = Object.fromEntries(new FormData(form).entries());
  // amount is in ZAR; YOCO expects amount in cents (integer). We convert.
  // For checkout API YOCO expects amount in cents (e.g., R100 -> 10000)
  const amountZAR = parseFloat(data.amount) || 0;
  const amountCents = Math.round(amountZAR * 100);

  try {
    const resp = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        metadata: data // pass all collected fields as metadata
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || 'Server error');
    }

    const body = await resp.json();
    // Expect { checkout_url: "https://..." }
    if (body.checkout_url) {
      window.location.href = body.checkout_url;
    } else {
      feedback.textContent = 'Payment could not be started. Please try again.';
      console.error(body);
    }

  } catch (err) {
    console.error(err);
    feedback.textContent = 'Error initiating payment: ' + err.message;
  }
});
