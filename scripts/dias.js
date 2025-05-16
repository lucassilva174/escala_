// dias.js atualizado com seleção de instrumento e destaque de eventos extras
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

import { firebaseConfig } from "./firebase-config.js";
import { obterDiasDefinidosPeloAdmin } from "./database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioAtual = {};

// Cria o modal flutuante
function criarModal() {
  const modal = document.createElement("div");
  modal.id = "modalInstrumento";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Escolha um instrumento</h3>
      <div id="opcoesInstrumentos"></div>
      <button id="btnCancelarModal">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  document
    .getElementById("btnCancelarModal")
    .addEventListener("click", () => fecharModal());
}

function abrirModal(instrumentos, data, descricao) {
  const container = document.getElementById("opcoesInstrumentos");
  container.innerHTML = "";

  instrumentos.forEach((inst) => {
    const btn = document.createElement("button");
    btn.textContent = inst;
    btn.className = "btn-instrumento";
    btn.onclick = () => verificarConflito(data, descricao, inst);
    container.appendChild(btn);
  });

  document.getElementById("modalInstrumento").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modalInstrumento").style.display = "none";
}
//Cor do toast
function exibirToast(msg, cor = "#e74c3c") {
  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.style.background = cor;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
  toast.classList.add(cor === "#27ae60" ? "success" : "error");
}

// 🔸 Verifica se outro usuário já marcou o mesmo instrumento para o dia
async function verificarConflito(data, descricao, instrumentoSelecionado) {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  let conflito = null;

  snapshot.forEach((doc) => {
    const dados = doc.data();
    if (
      dados.diasSelecionados?.some(
        (d) =>
          d.data === data &&
          d.instrumento === instrumentoSelecionado &&
          d.descricao === descricao
      )
    ) {
      conflito = dados.nome;
    }
  });

  if (conflito) {
    exibirToast(`Instrumento já marcado por ${conflito}`);
  } else {
    await salvarEscolha(data, descricao, instrumentoSelecionado);
    exibirToast("Obrigado pelo seu Servir !", "#27ae60");
    fecharModal();
  }
}

// 🔸 Salva escolha no banco
async function salvarEscolha(data, descricao, instrumento) {
  const { uid, nome, equipe, ministro } = usuarioAtual;

  // ✅ Confirma se o uid é do usuário autenticado
  if (!auth.currentUser || uid !== auth.currentUser.uid) {
    console.error("Tentativa de gravar com UID inválido.");
    exibirToast("Erro de autenticação ao salvar.", "#e74c3c");
    return;
  }

  const ref = doc(db, "escalas", uid);
  const snapshot = await getDoc(ref);

  let diasSelecionados = [];
  if (snapshot.exists()) {
    diasSelecionados = snapshot.data().diasSelecionados || [];
  }

  diasSelecionados.push({ data, descricao, instrumento });

  await setDoc(ref, {
    uid,
    nome,
    equipe,
    instrumento,
    ministro, //Faltou esse
    diasSelecionados,
  });
}

// 🔸 Quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  criarModal();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

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

    const diasPadrao = await obterDiasDefinidosPeloAdmin();

    // 🔸 Buscar eventos extras
    const extrasSnap = await getDocs(collection(db, "eventosExtras"));
    const eventosExtras = extrasSnap.docs.map((doc) => ({
      ...doc.data(),
      extra: true, // identificador visual
    }));

    // 🔸 Juntar todos os dias (padrao + extras)
    const dias = [...diasPadrao, ...eventosExtras];

    const diasContainer = document.getElementById("dias-container");
    diasContainer.innerHTML = "";

    if (dias.length === 0) {
      diasContainer.innerHTML =
        "<p>Nenhum dia definido pelo administrador.</p>";
      return;
    }

    // 🔸 Exibir dias com destaque para eventos extras
    dias.forEach((dia) => {
      const label = document.createElement("label");
      label.classList.add("checkbox-dia");

      const texto =
        `${dia.descricao || dia.nome || "Evento"} (${dia.data
          .split("-")
          .reverse()
          .join("/")})` +
        (dia.extra ? " <span style='color:green'>(Extra)</span>" : "");

      label.innerHTML = `<span ${
        dia.extra ? 'style="font-weight: bold;"' : ""
      }>${texto}</span>`;
      label.addEventListener("click", () =>
        abrirModal(
          usuarioAtual.instrumentos,
          dia.data,
          dia.descricao || dia.nome || "Evento"
        )
      );

      diasContainer.appendChild(label);
    });
  });
});
