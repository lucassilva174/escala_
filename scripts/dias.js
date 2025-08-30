// dias.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração da aplicação Firebase
import { firebaseConfig } from "./firebase-config.js";
import { obterDiasDefinidosPeloAdmin } from "./database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --------- helpers e estados globais ---------
const normKey = (data, desc) => `${data}|${(desc || "").trim().toLowerCase()}`;

let usuarioAtual = {};
// key -> instrumento (lowercase) definido manualmente no grupoExtra para este usuário
let grupoExtraPorChave = new Map();
// key -> [instrumentos (lowercase)] que o usuário marcou em "escalas"
let instrumentosMarcadosPorKey = new Map();

/* Modal unico no script, foi retirado do html */
function criarModalInstrumento() {
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
}
function fecharModal() {
  const modal = document.getElementById("instrumentoModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
// liga o botão "Cancelar"
document
  .getElementById("cancelarInstrumento")
  ?.addEventListener("click", fecharModal);

// fechar ao clicar no fundo escuro
document.getElementById("instrumentoModal")?.addEventListener("click", (e) => {
  if (e.target.id === "instrumentoModal") fecharModal();
});

// fechar com tecla ESC
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

function abrirModal(instrumentos, data, descricao) {
  const container = document.getElementById("listaInstrumentosModal");
  container.innerHTML = "";

  const key = normKey(data, descricao);

  const marcadosEscala = instrumentosMarcadosPorKey.get(key) || []; // array lowercase
  const marcadoExtra = grupoExtraPorChave.get(key) || null; // string lowercase ou null

  const selecionadosLower = new Set(marcadosEscala); // só os de "escalas"

  instrumentos.forEach((inst) => {
    const instLower = (inst || "").toLowerCase();
    const btn = document.createElement("button");

    // Se foi definido manualmente no grupoExtra → trava tudo (somente exibe)
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

    // Sem grupoExtra: destaca os que o usuário já marcou nas "escalas"
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
  // Bloqueio extra de segurança: se o admin te adicionou no grupoExtra, não pode marcar nada
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

// --------- boot ---------
document.addEventListener("DOMContentLoaded", () => {
  criarModalInstrumento();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // usuário atual
    const userSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (!userSnap.exists()) return;

    const dados = userSnap.data();
    usuarioAtual = {
      uid: user.uid,
      nome: dados.nome || user.email,
      instrumentos: dados.instrumentos || [],
      equipe: dados.equipe || "Não informado",
      ministro: dados.ministro || false,
    };

    // Limpa/repovoa os mapas globais
    instrumentosMarcadosPorKey.clear();
    grupoExtraPorChave.clear();

    // 1) ESCALAS -> preenche instrumentosMarcadosPorKey
    const escalaSnap = await getDoc(doc(db, "escalas", user.uid));
    if (escalaSnap.exists()) {
      (escalaSnap.data().diasSelecionados || []).forEach((d) => {
        const key = normKey(d.data, d.descricao);
        const arr = instrumentosMarcadosPorKey.get(key) || [];
        arr.push((d.instrumento || "").toLowerCase());
        instrumentosMarcadosPorKey.set(key, arr);
      });
    }

    // 2) GRUPO EXTRA -> preenche grupoExtraPorChave (somente docs com uid do usuário)
    const geSnap = await getDocs(
      query(collection(db, "grupoExtra"), where("uid", "==", user.uid))
    );
    geSnap.forEach((docSnap) => {
      const g = docSnap.data();
      const key = normKey(g.data, g.descricao || g.nome);
      grupoExtraPorChave.set(key, (g.instrumento || "").toLowerCase());
    });

    // 3) DIAS (admin + extras)
    const diasPadrao = await obterDiasDefinidosPeloAdmin();
    const extrasSnap = await getDocs(collection(db, "eventosExtras"));
    const eventosExtras = extrasSnap.docs.map((d) => ({
      ...d.data(),
      extra: true,
    }));

    const dias = [...diasPadrao, ...eventosExtras].sort((a, b) =>
      a.data.localeCompare(b.data)
    );

    // 4) CARDS
    const diasContainer = document.getElementById("dias-container");
    diasContainer.innerHTML =
      dias.length === 0 ? "<p>Nenhum dia definido pelo administrador.</p>" : "";

    const chavesMarcadas = new Set([
      ...instrumentosMarcadosPorKey.keys(),
      ...grupoExtraPorChave.keys(),
    ]);

    dias.forEach((dia, index) => {
      const descricaoTexto = dia.descricao || dia.nome || "Evento";
      const key = normKey(dia.data, descricaoTexto);
      const dataFormatada = dia.data.split("-").reverse().join("/");

      const wrapper = document.createElement("div");
      wrapper.className =
        "checkbox-dia" + (chavesMarcadas.has(key) ? " marcado" : "");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `dia-${index}`;
      input.name = "dias[]";
      input.value = dia.data;
      input.style.display = "none";

      const label = document.createElement("label");
      label.setAttribute("for", `dia-${index}`);
      label.innerHTML = `
        <strong>${descricaoTexto} (${dataFormatada})</strong>
        ${dia.extra ? '<span style="color:orange;"> (Extra)</span>' : ""}
      `;
      label.addEventListener("click", (e) => {
        e.preventDefault();
        abrirModal(usuarioAtual.instrumentos, dia.data, descricaoTexto);
      });

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      diasContainer.appendChild(wrapper);
    });
  });
});

// --------- estilos ---------
const estilo = document.createElement("style");
estilo.textContent = `
  .checkbox-dia {
    display: block;
    background-color: #f0f9ff;
    border: 2px solid #38bdf8;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  .checkbox-dia:hover {
    background-color: #e0f2fe;
    border-color: #0ea5e9;
    transform: scale(1.02);
  }
  .checkbox-dia.marcado {
    background-color: #22c55e;
    color: white;
    border-color: #16a34a;
  }
`;
document.head.appendChild(estilo);
