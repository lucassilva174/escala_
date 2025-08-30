import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { exibirToast } from "./utils.js";

/*function mostrarToast(mensagem, cor = "bg-green-600") {
  const toast = document.getElementById("toast");
  toast.textContent = mensagem;
  toast.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
    px-6 py-3 rounded-lg text-white font-medium shadow-lg text-center z-50 ${cor}`;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}*/

document
  .getElementById("cadastroForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const equipe = document.getElementById("equipe").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // ✅ Coleta apenas os checkboxes dentro do formulário
    const checkboxes = document.querySelectorAll(
      "#cadastroForm input[type='checkbox']"
    );
    const instrumentos = Array.from(checkboxes)
      .filter((el) => el.checked)
      .map((el) => el.value);

    // 🔹 Validações extras
    if (!nome) {
      exibirToast("Preencha o campo nome.", "info");
      return;
    }
    if (!telefone) {
      exibirToast("Preencha o campo telefone.", "info");
      return;
    }
    if (instrumentos.length === 0) {
      exibirToast("Selecione pelo menos um instrumento.", "info");
      return;
    }
    if (!email.includes("@")) {
      exibirToast("Digite um e-mail válido.", "info");
      return;
    }
    if (senha.length < 6) {
      exibirToast("A senha deve ter pelo menos 6 caracteres.", "info");
      return;
    }

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
      });

      exibirToast("Cadastro realizado com sucesso!", "success");

      // ✅ Aguarda antes de redirecionar
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } catch (error) {
      console.error("Erro detalhado:", error);
      if (error.code === "auth/email-already-in-use") {
        exibirToast("Este e-mail já está em uso. Tente outro.", "bg-red-600");
      } else {
        exibirToast(`Erro: ${error.message}`, "bg-red-600");
      }
    }
  });
