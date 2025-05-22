// Importação do Firebase e Firestore
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Toast
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Referências principais
const diasRef = collection(db, "diasDisponiveis");
const eventosExtrasRef = collection(db, "eventosExtras");
const auth = getAuth();

let editandoDia = null;
let editandoEvento = null;

// 🔹 Adicionar ou editar dia disponível
async function adicionarDia(event) {
  event.preventDefault();
  const novaData = document.getElementById("data-disponivel")?.value;
  const descricao = document.getElementById("descricao-evento")?.value;

  if (!novaData || !descricao) {
    showToast("Preencha todos os campos.", "error");
    return;
  }

  try {
    if (editandoDia) {
      const docRef = doc(db, "diasDisponiveis", editandoDia);
      await updateDoc(docRef, { data: novaData, descricao });
      showToast("Dia atualizado com sucesso!");
    } else {
      await addDoc(diasRef, { data: novaData, descricao });
      showToast("Dia adicionado com sucesso!");
    }

    document.getElementById("form-dias").reset();
    editandoDia = null;
    carregarDias();
  } catch (error) {
    console.error("Erro ao salvar dia:", error);
    showToast("Erro ao salvar dia.", "error");
  }
}

function editarDia(id, data, descricao) {
  document.getElementById("data-disponivel").value = data;
  document.getElementById("descricao-evento").value = descricao;
  editandoDia = id;
}

// 🔹 Excluir dia
async function excluirDia(id) {
  mostrarModalConfirmacao("Deseja realmente excluir este dia?", async () => {
    try {
      await deleteDoc(doc(db, "diasDisponiveis", id));
      exibirToast("Dia excluído com sucesso.");
      carregarDias();
    } catch (error) {
      console.error("Erro ao excluir dia:", error);
      exibirToast("Erro ao excluir dia.", true);
    }
  });
}

async function carregarDias() {
  const lista = document.getElementById("lista-dias");
  if (!lista) return;
  lista.innerHTML = "";

  try {
    const snapshot = await getDocs(diasRef);
    snapshot.forEach((docSnap) => {
      const { data, descricao } = docSnap.data();
      const id = docSnap.id;
      const [ano, mes, diaNum] = data.split("-");
      const dataFormatada = `${diaNum}/${mes}/${ano}`;

      const li = document.createElement("li");
      li.innerHTML = `
        ${dataFormatada} - ${descricao}
        <button onclick="editarDia('${id}', '${data}', '${descricao}')">✏️</button>
        <button onclick="excluirDia('${id}')">🗑️</button>
      `;
      lista.appendChild(li);
    });
  } catch (error) {
    console.error("Erro ao carregar dias:", error);
  }
}
//Evento extra
async function adicionarEvento(event) {
  event.preventDefault();
  const nome = document.getElementById("nome-evento")?.value;
  const data = document.getElementById("data-evento")?.value;

  if (!nome || !data) {
    showToast("Preencha todos os campos.", "error");
    return;
  }

  try {
    if (editandoEvento) {
      const eventoDoc = doc(db, "eventosExtras", editandoEvento);
      await updateDoc(eventoDoc, { nome, data });
      showToast("Evento extra atualizado!");
    } else {
      await addDoc(eventosExtrasRef, { nome, data });
      showToast("Evento extra adicionado!");
    }

    document.getElementById("form-evento").reset();
    editandoEvento = null;
    carregarEventos();
  } catch (error) {
    console.error("Erro ao salvar evento:", error);
    showToast("Erro ao salvar evento.", "error");
  }
}

function editarEvento(id, nome, data) {
  document.getElementById("nome-evento").value = nome;
  document.getElementById("data-evento").value = data;
  editandoEvento = id;
}

// 🔹 Excluir evento extra
async function excluirEvento(id) {
  mostrarModalConfirmacao(
    "Deseja realmente excluir este evento extra?",
    async () => {
      try {
        await deleteDoc(doc(db, "eventosExtras", id));
        exibirToast("Evento extra excluído com sucesso.");
        carregarEventos();
      } catch (error) {
        console.error("Erro ao excluir evento extra:", error);
        exibirToast("Erro ao excluir evento.", true);
      }
    }
  );
}

async function carregarEventos() {
  const lista = document.getElementById("lista-eventos");
  if (!lista) return;
  lista.innerHTML = "";

  try {
    const snapshot = await getDocs(eventosExtrasRef);
    snapshot.forEach((docSnap) => {
      const { nome, data } = docSnap.data();
      const id = docSnap.id;
      const [ano, mes, diaNum] = data.split("-");
      const dataFormatada = `${diaNum}/${mes}/${ano}`;

      const li = document.createElement("li");
      li.innerHTML = `
        ${dataFormatada} - ${nome} <span class="badge">Extra</span>
        <button onclick="editarEvento('${id}', '${nome}', '${data}')">✏️</button>
        <button onclick="excluirEvento('${id}')">🗑️</button>
      `;
      lista.appendChild(li);
    });
  } catch (error) {
    console.error("Erro ao carregar eventos extras:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const formDias = document.getElementById("form-dias");
  if (formDias) {
    formDias.addEventListener("submit", adicionarDia);
    carregarDias();
  }

  const formEventos = document.getElementById("form-evento");
  if (formEventos) {
    formEventos.addEventListener("submit", adicionarEvento);

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          const isAdmin = userDoc.exists() && userDoc.data().admin === true;
          if (isAdmin) {
            carregarEventos();
          }
        } catch (error) {
          console.error("Erro ao verificar permissões:", error);
        }
      }
    });
  }

  const adminContent = document.getElementById("adminContent");
  if (adminContent) {
    adminContent.style.display = "block";
    adminContent.classList.add("container");
  }

  const btnEscala = document.getElementById("btnTelaEscala");
  if (btnEscala) {
    btnEscala.addEventListener("click", () => {
      window.location.href = "consulta.html";
    });
  }
});

window.editarDia = editarDia;
window.excluirDia = excluirDia;
window.editarEvento = editarEvento;
window.excluirEvento = excluirEvento;

// 🔹 Toast estilo

function exibirToast(mensagem, erro = false) {
  const toast = document.getElementById("toast");
  toast.textContent = mensagem;
  toast.classList.toggle("erro", erro);
  toast.style.opacity = "1";
  toast.style.visibility = "visible";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.visibility = "hidden";
  }, 3000);
}

//Usar o modal

function mostrarModalConfirmacao(mensagem, callbackConfirmar) {
  const modal = document.getElementById("modalConfirmacao");
  const msg = document.getElementById("modalMensagem");
  const btnConfirmar = document.getElementById("btnConfirmarModal");
  const btnCancelar = document.getElementById("btnCancelarModal");

  msg.textContent = mensagem;
  modal.style.display = "flex";

  const fecharModal = () => {
    modal.style.display = "none";
    btnConfirmar.removeEventListener("click", confirmar);
    btnCancelar.removeEventListener("click", cancelar);
  };

  const confirmar = () => {
    fecharModal();
    callbackConfirmar(); // Executa ação confirmada
  };

  const cancelar = () => {
    fecharModal(); // Apenas fecha
  };

  btnConfirmar.addEventListener("click", confirmar);
  btnCancelar.addEventListener("click", cancelar);
}
