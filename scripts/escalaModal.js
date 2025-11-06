// escalaModal.js
import {
  collection,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase-config.js";

// --- Estados globais ---
let usuarioAtual = {};
let instrumentosMarcadosPorKey = new Map();
let grupoExtraPorChave = new Map();
const normKey = (data, desc) => `${data}|${(desc || "").trim().toLowerCase()}`;

// 🔹 Cria o modal (apenas uma vez)
export function criarModalInstrumento() {
  if (
    document.getElementById("instrumentoModal") &&
    document.getElementById("listaInstrumentosModal")
  )
    return;

  const modal = document.createElement("div");
  modal.id = "instrumentoModal";
  modal.className =
    "fixed inset-0 bg-black/50 hidden items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-sm w-11/12 text-center">
      <h3 class="text-lg font-semibold mb-3">Escolha o instrumento</h3>
      <div id="listaInstrumentosModal" class="flex flex-wrap gap-2 justify-center mb-4"></div>
      <button id="cancelarInstrumento" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  document
    .getElementById("cancelarInstrumento")
    .addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target.id === "instrumentoModal") fecharModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });
}

function fecharModal() {
  const modal = document.getElementById("instrumentoModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

export function configurarUsuarioEscala(dadosUsuario, marcados, extras) {
  usuarioAtual = dadosUsuario;
  instrumentosMarcadosPorKey = marcados;
  grupoExtraPorChave = extras;
}

// 🔹 Abre o modal com os instrumentos
export function abrirModal(instrumentos, data, descricao) {
  const container = document.getElementById("listaInstrumentosModal");
  container.innerHTML = "";

  const key = normKey(data, descricao);
  const marcadosEscala = instrumentosMarcadosPorKey.get(key) || [];
  const marcadoExtra = grupoExtraPorChave.get(key) || null;
  const selecionadosLower = new Set(marcadosEscala);

  instrumentos.forEach((inst) => {
    const instLower = (inst || "").toLowerCase();
    const btn = document.createElement("button");

    if (marcadoExtra) {
      const isOEscolhido = instLower === marcadoExtra;
      btn.textContent = inst;
      btn.className =
        (isOEscolhido ? "bg-green-600" : "bg-gray-400 opacity-60") +
        " text-white px-4 py-2 rounded cursor-not-allowed";
      btn.disabled = true;
      container.appendChild(btn);
      return;
    }

    const isMarcado = selecionadosLower.has(instLower);
    btn.textContent = inst;
    btn.className =
      (isMarcado ? "bg-green-600" : "bg-blue-600") +
      " text-white hover:opacity-90 px-4 py-2 rounded transition";
    btn.onclick = () => verificarConflito(data, descricao, inst);
    container.appendChild(btn);
  });

  const modal = document.getElementById("instrumentoModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function exibirToast(mensagem, tipo = "error") {
  const icones = {
    success: "M5 13l4 4L19 7",
    error: "M6 18L18 6M6 6l12 12",
    info: "M13 16h-1v-4h-1m1-4h.01",
  };
  const cores = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  const toast = document.createElement("div");
  toast.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
    px-6 py-4 rounded-lg shadow-lg text-white z-[9999] flex items-center space-x-3 text-sm 
    ${cores[tipo] || cores.info}
  `;
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
        icones[tipo] || icones.info
      }" />
    </svg>
    <span>${mensagem}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function verificarConflito(data, descricao, instrumentoSelecionado) {
  const key = normKey(data, descricao);
  if (grupoExtraPorChave.has(key)) {
    exibirToast(
      "Este evento foi definido manualmente pelo administrador para você.",
      "info"
    );
    return;
  }

  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  let conflito = null;
  let instrumentosDoUsuario = [];

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();

    if (
      dados.diasSelecionados?.some(
        (d) =>
          d.data === data &&
          d.instrumento === instrumentoSelecionado &&
          d.descricao === descricao
      )
    ) {
      if (dados.uid !== usuarioAtual.uid) {
        conflito = dados.nome;
      }
    }

    if (dados.uid === usuarioAtual.uid) {
      dados.diasSelecionados?.forEach((d) => {
        if (d.data === data && d.descricao === descricao) {
          instrumentosDoUsuario.push(d.instrumento);
        }
      });
    }
  });

  if (conflito) {
    exibirToast(`Instrumento já marcado por ${conflito}`);
    return;
  }

  const isMinistro = usuarioAtual.instrumentos?.includes("Ministro");

  if (!isMinistro && instrumentosDoUsuario.length >= 1) {
    exibirToast("Você só pode marcar um instrumento por culto.");
    return;
  }

  if (isMinistro) {
    if (instrumentosDoUsuario.length >= 2) {
      exibirToast("Ministro só pode marcar 2 instrumentos por culto.");
      return;
    }
    if (
      instrumentosDoUsuario.length === 1 &&
      instrumentosDoUsuario[0] !== "Ministro" &&
      instrumentoSelecionado !== "Ministro"
    ) {
      exibirToast("Ministro deve marcar 'Ministro' + 1 instrumento.");
      return;
    }
    if (
      instrumentosDoUsuario.length === 1 &&
      instrumentosDoUsuario[0] === "Ministro" &&
      instrumentoSelecionado === "Ministro"
    ) {
      exibirToast("Você já marcou 'Ministro'. Escolha outro instrumento.");
      return;
    }
  }

  await salvarEscolha(data, descricao, instrumentoSelecionado);
  exibirToast("Obrigado pelo seu Servir !", "success");
  fecharModal();
  setTimeout(() => location.reload(), 4000);
}

async function salvarEscolha(data, descricao, instrumento) {
  const auth = getAuth();
  const { uid, nome, equipe, ministro } = usuarioAtual;
  if (!auth.currentUser || uid !== auth.currentUser.uid) {
    console.error("Tentativa de gravar com UID inválido.");
    exibirToast("Erro de autenticação ao salvar.", "error");
    return;
  }

  const ref = doc(db, "escalas", uid);
  const snapshot = await getDoc(ref);
  const diasSelecionados = snapshot.exists()
    ? snapshot.data().diasSelecionados || []
    : [];

  const dataISO =
    typeof data === "string"
      ? data
      : new Date(data).toISOString().split("T")[0];

  diasSelecionados.push({ data: dataISO, descricao, instrumento });

  await setDoc(ref, {
    uid,
    nome,
    equipe,
    instrumento,
    ministro,
    diasSelecionados,
  });
}
