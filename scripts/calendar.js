// calendar.js
// Certifique-se de que FullCalendar está carregado via CDN no seu HTML
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

import {
  getEscalasCollection,
  getGrupoExtraCollection,
} from "./firestoreService.js";
import { getLoggedInUserUid, getUserPermissions } from "./currentUser.js";
import { abrirModalLinks } from "./eventLinkModal.js"; // Importe a função do modal de links

export async function carregarCalendario() {
  const userUid = getLoggedInUserUid(); // Obter o UID do usuário logado
  if (!userUid) {
    console.error("UID do usuário não disponível para carregar calendário.");
    return;
  }

  const eventos = [];
  const mapaPorData = {};

  const escalasSnap = await getEscalasCollection();
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
    const uid = dados.uid || null;

    if (!mapaPorData[data]) mapaPorData[data] = [];
    mapaPorData[data].push({
      nome: dados.nome,
      instrumento: dados.instrumento,
      descricao: dados.descricao,
      userId: uid || "grupoExtra",
    });

    // Adiciona evento verde se for o usuário logado
    if (uid === userUid) {
      //eventos.push({ title: "Marcado", start: data, color: "#47a447" });
    }
  });

  Object.keys(mapaPorData).forEach((data) => {
    const lista = mapaPorData[data];
    const temUsuarioAtual = lista.some((item) => item.userId === userUid); // Use o UID do usuário
    const temOutros = lista.some((item) => item.userId !== userUid);

    if (temUsuarioAtual)
      eventos.push({ title: "Marcado", start: data, color: "#47a447" });
    if (temOutros)
      eventos.push({ title: "Marcado", start: data, color: "#f39c12" });
  });

  // scripts/calendar.js

  // ... (código anterior)

  const calendar = new FullCalendar.Calendar(
    document.getElementById("calendarioContainer"),
    {
      initialView: "dayGridMonth",
      locale: "pt-br",
      height: "auto",
      contentHeight: "auto",
      headerToolbar: { left: "prev,next today", center: "title", right: "" },
      events: eventos,
      dateClick: async function (info) {
        const localDate = new Date(
          info.date.getTime() - info.date.getTimezoneOffset() * 60000
        );
        const data = localDate.toISOString().split("T")[0];

        const lista = mapaPorData[data];
        if (!lista) return;

        const container = document.getElementById("modalLista");
        const titulo = document.getElementById("modalData");
        const manhaEl = document.getElementById("listaManha");
        const noiteEl = document.getElementById("listaNoite");

        manhaEl.innerHTML = "";
        noiteEl.innerHTML = "";

        let descricaoBruta = lista[0]?.descricao || "Evento";
        const descricaoEvento = descricaoBruta
          .replace(/\s*\(.*?\)\s*/g, "")
          .trim();

        const [ano, mes, diaNum] = data.split("-");
        titulo.innerHTML = `<strong>${descricaoEvento}</strong><br>${diaNum}/${mes}/${ano}`;

        // 1. Função de ordenação
        function ordenarPorInstrumentoPrioritario(lista) {
          const ordem = [
            "Ministro",
            "Backing-1",
            "Backing-2",
            "Violão",
            "Guitarra",
            "Baixo",
            "Bateria",
            "Teclado",
            "Violino",
            "Cajon",
          ];

          return lista.sort((a, b) => {
            const idxA = ordem.findIndex((o) =>
              a.instrumento?.toLowerCase().includes(o.toLowerCase())
            );
            const idxB = ordem.findIndex((o) =>
              b.instrumento?.toLowerCase().includes(o.toLowerCase())
            );
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
        }

        // 2. Refatorado
        function renderizarListaPorPeriodo(lista, periodo, containerEl) {
          const filtrada = lista.filter((item) => {
            const desc = (item.descricao || "").toLowerCase();
            return periodo === "noite"
              ? desc.includes("noite")
              : !desc.includes("noite");
          });

          const ordenada = ordenarPorInstrumentoPrioritario(filtrada);

          ordenada.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = `${item.nome} - ${item.instrumento}`;
            containerEl.appendChild(li);
          });
        }

        // E então no seu dateClick:
        renderizarListaPorPeriodo(lista, "manha", manhaEl);
        renderizarListaPorPeriodo(lista, "noite", noiteEl);

        const botao = document.getElementById("btnAddLink");
        // const { isAdmin, isMinistro } = getUserPermissions(); // Linha original para obter permissões.

        // --- INÍCIO DA ALTERAÇÃO ---
        // O botão "Link Músicas / Paleta" deve ser visível para TODOS os usuários,
        // independentemente de serem Admin ou Ministro.
        // A lógica de permissão para ADIÇÃO/EDIÇÃO/REMOÇÃO de links e paleta
        // será tratada DENTRO do modal de links (eventLinkModal.js).
        botao.style.display = "inline-block"; // Garante que o botão esteja sempre visível.
        // --- FIM DA ALTERAÇÃO ---

        // Adicione a função para abrir o modal de links aqui
        botao.onclick = () => abrirModalLinks(data, descricaoEvento);

        container.style.display = "flex";
      },
    }
  );

  calendar.render();
}
