// dias.js corrigido — garante consistência de datas e evita offset indesejado
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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { obterDiasDefinidosPeloAdmin } from "./database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioAtual = {};

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
    .addEventListener("click", fecharModal);
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

function exibirToast(msg, cor = "#e74c3c") {
  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.style.background = cor;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function verificarConflito(data, descricao, instrumentoSelecionado) {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);
  let conflito = null;
  const instrumentosMarcados = [];

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const dias = dados.diasSelecionados || [];
    dias.forEach((d) => {
      const mesmaData = d.data === data;
      const mesmaDescricao = d.descricao === descricao;
      const mesmoInstrumento = d.instrumento === instrumentoSelecionado;

      if (
        mesmaData &&
        mesmaDescricao &&
        mesmoInstrumento &&
        dados.uid !== usuarioAtual.uid
      ) {
        conflito = dados.nome;
      }

      if (dados.uid === usuarioAtual.uid && mesmaData && mesmaDescricao) {
        instrumentosMarcados.push(d.instrumento);
      }
    });
  });

  if (conflito) {
    exibirToast(`Instrumento já marcado por ${conflito}`);
    return;
  }

  const inst = instrumentoSelecionado.toLowerCase();
  const marcouMinistro = instrumentosMarcados.includes("ministro");
  const total = instrumentosMarcados.length;

  if (!usuarioAtual.ministro && total >= 1) {
    exibirToast("Você já marcou um instrumento neste evento.");
    return;
  }

  if (usuarioAtual.ministro) {
    if (total >= 2) {
      exibirToast("Você já marcou dois instrumentos neste evento.");
      return;
    }

    if (total === 1 && instrumentosMarcados.includes(inst)) {
      exibirToast("Você já marcou esse instrumento neste evento.");
      return;
    }

    if (total === 1 && inst !== "ministro" && !marcouMinistro) {
      exibirToast(
        "Você só pode marcar outro instrumento se já tiver marcado 'ministro'."
      );
      return;
    }
  }

  await salvarEscolha(data, descricao, instrumentoSelecionado);
  exibirToast("Obrigado pelo seu Servir !", "#27ae60");
  fecharModal();
  setTimeout(() => location.reload(), 2000);
}

async function salvarEscolha(data, descricao, instrumento) {
  const { uid, nome, equipe, ministro } = usuarioAtual;
  if (!auth.currentUser || uid !== auth.currentUser.uid) {
    console.error("Tentativa de gravar com UID inválido.");
    exibirToast("Erro de autenticação ao salvar.");
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

document.addEventListener("DOMContentLoaded", () => {
  criarModal();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return (window.location.href = "index.html");

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

    const escalaRef = doc(db, "escalas", user.uid);
    const escalaSnap = await getDoc(escalaRef);
    const diasMarcados = new Set();
    if (escalaSnap.exists()) {
      const dias = escalaSnap.data().diasSelecionados || [];
      dias.forEach((d) => diasMarcados.add(`${d.data}|${d.descricao}`));
    }

    const diasPadrao = await obterDiasDefinidosPeloAdmin();
    const extrasSnap = await getDocs(collection(db, "eventosExtras"));
    const eventosExtras = extrasSnap.docs.map((doc) => ({
      ...doc.data(),
      extra: true,
    }));
    const dias = [...diasPadrao, ...eventosExtras];
    dias.sort((a, b) => a.data.localeCompare(b.data));

    const diasContainer = document.getElementById("dias-container");
    diasContainer.innerHTML =
      dias.length === 0 ? "<p>Nenhum dia definido pelo administrador.</p>" : "";

    dias.forEach((dia) => {
      const label = document.createElement("label");
      label.classList.add("checkbox-dia");
      const chave = `${dia.data}|${dia.descricao || dia.nome || "Evento"}`;
      const jaMarcado = diasMarcados.has(chave);

      const texto =
        `${dia.descricao || dia.nome || "Evento"} (${dia.data
          .split("-")
          .reverse()
          .join("/")})` +
        (dia.extra ? " <span style='color:green'>(Extra)</span>" : "") +
        (jaMarcado ? " <span style='color:gray;'>(já marcado)</span>" : "");

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
