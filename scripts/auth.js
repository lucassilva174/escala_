// auth.js
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

//Função para verificar Admin para ser exportada no dias.js
// auth.js

// 🔹 Função de Login com verificação de Admin
async function login(email, senha) {
  try {
    console.log("Tentando logar com:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const dados = userSnap.data();

      if (dados.admin === true) {
        // ADMIN - mostra modal e redireciona
        const modal = document.getElementById("adminModal");
        const closeBtn = document.querySelector(".close");

        modal.style.display = "block";

        closeBtn.onclick = () => (modal.style.display = "none");
        window.onclick = (event) => {
          if (event.target == modal) modal.style.display = "none";
        };

        // ✅ NUNCA mostra o toast normal para admin
        // Redireciona para admin após 2.5s
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 2500);
      } else {
        // USUÁRIO COMUM
        localStorage.setItem("loginSucesso", "true"); // <-- Apenas aqui!
        window.location.href = "perfil.html";
      }
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    alert("Erro ao fazer login: " + error.message);
  }
}

// 🔹 Função de Cadastro
async function cadastrarUsuario(
  nome,
  telefone,
  email,
  senha,
  instrumentos,
  ministro
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      senha
    );
    const userId = userCredential.user.uid;

    // Salvar informações no Firestore
    await setDoc(doc(db, "usuarios", userId), {
      nome,
      telefone,
      email,
      instrumentos,
      ministro,
      role: "usuario",
    });

    alert("Cadastro realizado com sucesso!");
    window.location.href = "index.html"; // Redireciona para login
  } catch (error) {
    alert("Erro ao cadastrar: " + error.message);
  }
}

// 🔹 Função para listar usuários (para o admin)
async function listarUsuarios() {
  try {
    const usuariosRef = collection(db, "usuarios");
    const snapshot = await getDocs(usuariosRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return [];
  }
}

// 🔹 Função para redefinir senha de um usuário
async function redefinirSenhaAdmin(userId, novaSenha) {
  try {
    const userRef = doc(db, "usuarios", userId);
    await updateDoc(userRef, { senhaTemporaria: novaSenha }); // O usuário deverá redefinir no login

    alert("Senha redefinida com sucesso!");
  } catch (error) {
    alert("Erro ao redefinir senha: " + error.message);
  }
}

// 🔹 Função para logout

function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert("Erro ao sair: " + error.message);
    });
}

// Exporta as funções para serem usadas em outros arquivos
export { login, cadastrarUsuario, listarUsuarios, redefinirSenhaAdmin, logout };

window.login = login;
window.cadastrarUsuario = cadastrarUsuario;
window.listarUsuarios = listarUsuarios;
window.redefinirSenhaAdmin = redefinirSenhaAdmin;
window.logout = logout;
