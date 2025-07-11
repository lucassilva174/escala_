// header.js (versão com Tailwind aprimorada)
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function criarHeader(nome, fotoURL, isAdmin = false) {
  const header = document.createElement("header");
  header.className =
    "w-full px-6 py-4 flex justify-between items-center bg-white shadow-md z-50";

  header.innerHTML = `
    <span class="text-lg font-semibold">Olá, ${nome}</span>
    <div class="relative">
      <button id="avatarMenuBtn">
        <img
          src="${fotoURL || "images/default.jpg"}"
          alt="Avatar"
          class="w-20 h-20 rounded-full border-2 border-gray-300 object-cover"
        />
      </button>
      <ul
        id="menuAvatar"
        class="hidden absolute right-0 mt-2 bg-white shadow-lg rounded-lg w-48 text-sm py-2 z-50"
      >
        <li><a href="perfil.html" class="block px-4 py-2 hover:bg-gray-100">Perfil</a></li>
        <li><a href="dias.html" class="block px-4 py-2 hover:bg-gray-100">Escala</a></li>
        <li><label for="fotoInput" class="block px-4 py-2 cursor-pointer hover:bg-gray-100">Adicionar Imagem</label></li>
        <li><a href="musicas.html"class="block px-4 py-2 hover:bg-gray-100 cursor-pointer  text-blue-600">Músicas🎵 </a></li>
        <li><a id="paletaLink" class="block px-4 py-2 hover:bg-gray-100 cursor-pointer  text-blue-600">Paletas</a></li>
        <li><a id="consultaLink" class="block px-4 py-2 hover:bg-gray-100 cursor-pointer  text-blue-600">Consulta</a></li>
        <li><a id="usuariosLink" class="block px-4 py-2 hover:bg-gray-100 cursor-pointer  text-blue-600">Usuários</a></li>
        <li><a id="adminLink" class="block px-4 py-2 hover:bg-gray-100 cursor-pointer text-blue-600">ADM</a></li>
        <li><button id="logoutBtn" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Sair</button></li>
      </ul>
      <input type="file" id="fotoInput" class="hidden" />
    </div>
  `;

  document.body.prepend(header);

  // Mostra/esconde menu manualmente
  const menu = document.getElementById("menuAvatar");
  const toggleBtn = document.getElementById("avatarMenuBtn");
  toggleBtn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });

  // Proteção ADM
  const adminLink = document.getElementById("adminLink");
  const consultaLink = document.getElementById("consultaLink");
  const usuariosLink = document.getElementById("usuariosLink");
  const paletaLink = document.getElementById("paletaLink");

  // Função assíncrona para obter o status de admin e ministro do usuário
  async function getUserPermissions(user) {
    if (!user) {
      return { isAdmin: false, isMinistro: false };
    }
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const data = userDoc.data();
    return {
      isAdmin: userDoc.exists() && data.admin === true,
      isMinistro: userDoc.exists() && data.ministro === true,
    };
  }

  // Lógica para adminLink
  if (adminLink) {
    adminLink.onclick = async (e) => {
      // Tornar a função assíncrona
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const { isAdmin } = await getUserPermissions(user); // Obter permissões
        if (isAdmin) {
          window.location.href = "admin.html";
        } else {
          exibirToast(
            "Você não tem permissão para acessar o painel do administrador.",
            "error"
          );
        }
      } else {
        exibirToast(
          "Você precisa estar logado para acessar esta página.",
          "error"
        );
      }
    };
  }

  // Lógica para consultaLink (mantém a restrição para admin)
  if (consultaLink) {
    consultaLink.onclick = async (e) => {
      // Tornar a função assíncrona
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const { isAdmin } = await getUserPermissions(user); // Obter permissões
        if (isAdmin) {
          window.location.href = "consulta.html";
        } else {
          exibirToast(
            "Você não tem permissão para acessar a tela de consulta.",
            "error"
          );
        }
      } else {
        exibirToast(
          "Você precisa estar logado para acessar esta página.",
          "error"
        );
      }
    };
  }

  // Lógica para usuariosLink (mantém a restrição para admin)
  if (usuariosLink) {
    usuariosLink.onclick = async (e) => {
      // Tornar a função assíncrona
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const { isAdmin } = await getUserPermissions(user); // Obter permissões
        if (isAdmin) {
          window.location.href = "usuarios.html";
        } else {
          exibirToast(
            "Você não tem permissão para acessar a tela de usuários.",
            "error"
          );
        }
      } else {
        exibirToast(
          "Você precisa estar logado para acessar esta página.",
          "error"
        );
      }
    };
  }

  // Lógica para paletaLink (Permite acesso para admin OU ministro)
  if (paletaLink) {
    paletaLink.onclick = async (e) => {
      // Tornar a função assíncrona
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const { isAdmin, isMinistro } = await getUserPermissions(user); // Obter ambas as permissões

        // Permite acesso se for admin OU se tiver ministro: true
        if (isAdmin || isMinistro) {
          window.location.href = "paleta.html";
        } else {
          exibirToast(
            "Você não tem permissão para acessar a tela de Paletas.",
            "error"
          );
        }
      } else {
        exibirToast(
          "Você precisa estar logado para acessar esta página.",
          "error"
        );
      }
    };
  }

  // Upload de imagem
  document
    .getElementById("fotoInput")
    .addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = async function () {
          const canvas = document.createElement("canvas");
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          const base64 = canvas.toDataURL("image/jpeg", 0.7);

          document.querySelector("#avatarMenuBtn img").src = base64;

          const user = auth.currentUser;
          if (user) {
            try {
              await updateDoc(doc(db, "usuarios", user.uid), {
                fotoURL: base64,
              });
              exibirToast("Imagem de perfil atualizada!", "success");
            } catch (error) {
              exibirToast("Erro ao salvar imagem.", "error");
            }
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return;

    const dados = snap.data();

    if (dados.ativo === false) {
      exibirToast(
        "Seu acesso foi desativado. Fale com o administrador.",
        "error"
      );
      setTimeout(() => {
        auth.signOut();
        window.location.href = "index.html";
      }, 3000);
      return;
    }

    const nome = dados.nome || user.email;
    const fotoURL = dados.fotoURL || null;
    const isAdmin = dados.admin === true;

    criarHeader(nome, fotoURL, isAdmin);
  }
});

function exibirToast(mensagem, tipo = "info") {
  const toast = document.createElement("div");
  const icones = {
    success: "M5 13l4 4L19 7", // check
    error: "M6 18L18 6M6 6l12 12", // x
    info: "M13 16h-1v-4h-1m1-4h.01", // i
  };
  const cor = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  toast.innerHTML = `
    <div class="flex items-center space-x-3 text-white">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
          icones[tipo] || icones.info
        }" />
      </svg>
      <span>${mensagem}</span>
    </div>
  `;

  toast.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
    px-6 py-4 rounded-lg shadow-lg text-sm font-medium z-50
    ${cor[tipo] || cor.info} animate-fade
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
