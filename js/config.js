/* ============================================================
   LA CHAPELLE OCCULTE — configuration du site
   Seul fichier à modifier pour brancher un téléphone ou un e-mail.
   ============================================================ */
window.CHAPELLE = {
  nom: 'La Chapelle Occulte',

  /* ---- À COMPLÉTER SI LE SALON LE SOUHAITE ------------------------------
     Aucun numéro ni e-mail n'est publié sur Google Maps, Instagram ou
     Facebook : le salon se contacte aujourd'hui par message Instagram.
     Dès qu'un numéro / une adresse est renseigné(e) ci-dessous, le site
     active automatiquement les boutons « Appeler », « SMS » et « E-mail »,
     le bouton flottant mobile et les données structurées Google.
       phone : format international, ex. '+33612345678'
       email : ex. 'contact@exemple.fr'
  ------------------------------------------------------------------------ */
  phone: '',
  email: '',

  /* ---- Contacts publics vérifiés ---------------------------------------- */
  instagram: 'lachapelleocculte.tattoo',
  messenger: 'Lachapelleoccultetattoo',
  facebook: 'https://www.facebook.com/Lachapelleoccultetattoo/',
  mapsUrl:
    'https://www.google.com/maps/place/La+chapelle+occulte/@48.9393864,6.1141551,17z/data=!4m6!3m5!1s0x4794c776187e4167:0x7697e17728183b38!8m2!3d48.9393864!4d6.1141551!16s%2Fg%2F11ms7wbnqh',

  adresse: '97 rue du Chêne Brûlé, 54700 Lesménils',

  /* Horaires d'ouverture (Google Maps). 0 = dimanche … 6 = samedi */
  horaires: {
    0: null,
    1: null,
    2: ['13:30', '18:00'],
    3: ['13:30', '18:00'],
    4: ['13:30', '18:00'],
    5: ['13:30', '18:00'],
    6: ['10:30', '18:00']
  },

  /* Jours où l'on peut demander un créneau : mêmes jours que les horaires */
  fuseau: 'Europe/Paris',
  joursReservablesMax: 120
};
