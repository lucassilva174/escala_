import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, auth } from "./firebase-config.js"; // ✅ auth agora vem daqui!

const usuariosTabela = document.getElementById("usuariosTabela");

let usuarioIdSelecionado = null;

async function carregarUsuarios() {
  const querySnapshot = await getDocs(collection(db, "usuarios"));
  usuariosTabela.innerHTML = "";

  querySnapshot.forEach((docSnapshot) => {
    const usuario = docSnapshot.data();
    const usuarioId = docSnapshot.id;

    const card = document.createElement("tr");
    card.classList.add("usuario-card");

    const tdContainer = document.createElement("td");
    tdContainer.colSpan = 6;

    const botaoNome = document.createElement("button");
    botaoNome.classList.add("usuario-nome");
    botaoNome.textContent = usuario.nome || "Sem nome";

    const detalhesDiv = document.createElement("div");
    detalhesDiv.classList.add("usuario-detalhes");

    detalhesDiv.innerHTML = `
      <table>
        <tr><td><strong>Email</strong></td><td>${usuario.email || ""}</td></tr>
        <tr><td><strong>Telefone</strong></td><td>${
          usuario.telefone || ""
        }</td></tr>
        <tr><td><strong>Instrumentos</strong></td><td>${
          usuario.instrumentos ? usuario.instrumentos.join(", ") : "Nenhum"
        }</td></tr>
        <tr><td><strong>Equipe</strong></td><td>${
          usuario.equipe || "Não informado"
        }</td></tr>
        <tr><td colspan="2">
          <button class="btn-redefinir-senha" data-email="${
            usuario.email
          }">Redefinir Senha</button>
          <button onclick="abrirModalExcluir('${usuarioId}')">Excluir</button>
        </td></tr>
      </table>
    `;

    botaoNome.addEventListener("click", () => {
      detalhesDiv.style.display =
        detalhesDiv.style.display === "none" || detalhesDiv.style.display === ""
          ? "block"
          : "none";
    });

    tdContainer.appendChild(botaoNome);
    tdContainer.appendChild(detalhesDiv);
    card.appendChild(tdContainer);
    usuariosTabela.appendChild(card);
  });

  // 🔹 Adiciona evento aos botões de redefinir senha
  document.querySelectorAll(".btn-redefinir-senha").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const email = botao.getAttribute("data-email");

      try {
        await sendPasswordResetEmail(auth, email); // ✅ usa o auth importado corretamente
        alert(`E-mail de redefinição de senha enviado para ${email}`);
      } catch (error) {
        console.error("Erro ao enviar e-mail:", error.message);
        alert("Erro ao enviar e-mail. Verifique se o e-mail está registrado.");
      }
    });
  });
}

// 🔹 Abrir e fechar modal de exclusão
window.abrirModalExcluir = function (usuarioId) {
  usuarioIdSelecionado = usuarioId;
  document.getElementById("modalExcluir").style.display = "flex";
};

window.fecharModal = function (modalId) {
  document.getElementById(modalId).style.display = "none";
};

// 🔹 Confirmação de exclusão
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("confirmarExclusaoBtn")
    .addEventListener("click", async () => {
      if (usuarioIdSelecionado) {
        await deleteDoc(doc(db, "usuarios", usuarioIdSelecionado));
        alert("Usuário excluído com sucesso!");
        fecharModal("modalExcluir");
        carregarUsuarios(); // Atualiza a lista
      }
    });
});

// 🔹 Carrega usuários ao abrir a página
window.onload = carregarUsuarios;
