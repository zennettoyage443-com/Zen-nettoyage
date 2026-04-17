// Burger menu
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
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

// GA4 event devis (déclenché à la soumission du formulaire)
const devisForm = document.getElementById('devisForm');
if (devisForm) {
  devisForm.addEventListener('submit', () => {
    const prestation = document.getElementById('prestation').value || 'Non précisée';
    const ville = document.getElementById('ville').value.trim() || 'Non précisée';
    if (typeof gtag !== 'undefined') gtag('event', 'devis_envoye', { prestation, ville });
  });
}

// GA4 tracking clicks téléphone
document.querySelectorAll('a[href^="tel:"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') gtag('event', 'phone_click', { event_category: 'contact' });
  });
});

// GA4 tracking WhatsApp
document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') gtag('event', 'whatsapp_click', { event_category: 'contact' });
  });
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
