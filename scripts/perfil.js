import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userUid = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userUid = user.uid;

    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const dados = userDocSnap.data();

        document.getElementById("perfilContainer").innerHTML = `
          <div class="card"><strong>Email</strong><div>${
            dados.email || user.email
          }</div></div>
          <div class="card"><strong>Telefone</strong><div>${
            dados.telefone || "Não informado"
          }</div></div>
          <div class="card"><strong>Instrumentos</strong><div>${(
            dados.instrumentos || []
          ).join(", ")}</div></div>
          <div class="card"><strong>Equipe</strong><div>${
            dados.equipe || "Não informado"
          }</div></div>
        `;

        await carregarCalendario(user.uid);
      } else {
        alert("Usuário não encontrado no banco de dados.");
      }
    } catch (erro) {
      console.error("Erro ao carregar dados do perfil:", erro);
    }
  } else {
    window.location.href = "index.html";
  }
});

// Upload de nova imagem — já é feito no header.js

async function carregarCalendario(uid) {
  const eventos = [];

  const diasRef = collection(db, "diasPreenchidos");
  const q = query(diasRef, where("uid", "==", uid));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.dias)) {
      data.dias.forEach((dia) => {
        eventos.push({
          title: "Disponível",
          start: dia,
          color: "#47a447",
        });
      });
    }
  });

  const calendarEl = document.getElementById("calendarioContainer");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: 500,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    events: eventos,
  });

  calendar.render();
}
