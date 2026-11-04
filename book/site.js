(() => {
  const cfg = window.BOOK_CONFIG || {};
  const price = Number(cfg.price) || 299;

  function getEndpoint(action) {
    const base = cfg.apiBase || '/api/book';
    if (base.startsWith('/api/book')) {
      const map = {
        createOrder: '/api/book/create-order',
        verifyPayment: '/api/book/verify-payment',
        verifyOrder: '/api/book/verify-order',
        download: '/api/book/download'
      };
      return map[action] || base;
    }
    const cloudMap = {
      createOrder: `${base}/createBookOrder`,
      verifyPayment: `${base}/verifyBookPayment`,
      verifyOrder: `${base}/verifyBookOrder`,
      download: `${base}/downloadBook`
    };
    return cloudMap[action] || base;
  }

  // Format price elements
  function updatePrices() {
    document.querySelectorAll('[data-price]').forEach(el => {
      el.textContent = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: cfg.currency || 'INR',
        maximumFractionDigits: 0
      }).format(price);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePrices);
  } else {
    updatePrices();
  }

  // Ensure Razorpay SDK is loaded
  function ensureRazorpay() {
    return new Promise((resolve) => {
      if (typeof window.Razorpay !== 'undefined') {
        return resolve(true);
      }
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        setTimeout(() => resolve(typeof window.Razorpay !== 'undefined'), 1500);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  // Focus and highlight payment box right of book above
  window.focusPaymentBox = function () {
    const target = document.getElementById('payment-box');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const nameInput = document.getElementById('cust-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.classList.add('pulse-focus');
          setTimeout(() => nameInput.classList.remove('pulse-focus'), 1500);
        }
      }, 350);
    }
  };

  // Main Checkout Submission Handler
  window.handlePaymentSubmit = async function (e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    const nameInput = document.getElementById('cust-name');
    const emailInput = document.getElementById('cust-email');
    const phoneInput = document.getElementById('cust-phone');
    const checkoutBtn = document.getElementById('checkout-submit-btn');
    const containerBox = document.getElementById('checkout-container');

    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    let phone = (phoneInput?.value || '').trim();

    if (!name) {
      alert('Please enter your full name for digital delivery.');
      nameInput?.focus();
      return false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address for digital delivery.');
      emailInput?.focus();
      return false;
    }

    phone = phone.replace(/[^0-9+]/g, '');
    if (phone.length === 10) {
      phone = '+91' + phone;
    }
    if (phone.length < 10) {
      alert('Please enter a valid 10-digit mobile number for Razorpay payment.');
      phoneInput?.focus();
      return false;
    }

    const originalBtnText = checkoutBtn ? checkoutBtn.innerHTML : 'Get the complete pack';
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span class="spinner"></span> Creating Order...';
    }

    try {
      const rzpLoaded = await ensureRazorpay();
      if (!rzpLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Payment gateway is loading. Please check your internet connection and try again.');
      }

      let endpoint = getEndpoint('createOrder');
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone })
        });
      } catch (_) {
        if (cfg.cloudFunctionsFallback) {
          endpoint = `${cfg.cloudFunctionsFallback}/createBookOrder`;
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone })
          });
        }
      }

      const data = await res.json();
      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || 'Failed to create payment order.');
      }

      if (checkoutBtn) {
        checkoutBtn.innerHTML = '<span class="spinner"></span> Opening Razorpay...';
      }

      const rzpOptions = {
        key: data.keyId || cfg.razorpayKeyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: "The Working Man's Code",
        description: "84-Page Ebook + 8 Worksheets + Quickstart Guide",
        image: "https://gstwali.in/book/assets/cover.png",
        order_id: data.orderId,
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        theme: {
          color: "#d9432f"
        },
        handler: async function (paymentResp) {
          if (containerBox) {
            containerBox.innerHTML = `
              <div class="processing-box" style="padding:40px 10px;">
                <div class="spinner"></div>
                <h3 style="margin-top:16px;">Payment Received!</h3>
                <p>Verifying with bank and generating your instant download link...</p>
              </div>
            `;
          }

          try {
            let verifyEndpoint = getEndpoint('verifyPayment');
            let verifyRes;
            try {
              verifyRes = await fetch(verifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: paymentResp.razorpay_order_id,
                  razorpay_payment_id: paymentResp.razorpay_payment_id,
                  razorpay_signature: paymentResp.razorpay_signature,
                  name: name,
                  email: email,
                  phone: phone
                })
              });
            } catch (_) {
              if (cfg.cloudFunctionsFallback) {
                verifyEndpoint = `${cfg.cloudFunctionsFallback}/verifyBookPayment`;
                verifyRes = await fetch(verifyEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: paymentResp.razorpay_order_id,
                    razorpay_payment_id: paymentResp.razorpay_payment_id,
                    razorpay_signature: paymentResp.razorpay_signature,
                    name: name,
                    email: email,
                    phone: phone
                  })
                });
              }
            }

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              try {
                localStorage.setItem('gstwali_book_order', JSON.stringify({
                  orderId: paymentResp.razorpay_order_id,
                  paymentId: paymentResp.razorpay_payment_id,
                  token: verifyData.downloadToken,
                  email: email,
                  name: name,
                  paidAt: new Date().toISOString()
                }));
              } catch (_) {}

              const thankYouPath = cfg.thankYouUrl || '/book/thank-you/';
              const redirectTarget = `${thankYouPath}?order_id=${encodeURIComponent(paymentResp.razorpay_order_id)}&token=${encodeURIComponent(verifyData.downloadToken)}`;
              window.location.href = redirectTarget;
            } else {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }
          } catch (vErr) {
            alert(`Payment received, but auto-verification encountered an issue: ${vErr.message}\n\nPlease email ${cfg.supportEmail || 'arjunyadav.ps@gmail.com'} with Payment ID: ${paymentResp.razorpay_payment_id}`);
            if (containerBox) {
              containerBox.innerHTML = `
                <div class="processing-box" style="padding:30px 10px;">
                  <h3 style="color:#d9432f;">Verification Notice</h3>
                  <p>Payment ID: <strong>${paymentResp.razorpay_payment_id}</strong></p>
                  <p>Please contact <a href="mailto:${cfg.supportEmail || 'arjunyadav.ps@gmail.com'}">${cfg.supportEmail || 'arjunyadav.ps@gmail.com'}</a> for your instant download access.</p>
                </div>
              `;
            }
          }
        },
        modal: {
          ondismiss: function () {
            if (checkoutBtn) {
              checkoutBtn.disabled = false;
              checkoutBtn.innerHTML = originalBtnText;
            }
          }
        }
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();

    } catch (err) {
      alert('Could not start checkout: ' + err.message);
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalBtnText;
      }
    }

    return false;
  };
})();
