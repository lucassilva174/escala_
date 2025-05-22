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

// Cria o HTML do cabeçalho
async function criarHeader(nome, fotoURL, isAdmin = false) {
  const header = document.createElement("header");
  header.classList.add("header-global");
  header.innerHTML = `
    <div class="perfil-topo">
      <div class="dropdown-avatar">
        <img src="${
          fotoURL || "images/default.jpg"
        }" class="avatar" id="avatarMenu" alt="avatar" />
        <span id="userName">${nome}</span>
        <ul class="menu-avatar" id="menuAvatar">
          <li><a href="perfil.html">Perfil</a></li>
          <li><a href="dias.html">Escala</a></li>
          <li><label for="fotoInput">Adicionar Imagem</label></li>
          <li><a href="consulta.html">Consulta</a></li>
          <li><a href="usuarios.html">Usuários</a></li>
          <li id="adminLink">
            <a href="#" ${
              isAdmin
                ? "onclick=\"window.location.href='admin.html'\""
                : "onclick=\"exibirToast('Você não tem permissão para acessar o painel do administrador.')\""
            }>
               ADM
            </a>
          </li>

          <li><button id="logoutBtn" class="logout-link">Sair</button></li>
        </ul>
        <input type="file" id="fotoInput" style="display: none" />
      </div>
    </div>
  `;
  document.body.prepend(header);

  // Toggle do menu
  document.getElementById("avatarMenu").addEventListener("click", () => {
    document.getElementById("menuAvatar").classList.toggle("show");
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });

  // Proteção para link ADM
  const adminLink = document.getElementById("adminLink");
  if (adminLink) {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const isAdmin = userDoc.exists() && userDoc.data().admin === true;

      if (isAdmin) {
        adminLink.innerHTML = `<a href="admin.html">ADM</a>`;
      } else {
        adminLink.addEventListener("click", (e) => {
          e.preventDefault();
          exibirToast(
            "Você não tem permissão para acessar o painel do administrador."
          );
        });
      }
    }
  }

  // Upload nova imagem com compressão base64
  const fileInput = document.getElementById("fotoInput");
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = async function () {
        const canvas = document.createElement("canvas");
        const size = 200; // tamanho da imagem final
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7); // compressão

        document.getElementById("avatarMenu").src = compressedBase64;

        const user = auth.currentUser;
        if (user) {
          try {
            await updateDoc(doc(db, "usuarios", user.uid), {
              fotoURL: compressedBase64,
            });
            exibirToast("Imagem de perfil atualizada!");
          } catch (error) {
            console.error("Erro ao atualizar imagem:", error);
            exibirToast("Erro ao salvar imagem.");
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Inicia o header com dados do usuário
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(docRef);

    const nome = snap.exists() ? snap.data().nome || user.email : user.email;
    const fotoURL = snap.exists() ? snap.data().fotoURL : null;
    const isAdmin = snap.exists() && snap.data().admin === true;

    criarHeader(nome, fotoURL, isAdmin); // passa isAdmin
  }
});

//Função para reconhecer o ADM na lista
function exibirToast(mensagem) {
  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.textContent = mensagem;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    toast.remove();
  }, 3000);
}
