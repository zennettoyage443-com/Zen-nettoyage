/* =============================================================
   ZEN NETTOYAGE 44 — script.js   |   GA4 : G-XMZZX8845J
   ============================================================= */

// ─────────────────────────────────────────────────────────────
// HELPER GA4 ROBUSTE
// Problème : gtag.js est async → peut ne pas être prêt quand
// script.js (defer) s'exécute. Solution : on pousse dans
// window.dataLayer directement ; GA4 les consomme à son chargement.
// ─────────────────────────────────────────────────────────────
function ga4(eventName, params) {
  try {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    } else {
      // Fallback : dataLayer direct (GA4 pickup automatique)
      window.dataLayer.push(
        Object.assign({ event: eventName }, params || {})
      );
    }
    console.log('[GA4]', eventName, params || {});
  } catch (err) {
    console.warn('[GA4] erreur :', err);
  }
}

// ─────────────────────────────────────────────────────────────
// BURGER MENU
// ─────────────────────────────────────────────────────────────
(function () {
  var btn  = document.getElementById('burgerBtn');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function () {
    var isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}());

// ─────────────────────────────────────────────────────────────
// FORMULAIRE FORMSPREE — AJAX (e.preventDefault strict)
// ─────────────────────────────────────────────────────────────
(function () {
  var form    = document.getElementById('devisForm');
  var success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    // Bloque TOUTE soumission native et toute redirection
    e.preventDefault();
    e.stopPropagation();

    var btn        = form.querySelector('button[type="submit"]');
    var nom        = (document.getElementById('nom')        || {}).value || '';
    var tel        = (document.getElementById('tel')        || {}).value || '';
    var prestation = (document.getElementById('prestation') || {}).value || 'Non précisée';
    var ville      = (document.getElementById('ville')      || {}).value || 'Non précisée';

    nom = nom.trim();
    tel = tel.trim();

    if (!nom || !tel) {
      alert('Merci de renseigner votre nom et votre téléphone.');
      return;
    }

    // Désactiver le bouton
    btn.disabled    = true;
    btn.textContent = 'Envoi en cours…';

    // GA4 avant fetch (évite perte en cas de navigation)
    ga4('devis_envoye', {
      prestation:    prestation,
      ville:         ville,
      form_source:   'formspree',
      page_location: window.location.href
    });

    try {
      var resp = await fetch('https://formspree.io/f/xreojbbp', {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (resp.ok) {
        form.style.display = 'none';
        if (success) {
          success.style.display = 'block';
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        var json   = await resp.json().catch(function () { return {}; });
        var errMsg = json.errors
          ? json.errors.map(function (e) { return e.message; }).join(', ')
          : "Erreur lors de l'envoi.";
        alert('Erreur : ' + errMsg
          + '\nVeuillez réessayer ou appeler le 07 44 25 76 76.');
        btn.disabled    = false;
        btn.textContent = '📋 Envoyer ma demande de devis';
      }
    } catch (err) {
      console.error('[Formspree] réseau :', err);
      alert('Problème de connexion. Appelez-nous au 07 44 25 76 76.');
      btn.disabled    = false;
      btn.textContent = '📋 Envoyer ma demande de devis';
    }
  });
}());

// ─────────────────────────────────────────────────────────────
// GA4 — TRACKING TÉLÉPHONE
// Délégation sur document → robuste même si DOM modifié
// ─────────────────────────────────────────────────────────────
document.addEventListener('click', function (e) {
  var link = e.target.closest('a[href^="tel:"]');
  if (!link) return;
  ga4('phone_click', {
    link_url:      link.getAttribute('href'),
    phone:         link.getAttribute('href').replace('tel:', ''),
    link_text:     (link.innerText || '').trim(),
    page_location: window.location.href
  });
});

// ─────────────────────────────────────────────────────────────
// GA4 — TRACKING WHATSAPP
// CORRECTION MOBILE : target="_blank" met la page en arrière-plan
// avant que gtag envoie la requête HTTP → event perdu.
// Solution : dataLayer.push SYNCHRONE + gtag utilise sendBeacon
// en interne pour les events émis juste avant navigation.
// ─────────────────────────────────────────────────────────────
document.addEventListener('click', function (e) {
  var link = e.target.closest('a[href*="wa.me"]');
  if (!link) return;

  // Push SYNCHRONE dans dataLayer (sendBeacon géré par GA4 nativement)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event:         'whatsapp_click',
    link_url:      link.getAttribute('href'),
    link_text:     (link.innerText || '').trim(),
    page_location: window.location.href
  });

  // Aussi via gtag si disponible
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'whatsapp_click', {
      link_url:      link.getAttribute('href'),
      link_text:     (link.innerText || '').trim(),
      page_location: window.location.href
    });
  }

  console.log('[GA4] whatsapp_click', link.getAttribute('href'));
  // PAS de e.preventDefault() → WhatsApp s'ouvre normalement
});

// ─────────────────────────────────────────────────────────────
// SMOOTH SCROLL — avec offset nav fixe
// ─────────────────────────────────────────────────────────────
document.addEventListener('click', function (e) {
  var link = e.target.closest('a[href^="#"]');
  if (!link) return;
  var href = link.getAttribute('href');
  if (!href || href === '#') return;
  var target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  var nav    = document.querySelector('nav.main-nav');
  var offset = nav ? nav.offsetHeight : 64;
  var pos    = target.getBoundingClientRect().top + window.pageYOffset - offset - 12;
  window.scrollTo({ top: pos, behavior: 'smooth' });
});
