// ✅ PERFIL.JS COM SUPORTE A TÍTULOS DE MÚSICAS NOS LINKS
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
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userUid = null;
let usuarioLogado = {}; // Dados do usuário logado
let usuarioAtual = {}; // Usado globalmente para permissões

// ▶️ Quando o usuário logar
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "index.html");
  userUid = user.uid;

  const userDocRef = doc(db, "usuarios", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) return alert("Usuário não encontrado.");

  usuarioLogado = userDocSnap.data();
  usuarioAtual = usuarioLogado; // Disponível globalmente

  document.getElementById("perfilContainer").innerHTML = `
    <div class="card"><strong>Email</strong><div>${
      usuarioLogado.email || user.email
    }</div></div>
    <div class="card"><strong>Telefone</strong><div>${
      usuarioLogado.telefone || "Não informado"
    }</div></div>
    <div class="card"><strong>Instrumentos</strong><div>${(
      usuarioLogado.instrumentos || []
    ).join(", ")}</div></div>
    <div class="card"><strong>Equipe</strong><div>${
      usuarioLogado.equipe || "Não informado"
    }</div></div>
  `;

  await carregarCalendario(userUid);
});

// ▶️ Carrega e exibe o calendário
async function carregarCalendario(uid) {
  const eventos = [];
  const mapaPorData = {};

  const escalasSnap = await getDocs(collection(db, "escalas"));
  escalasSnap.forEach((docSnap) => {
    const dados = docSnap.data();
    const nome = dados.nome || "Usuário";
    const userId = dados.uid;
    (dados.diasSelecionados || []).forEach((dia) => {
      const data = dia.data;
      if (!mapaPorData[data]) mapaPorData[data] = [];
      mapaPorData[data].push({
        nome,
        instrumento: dia.instrumento,
        descricao: dia.descricao,
        userId,
      });
    });
  });

  const grupoExtraSnap = await getDocs(collection(db, "grupoExtra"));
  grupoExtraSnap.forEach((docSnap) => {
    const dados = docSnap.data();
    const data = dados.data;
    if (!mapaPorData[data]) mapaPorData[data] = [];
    mapaPorData[data].push({
      nome: dados.nome,
      instrumento: dados.instrumento,
      descricao: dados.descricao,
      userId: "grupoExtra",
    });
  });

  Object.keys(mapaPorData).forEach((data) => {
    const lista = mapaPorData[data];
    const temUsuarioAtual = lista.some((item) => item.userId === uid);
    const temOutros = lista.some((item) => item.userId !== uid);

    if (temUsuarioAtual)
      eventos.push({ title: "Marcado", start: data, color: "#47a447" });
    if (temOutros)
      eventos.push({ title: "Marcado", start: data, color: "#f39c12" });
  });

  const calendar = new FullCalendar.Calendar(
    document.getElementById("calendarioContainer"),
    {
      initialView: "dayGridMonth",
      locale: "pt-br",
      height: 500,
      headerToolbar: { left: "prev,next today", center: "title", right: "" },
      events: eventos,
      dateClick: async function (info) {
        const data = info.dateStr;
        const lista = mapaPorData[data];
        if (!lista) return;

        const container = document.getElementById("modalLista");
        const titulo = document.getElementById("modalData");
        const manhaEl = document.getElementById("listaManha");
        const noiteEl = document.getElementById("listaNoite");

        manhaEl.innerHTML = "";
        noiteEl.innerHTML = "";

        titulo.textContent = new Date(data).toLocaleDateString("pt-BR");

        lista.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `${item.nome} - ${item.instrumento}`;
          const desc = item.descricao?.toLowerCase() || "";

          (desc.includes("noite") ? noiteEl : manhaEl).appendChild(li);
        });

        const botao = document.getElementById("btnAddLink");
        const isMinistro = usuarioLogado.instrumentos?.includes("Ministro");
        const isAdmin = usuarioLogado.admin === true;

        if (isMinistro || isAdmin) {
          botao.style.display = "inline-block";
          botao.onclick = () =>
            abrirModalLinks(data, lista[0]?.descricao || "Evento");
        } else {
          botao.style.display = "none";
          abrirModalLinks(data, lista[0]?.descricao || "Evento"); // Exibe apenas leitura
        }

        container.style.display = "flex";
      },
    }
  );

  calendar.render();
}

// ▶️ Modal para adicionar/exibir links de músicas
function abrirModalLinks(data, descricao) {
  const modal = document.getElementById("modalLinks");
  const lista = document.getElementById("listaLinks");
  const eventoId = `${data}_${descricao}`;

  document.getElementById("dataModalLinks").value = data;
  document.getElementById("descricaoModalLinks").value = descricao;
  document.getElementById("novoLink").value = "";
  modal.style.display = "flex";

  carregarLinksSalvos(eventoId, lista);

  const form = document.getElementById("formLinks");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const url = document.getElementById("novoLink").value.trim();
    const titulo = prompt("Digite o nome da música:").trim();
    if (!url || !titulo) return;

    await adicionarLink(eventoId, { url, titulo });
    document.getElementById("novoLink").value = "";
    carregarLinksSalvos(eventoId, lista);
  };

  form.style.display =
    usuarioAtual.instrumentos?.includes("Ministro") || usuarioAtual.admin
      ? "block"
      : "none";
}

// ▶️ Carrega e exibe os links salvos
async function carregarLinksSalvos(eventoId, listaContainer) {
  const docRef = doc(db, "linksEventos", eventoId);
  const snap = await getDoc(docRef);

  listaContainer.innerHTML = "";

  if (snap.exists()) {
    const links = snap.data().links || [];
    links.forEach((item, index) => {
      const { url, titulo } =
        typeof item === "string"
          ? { url: item, titulo: `Música ${index + 1}` }
          : item;

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.textContent = `🎵 ${titulo}`;
      a.style.marginRight = "8px";

      li.appendChild(a);

      if (
        usuarioAtual.instrumentos?.includes("Ministro") ||
        usuarioAtual.admin
      ) {
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = async () => {
          await removerLink(eventoId, index);
          carregarLinksSalvos(eventoId, listaContainer);
        };
        li.appendChild(btn);
      }

      listaContainer.appendChild(li);
    });
  } else {
    listaContainer.innerHTML =
      "<li style='color:gray'>Nenhum link de música registrado.</li>";
  }
}

// ▶️ Adiciona link ao evento
async function adicionarLink(eventoId, objLink) {
  const ref = doc(db, "linksEventos", eventoId);
  const snap = await getDoc(ref);
  const links = snap.exists() ? snap.data().links || [] : [];
  links.push(objLink);
  await setDoc(ref, { links });
}

// ▶️ Remove link do evento
async function removerLink(eventoId, index) {
  const ref = doc(db, "linksEventos", eventoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const links = snap.data().links || [];
  links.splice(index, 1);
  await setDoc(ref, { links });
}
