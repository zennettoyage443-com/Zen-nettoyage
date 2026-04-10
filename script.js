document.getElementById('submitBtn').addEventListener('click', function() {
  var nom = document.getElementById('f-nom').value.trim();
  var tel = document.getElementById('f-tel').value.trim();
  var email = document.getElementById('f-email').value.trim();
  var type = document.getElementById('f-type').value;

  if (!nom || !tel || !email || !type) {
    alert('Veuillez remplir les champs obligatoires : nom, telephone, email et type de prestation.');
    return;
  }

  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://formspree.io/f/xreojbbp', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'application/json');

  xhr.onload = function() {
    if (xhr.status === 200) {
      document.getElementById('formContent').style.display = 'none';
      document.getElementById('successMsg').style.display = 'block';
    } else {
      alert('Erreur lors de l envoi. Appelez-nous au 07 44 25 76 76.');
      btn.disabled = false;
      btn.textContent = 'Demander un devis gratuit';
    }
  };

  xhr.onerror = function() {
    alert('Erreur de connexion. Appelez-nous au 07 44 25 76 76.');
    btn.disabled = false;
    btn.textContent = 'Demander un devis gratuit';
  };

  var data = JSON.stringify({
    nom: nom,
    telephone: tel,
    email: email,
    prestation: type,
    localisation: document.getElementById('f-ville').value,
    message: document.getElementById('f-msg').value
  });

  xhr.send(data);
});
