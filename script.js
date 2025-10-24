// script.js - clean version
const BACKEND_PATH = "/api/create-checkout";
const form = document.getElementById('paymentForm');
const feedback = document.getElementById('feedback');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(form).entries());
  const amountZAR = parseFloat(formData.amount) || 0;

  // Prevent invalid amounts before sending to backend
  if (amountZAR < 2) {
    feedback.textContent = "Minimum payment is R2.00";
    feedback.style.color = "red";
    return;
  }

  feedback.textContent = "Preparing payment, please wait...";
  feedback.style.color = "black";

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

    if (!resp.ok || !body.checkout_url) {
      // Show friendly message instead of flashing an error
      feedback.textContent = "Unable to start payment. Please try again.";
      feedback.style.color = "red";
      console.error("Backend returned:", body);
      return;
    }

    // Replace text with a neutral redirecting message, then redirect
    feedback.textContent = "Redirecting to secure Yoco payment...";
    feedback.style.color = "black";

    // Small delay (optional) just to show the user something
    setTimeout(() => {
      window.location.href = body.checkout_url;
    }, 300);

  } catch (err) {
    feedback.textContent = "Network error. Please try again.";
    feedback.style.color = "red";
    console.error(err);
  }
});
