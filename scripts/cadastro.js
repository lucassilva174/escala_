import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function mostrarToast(mensagem, cor = "bg-green-600") {
  const toast = document.getElementById("toast");
  toast.textContent = mensagem;
  toast.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
    px-6 py-3 rounded-lg text-white font-medium shadow-lg text-center z-50 ${cor}`;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

document

  .getElementById("cadastroForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const equipe = document.getElementById("equipe").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // ✅ Coleta todos os checkboxes, mesmo ocultos com `peer hidden`
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    const instrumentos = Array.from(checkboxes)
      .filter((el) => el.checked)
      .map((el) => el.value);

    if (instrumentos.length === 0) {
      mostrarToast("Selecione pelo menos um instrumento.");
      return;
    }

    // ✅ Verifica se o instrumento "Ministro" foi selecionado
    const isMinistro = instrumentos.includes("Ministro");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        telefone,
        email,
        instrumentos,
        equipe,
        ministro: isMinistro, // grava true se tiver "Ministro"
      });

      mostrarToast("Cadastro realizado com sucesso!");
      window.location.href = "index.html";
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        mostrarToast("Este e-mail já está em uso. Tente outro.");
      } else {
        console.error(error);
        mostrarToast(
          "Erro ao cadastrar. Verifique os dados e tente novamente."
        );
      }
    }
  });
