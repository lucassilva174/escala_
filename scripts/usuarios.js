import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDocs,
  getDoc,
  updateDoc,
  collection,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";

// 🔸 Toast com ícone, animação e cor
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

  toast.className = `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                     px-6 py-4 rounded-lg shadow-lg text-white z-50 flex items-center space-x-3 animate-fade ${bg}`;

  toastIcon.innerHTML = icon;
  toastMsg.textContent = mensagem;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// 🔸 Container da lista
const usuariosTabela = document.getElementById("usuariosTabela");
let usuarioIdSelecionado = null;

// 🔸 Carregar lista de usuários
async function carregarUsuarios() {
  const querySnapshot = await getDocs(collection(db, "usuarios"));
  usuariosTabela.innerHTML = "";

  querySnapshot.forEach((docSnapshot) => {
    const usuario = docSnapshot.data();
    const usuarioId = docSnapshot.id;
    const isAtivo = usuario.ativo !== false;

    // 🔹 Card visual com cor dinâmica
    const card = document.createElement("div");
    card.className = `
      rounded-lg shadow p-4 transition
      ${isAtivo ? "bg-cyan-50" : "bg-red-300"}
    `;

    // 🔹 Nome do usuário como botão
    const botaoNome = document.createElement("button");
    botaoNome.className =
      "w-full text-left font-semibold text-white bg-cyan-800 px-4 py-2 rounded hover:bg-cyan-900 transition";
    botaoNome.textContent = usuario.nome || "Sem nome";

    // 🔹 Detalhes ocultos por padrão
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
          ${
            usuario.admin
              ? ""
              : `<button data-uid="${usuarioId}" class="btn-ativar ${
                  isAtivo ? "bg-green-600" : "bg-red-600"
                } text-white py-2 px-4 rounded">
                ${isAtivo ? "Ativo" : "Inativo"}
              </button>`
          }
          <button onclick="abrirModalExcluir('${usuarioId}')" class="bg-red-600 text-white py-2 px-4 rounded">
            Excluir
          </button>
        </div>
      </div>
    `;

    // 🔹 Toggle mostrar detalhes
    botaoNome.addEventListener("click", () => {
      detalhesDiv.classList.toggle("hidden");
    });

    // 🔹 Adiciona ao DOM
    card.appendChild(botaoNome);
    card.appendChild(detalhesDiv);
    usuariosTabela.appendChild(card);
  });

  // 🔹 Lógica dos botões "Redefinir Senha"
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

  // 🔹 Lógica dos botões "Ativo/Inativo"
  document.querySelectorAll(".btn-ativar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.getAttribute("data-uid");
      const ref = doc(db, "usuarios", uid);

      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const dados = snap.data();
        const novoStatus = !(dados.ativo !== false); // alterna entre true/false

        await updateDoc(ref, { ativo: novoStatus });
        mostrarToast(`Usuário ${novoStatus ? "ativado" : "inativado"}!`);
        carregarUsuarios();
      } catch (err) {
        console.error("Erro ao atualizar status:", err);
        mostrarToast("Erro ao alterar status.", "error");
      }
    });
  });
}

// 🔸 Modal de confirmação de exclusão
window.abrirModalExcluir = function (usuarioId) {
  usuarioIdSelecionado = usuarioId;
  document.getElementById("modalExcluir").style.display = "flex";
};

window.fecharModal = function (modalId) {
  document.getElementById(modalId).style.display = "none";
};

// 🔸 Confirmação da exclusão
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

// 🔸 Inicia carregamento
window.onload = carregarUsuarios;
