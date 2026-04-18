// ── Burger menu ──────────────────────────────────────────────────────────────
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (burgerBtn && mobileMenu) {
  burgerBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    burgerBtn.setAttribute('aria-expanded', isOpen);
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', false);
    });
  });
}

// ── Formulaire Formspree AJAX ─────────────────────────────────────────────────
const devisForm = document.getElementById('devisForm');
const formSuccess = document.getElementById('formSuccess');

if (devisForm) {
  devisForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = devisForm.querySelector('button[type="submit"]');

    // Validation minimale
    const nom = document.getElementById('nom').value.trim();
    const tel = document.getElementById('tel').value.trim();
    if (!nom || !tel) {
      alert('Merci de renseigner votre nom et votre téléphone.');
      return;
    }

    // Désactiver le bouton pendant l'envoi
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    // GA4 event
    const prestation = document.getElementById('prestation').value || 'Non précisée';
    const ville = document.getElementById('ville').value.trim() || 'Non précisée';
    if (typeof gtag !== 'undefined') {
      gtag('event', 'devis_envoye', { prestation, ville });
    }

    // Envoi AJAX vers Formspree
    try {
      const data = new FormData(devisForm);

      const response = await fetch('https://formspree.io/f/xreojbbp', {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        devisForm.style.display = 'none';
        if (formSuccess) {
          formSuccess.style.display = 'block';
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        const json = await response.json().catch(() => ({}));
        const errMsg = json.errors ? json.errors.map(e => e.message).join(', ') : 'Erreur lors de l\'envoi.';
        alert('Une erreur est survenue : ' + errMsg + '\nVeuillez réessayer ou nous appeler au 07 44 25 76 76.');
        submitBtn.disabled = false;
        submitBtn.textContent = '📋 Envoyer ma demande de devis';
      }
    } catch (err) {
      alert('Problème de connexion. Veuillez réessayer ou nous appeler au 07 44 25 76 76.');
      submitBtn.disabled = false;
      submitBtn.textContent = '📋 Envoyer ma demande de devis';
    }
  });
}

// ── GA4 tracking : clics téléphone ───────────────────────────────────────────
document.querySelectorAll('a[href^="tel:"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'phone_click', { event_category: 'contact' });
    }
  });
});

// ── GA4 tracking : clics WhatsApp ────────────────────────────────────────────
document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'whatsapp_click', { event_category: 'contact' });
    }
  });
});

// ── Smooth scroll avec offset nav fixe ───────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.querySelector('nav.main-nav')
      ? document.querySelector('nav.main-nav').offsetHeight : 64;
    const pos = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;
    window.scrollTo({ top: pos, behavior: 'smooth' });
  });
});

