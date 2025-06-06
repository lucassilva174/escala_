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

function mostrarToast(mensagem, cor = "green") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.remove("hidden");
  toast.classList.remove("bg-green-600", "bg-red-600", "bg-blue-600");

  toast.classList.add(`bg-${cor}-600`);

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// 🔹 Função de Login com verificação de Admin
async function login(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const dados = userSnap.data();

      if (dados.ativo === false) {
        mostrarToast(
          "Seu acesso foi desativado. Fale com o administrador.",
          "red"
        );
        setTimeout(() => auth.signOut(), 3000);
        return; // ❗ Impede login e redirecionamento
      }

      if (dados.admin === true) {
        mostrarToast("Login de administrador realizado com sucesso!", "blue");
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 2000);
      } else {
        mostrarToast("Login realizado com sucesso!", "green");
        localStorage.setItem("loginSucesso", "true");
        setTimeout(() => {
          window.location.href = "perfil.html";
        }, 2000);
      }
    } else {
      mostrarToast("Usuário não encontrado no banco de dados.", "red");
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    mostrarToast("Erro ao fazer login: " + error.message, "red");
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

    await setDoc(doc(db, "usuarios", userId), {
      nome,
      telefone,
      email,
      instrumentos,
      ministro,
      role: "usuario",
    });

    mostrarToast("Cadastro realizado com sucesso!");
    window.location.href = "index.html";
  } catch (error) {
    mostrarToast("Erro ao cadastrar: " + error.message);
  }
}

// 🔹 Lista todos os usuários
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

// 🔹 Redefinir senha como admin
async function redefinirSenhaAdmin(userId, novaSenha) {
  try {
    const userRef = doc(db, "usuarios", userId);
    await updateDoc(userRef, { senhaTemporaria: novaSenha });

    mostrarToast("Senha redefinida com sucesso!");
  } catch (error) {
    mostrarToast("Erro ao redefinir senha: " + error.message);
  }
}

// 🔹 Logout
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      mostrarToast("Erro ao sair: " + error.message);
    });
}

// Exportações
export { login, cadastrarUsuario, listarUsuarios, redefinirSenhaAdmin, logout };

// Tornando disponíveis globalmente, se necessário
window.login = login;
window.cadastrarUsuario = cadastrarUsuario;
window.listarUsuarios = listarUsuarios;
window.redefinirSenhaAdmin = redefinirSenhaAdmin;
window.logout = logout;
