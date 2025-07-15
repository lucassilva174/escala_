// usuarios.js (com suporte para edição de perfil do usuário)
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDocs,
  getDoc,
  updateDoc,
  collection,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";

function mostrarToast(mensagem, tipo = "success") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");

  const tipos = {
    success: {
      bg: "bg-green-600",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`,
    },
    error: {
      bg: "bg-red-600",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
    },
    info: {
      bg: "bg-blue-600",
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01" />`,
    },
  };

  const { bg, icon } = tipos[tipo] || tipos.info;

  toast.className = `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-lg shadow-lg text-white z-50 flex items-center space-x-3 animate-fade ${bg}`;
  toastIcon.innerHTML = icon;
  toastMsg.textContent = mensagem;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

const usuariosTabela = document.getElementById("usuariosTabela");
let usuarioIdSelecionado = null;

async function carregarUsuarios() {
  const querySnapshot = await getDocs(collection(db, "usuarios"));
  usuariosTabela.innerHTML = "";

  querySnapshot.forEach((docSnapshot) => {
    const usuario = docSnapshot.data();
    const usuarioId = docSnapshot.id;
    const isAtivo = usuario.ativo !== false;

    const card = document.createElement("div");
    card.className = `rounded-lg shadow p-4 transition ${
      isAtivo ? "bg-cyan-50" : "bg-red-300"
    }`;

    const botaoNome = document.createElement("button");
    botaoNome.className =
      "w-full flex items-center gap-3 text-left font-semibold text-white bg-cyan-800 px-1 py-2 rounded hover:bg-cyan-900 transition";

    if (usuario.fotoURL) {
      const img = document.createElement("img");
      img.src = usuario.fotoURL;
      img.alt = "Foto de perfil";
      img.className = "w-12 h-12 rounded-full object-cover border border-white";
      botaoNome.appendChild(img);
    }

    const nomeSpan = document.createElement("span");
    nomeSpan.textContent = usuario.nome || "Sem nome";
    botaoNome.appendChild(nomeSpan);

    const detalhesDiv = document.createElement("div");
    detalhesDiv.className = "mt-3 text-sm hidden";
    detalhesDiv.innerHTML = `
  <div class="space-y-2">
    <p><strong>Email:</strong> ${usuario.email || ""}</p>
    <p><strong>Telefone:</strong> ${usuario.telefone || ""}</p>
    <p><strong>Instrumentos:</strong> ${
      usuario.instrumentos ? usuario.instrumentos.join(", ") : "Nenhum"
    }</p>
    <p><strong>Equipe:</strong> ${usuario.equipe || "Não informado"}</p>
    <div class="pt-2 flex flex-col gap-2">
      <button class="btn-redefinir-senha bg-cyan-700 text-white py-2 px-4 rounded" data-email="${
        usuario.email
      }">
        Redefinir Senha
      </button>
      <button onclick="abrirModalExcluir('${usuarioId}')" class="bg-red-600 text-white py-2 px-4 rounded">
        Excluir
      </button>
      <button onclick="abrirModalEditarUsuario('${usuarioId}')" class="bg-yellow-500 text-white py-2 px-4 rounded">
        Editar
      </button>
      <button onclick="alternarStatusAtivo('${usuarioId}', ${isAtivo})"
              class="${
                isAtivo ? "bg-gray-800" : "bg-green-600"
              } text-white py-2 px-4 rounded">
        ${isAtivo ? "Inativar" : "Ativar"}
      </button>
    </div>
  </div>
`;

    botaoNome.addEventListener("click", () => {
      detalhesDiv.classList.toggle("hidden");
    });

    card.appendChild(botaoNome);
    card.appendChild(detalhesDiv);
    usuariosTabela.appendChild(card);
  });

  document.querySelectorAll(".btn-redefinir-senha").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = btn.getAttribute("data-email");
      try {
        await sendPasswordResetEmail(auth, email);
        mostrarToast(`E-mail enviado para ${email}`);
      } catch (error) {
        console.error("Erro ao enviar:", error.message);
        mostrarToast("Erro ao enviar. Verifique o e-mail.", "error");
      }
    });
  });
}

window.alternarStatusAtivo = async function (usuarioId, statusAtual) {
  try {
    const ref = doc(db, "usuarios", usuarioId);
    await updateDoc(ref, { ativo: !statusAtual });
    mostrarToast(
      `Usuário ${!statusAtual ? "ativado" : "inativado"} com sucesso!`
    );
    carregarUsuarios();
  } catch (error) {
    console.error("Erro ao alternar status:", error);
    mostrarToast("Erro ao alterar status do usuário", "error");
  }
};

window.abrirModalExcluir = function (usuarioId) {
  usuarioIdSelecionado = usuarioId;
  document.getElementById("modalExcluir").style.display = "flex";
};

window.fecharModal = function (modalId) {
  document.getElementById(modalId).style.display = "none";
};

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("confirmarExclusaoBtn")
    .addEventListener("click", async () => {
      if (usuarioIdSelecionado) {
        await deleteDoc(doc(db, "usuarios", usuarioIdSelecionado));
        mostrarToast("Usuário excluído com sucesso!");
        fecharModal("modalExcluir");
        carregarUsuarios();
      }
    });
});

// Editar Usuário
window.abrirModalEditarUsuario = async function (uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const usuario = snap.data();

  document.getElementById("uidEditarUsuario").value = uid;
  document.getElementById("editarEmailUsuario").value = usuario.email || "";
  document.getElementById("editarTelefoneUsuario").value =
    usuario.telefone || "";
  document.getElementById("editarEquipeUsuario").value = usuario.equipe || "";

  // Insere os instrumentos como texto separados por vírgula
  const instrumentosText = (usuario.instrumentos || []).join(", ");
  document.getElementById("editarInstrumentosUsuario").value = instrumentosText;

  document.getElementById("modalEditarUsuario").classList.remove("hidden");
};

document.getElementById("formEditarUsuario").onsubmit = async (e) => {
  e.preventDefault();

  const uid = document.getElementById("uidEditarUsuario").value;
  const email = document.getElementById("editarEmailUsuario").value.trim();
  const telefone = document
    .getElementById("editarTelefoneUsuario")
    .value.trim();
  const equipe = document.getElementById("editarEquipeUsuario").value.trim();
  const instrumentos = document
    .getElementById("editarInstrumentosUsuario")
    .value.split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0); // Remove strings vazias

  const ref = doc(db, "usuarios", uid);
  await updateDoc(ref, { email, telefone, equipe, instrumentos });

  mostrarToast("Usuário atualizado com sucesso!");
  document.getElementById("modalEditarUsuario").classList.add("hidden");
  carregarUsuarios();
};

document.getElementById("cancelarEdicaoUsuario").onclick = () => {
  document.getElementById("modalEditarUsuario").classList.add("hidden");
};

window.onload = carregarUsuarios;
