// perfil.js (principal da página de perfil)
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { loadLoggedInUserData, getLoggedInUserData } from "./currentUser.js";
import { carregarCalendario } from "./calendar.js"; // Importa a função do calendário
import { registrarMovimentacao } from "./logger.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userData = await loadLoggedInUserData(user.uid);
  if (!userData) {
    alert("Usuário não encontrado.");
    return;
  }

  const usuarioLogado = getLoggedInUserData(); // Pega os dados carregados

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

  await carregarCalendario(); // Chama a função para carregar o calendário
});

// ===== integração do modal de escala no perfil =====
// coloque no final do perfil.js

import { db } from "./firebase-config.js";
import {
  getDocs,
  collection,
  query,
  where,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { obterDiasDefinidosPeloAdmin } from "./database.js"; // mesmo helper do dias.js
import {
  criarModalInstrumento,
  configurarUsuarioEscala,
  abrirModal,
} from "./escalaModal.js"; // arquivo que sugerimos criar

const btnAbrirModal = document.getElementById("btnAbrirModalEscala");
const btnFecharModal = document.getElementById("btnFecharModalEscala");
const modal = document.getElementById("modalEscalaPerfil");
const listaDias = document.getElementById("listaDiasDisponiveisPerfil");

// estados locais (mesma lógica de dias.js)
const normKey = (data, desc) => `${data}|${(desc || "").trim().toLowerCase()}`;
let instrumentosMarcadosPorKey = new Map();
let grupoExtraPorChave = new Map();
let usuarioAtual = {
  uid: null,
  nome: null,
  instrumentos: [],
  equipe: null,
  ministro: false,
};

// garante que o modal compartilhado exista
criarModalInstrumento();

// abre modal e carrega dados
btnAbrirModal?.addEventListener("click", async () => {
  // autenticação checada
  const user = auth.currentUser;
  if (!user) {
    // se quiser redirecionar para login:
    // window.location.href = "index.html";
    alert("Você precisa estar logado para usar o modal de escala.");
    return;
  }

  // mostra modal (o seu container)
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // recarrega e configura tudo
  await prepararEstadoUsuario(user.uid);
  renderizarDiasNoPerfil();
});

// fechar modal
btnFecharModal?.addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
});

// Se o usuário fecha clicando fora (overlay)
modal?.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
});

// carrega estado: usuarioAtual, instrumentosMarcadosPorKey, grupoExtraPorChave
async function prepararEstadoUsuario(uid) {
  // 1) usuário atual (do Firestore)
  try {
    const uSnap = await getDoc(doc(db, "usuarios", uid));
    const dados = uSnap.exists() ? uSnap.data() : {};
    usuarioAtual = {
      uid,
      nome: dados.nome || auth.currentUser?.displayName || uid,
      instrumentos: dados.instrumentos || [],
      equipe: dados.equipe || "Não informado",
      ministro: dados.ministro || false,
    };
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    usuarioAtual = {
      uid,
      nome: uid,
      instrumentos: [],
      equipe: null,
      ministro: false,
    };
  }

  // 2) instrumentos já marcados (escalas)
  instrumentosMarcadosPorKey.clear();
  try {
    const escalaSnap = await getDoc(doc(db, "escalas", uid));
    if (escalaSnap.exists()) {
      (escalaSnap.data().diasSelecionados || []).forEach((d) => {
        const key = normKey(d.data, d.descricao);
        const arr = instrumentosMarcadosPorKey.get(key) || [];
        arr.push((d.instrumento || "").toLowerCase());
        instrumentosMarcadosPorKey.set(key, arr);
      });
    }
  } catch (err) {
    console.warn("Erro ao ler escalas do usuário:", err);
  }

  // 3) grupoExtra (somente docs com uid do usuário)
  grupoExtraPorChave.clear();
  try {
    const geSnap = await getDocs(
      query(collection(db, "grupoExtra"), where("uid", "==", uid))
    );
    geSnap.forEach((docSnap) => {
      const g = docSnap.data();
      const key = normKey(g.data, g.descricao || g.nome);
      grupoExtraPorChave.set(key, (g.instrumento || "").toLowerCase());
    });
  } catch (err) {
    console.warn("Erro ao ler grupoExtra:", err);
  }

  // configura o modal compartilhado para usar estes estados
  configurarUsuarioEscala(
    {
      uid: usuarioAtual.uid,
      nome: usuarioAtual.nome,
      instrumentos: usuarioAtual.instrumentos,
      equipe: usuarioAtual.equipe,
      ministro: usuarioAtual.ministro,
    },
    instrumentosMarcadosPorKey,
    grupoExtraPorChave
  );
}

// monta e renderiza os cards/lista de dias dentro do modal do perfil
async function renderizarDiasNoPerfil() {
  listaDias.innerHTML = `<p class="col-span-2 text-center text-gray-500">Carregando...</p>`;

  try {
    const diasPadrao = await obterDiasDefinidosPeloAdmin(); // reuse seu helper
    const extrasSnap = await getDocs(collection(db, "eventosExtras"));
    const eventosExtras = extrasSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      extra: true,
    }));

    const dias = [...diasPadrao, ...eventosExtras].sort((a, b) =>
      (a.data || "").localeCompare(b.data || "")
    );

    listaDias.innerHTML = "";

    const chavesMarcadas = new Set([
      ...Array.from(instrumentosMarcadosPorKey.keys()),
      ...Array.from(grupoExtraPorChave.keys()),
    ]);

    dias.forEach((dia, index) => {
      const descricaoTexto = dia.descricao || dia.nome || "Evento";
      const key = normKey(dia.data, descricaoTexto);
      const dataFormatada = (dia.data || "").split("-").reverse().join("/");

      const wrapper = document.createElement("div");
      wrapper.className =
        "border rounded-lg p-3 text-center cursor-pointer bg-white";

      // marca visual se já marcado/extra
      if (chavesMarcadas.has(key))
        wrapper.classList.add("bg-green-50", "border-green-400");

      const titulo = document.createElement("div");
      titulo.innerHTML = `<strong>${descricaoTexto}</strong><div class="text-sm text-gray-600">${dataFormatada}${
        dia.extra ? ' <span style="color:orange">(Extra)</span>' : ""
      }</div>`;

      wrapper.appendChild(titulo);

      // clique abre modal de instrumentos compartilhado
      wrapper.addEventListener("click", (e) => {
        // abrir o modal de instrumentos com a lista de instrumentos do usuário
        // se dia possuir campo 'instrumentosDisponiveis' use ele, senão use usuarioAtual.instrumentos
        const instrumentos =
          dia.instrumentosDisponiveis || usuarioAtual.instrumentos || [];
        abrirModal(instrumentos, dia.data, descricaoTexto);
      });

      listaDias.appendChild(wrapper);
    });

    if (dias.length === 0) {
      listaDias.innerHTML =
        "<p class='col-span-2 text-center text-gray-500'>Nenhum dia disponível.</p>";
    }
  } catch (err) {
    console.error("Erro ao renderizar dias no perfil:", err);
    listaDias.innerHTML =
      "<p class='text-red-500 text-center'>Erro ao carregar dias.</p>";
  }
}
