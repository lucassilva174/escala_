// Importação dos módulos do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// O Analytics só funciona em produção com HTTPS — não é necessário em localhost
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAU_gns7SaNEA4B8HizeASKw-MxJQwb0kM",
  authDomain: "louvor-sara.firebaseapp.com",
  projectId: "louvor-sara",
  storageBucket: "louvor-sara.appspot.com", // 🔧 Corrigido: era ".firebasestorage.app"
  messagingSenderId: "28410852377",
  appId: "1:28410852377:web:208881d6ab87a5cbea2688",
  measurementId: "G-59DH4J4C3Z",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta os módulos para uso nos outros scripts
export { firebaseConfig, app, db, auth };

// Se quiser ativar Analytics no futuro:
// const analytics = getAnalytics(app);
// export { analytics };
