import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document
  .getElementById("cadastroForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const telefone = document.getElementById("telefone").value;
    const equipe = document.getElementById("equipe").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const instrumentos = Array.from(
      document.getElementById("instrumentos").selectedOptions
    ).map((opt) => opt.value);
    const ministro = document.getElementById("ministro").checked;

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
        ministro,
        equipe,
      });

      alert("Cadastro realizado com sucesso!");
      window.location.href = "index.html";
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        alert("Este e-mail já está em uso. Tente outro.");
      } else {
        alert("Erro ao cadastrar. Verifique os dados e tente novamente.");
      }
    }
  });
