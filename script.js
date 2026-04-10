document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("cta-btn");

  if (btn) {
    btn.addEventListener("click", () => {
      alert("Contactez-nous pour un devis gratuit !");
    });
  }
});
