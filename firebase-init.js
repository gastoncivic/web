
// firebase-init.js

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDCJWM_PZjRis_f3p9NzmtMXib45cUTNvg",
  authDomain: "hp-cars.firebaseapp.com",
  projectId: "hp-cars",
  storageBucket: "hp-cars.appspot.com",
  messagingSenderId: "286656208008",
  appId: "1:286656208008:web:f3cee48f7637f16fbe933d"
};

// Inicializar Firebase solo si no fue inicializado aún
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
