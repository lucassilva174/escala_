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
  const mapaPorData = {};

  // 🔹 Escalas marcadas pelos usuários
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const nome = dados.nome || "Usuário";
    const userId = dados.uid;

    (dados.diasSelecionados || []).forEach((dia) => {
      const data = dia.data;
      const instrumento = dia.instrumento;
      const descricao = dia.descricao || "Evento";

      if (!mapaPorData[data]) mapaPorData[data] = [];
      mapaPorData[data].push({ nome, instrumento, descricao, userId });
    });
  });

  // 🔹 Eventos adicionados manualmente (grupoExtra)
  const grupoExtraSnap = await getDocs(collection(db, "grupoExtra"));
  grupoExtraSnap.forEach((doc) => {
    const dados = doc.data();
    const data = dados.data;
    const nome = dados.nome || "Participante";
    const instrumento = dados.instrumento || "—";
    const descricao = dados.descricao || "Evento Extra";

    if (!mapaPorData[data]) mapaPorData[data] = [];
    mapaPorData[data].push({
      nome,
      instrumento,
      descricao,
      userId: "grupoExtra",
    });
  });

  // 🔸 Monta os eventos (verde = usuário atual, laranja = outros)
  Object.keys(mapaPorData).forEach((data) => {
    const lista = mapaPorData[data];
    const temUsuarioAtual = lista.some((item) => item.userId === uid);
    const temOutros = lista.some((item) => item.userId !== uid);

    if (temUsuarioAtual) {
      eventos.push({ title: "Marcado", start: data, color: "#47a447" }); // Verde
    }
    if (temOutros) {
      eventos.push({ title: "Marcado", start: data, color: "#f39c12" }); // Laranja
    }
  });

  // 🔹 Renderiza calendário
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
    dateClick: function (info) {
      const lista = mapaPorData[info.dateStr];
      if (!lista) return;

      const container = document.getElementById("modalLista");
      const titulo = document.getElementById("modalData");
      const manhaEl = document.getElementById("listaManha");
      const noiteEl = document.getElementById("listaNoite");

      const dataFormatada = new Date(info.dateStr).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      titulo.textContent = dataFormatada;

      manhaEl.innerHTML = "";
      noiteEl.innerHTML = "";

      lista.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.nome} - ${item.instrumento}`;
        const desc = item.descricao.toLowerCase();

        if (desc.includes("manhã") || desc.includes("manha")) {
          manhaEl.appendChild(li);
        } else if (desc.includes("noite")) {
          noiteEl.appendChild(li);
        } else {
          manhaEl.appendChild(li); // padrão
        }
      });

      container.style.display = "flex";
    },
  });

  calendar.render();
}
