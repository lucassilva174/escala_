// scripts/musicas.js
import { db, auth } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { exibirToast, showConfirmationModal } from "./utils.js";

const galeria = document.getElementById("galeria");
const modalCadastro = document.getElementById("modalCadastro");
const form = document.getElementById("formMusica");
const inputTitulo = document.getElementById("tituloMusica");
const inputIframe = document.getElementById("codigoIframe");

let musicas = [];
let editarId = null;
let isAdminOuMinistro = false;

// Verifica se usuário é admin ou ministro
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  if (!snap.exists()) return;
  const usuario = snap.data();
  isAdminOuMinistro =
    usuario.admin || usuario.instrumentos?.includes("Ministro");
  carregarMusicas();
});

window.abrirModalCadastro = () => {
  editarId = null;
  form.reset();
  modalCadastro.style.display = "flex";
};

window.fecharModalCadastro = () => {
  modalCadastro.style.display = "none";
};

function extrairSrcIframe(input) {
  if (!input || typeof input !== "string") return "";

  // 1. Se for código iframe do YouTube
  const iframeMatch = input.match(/src=["']([^"']+)["']/);
  if (iframeMatch) return iframeMatch[1];

  // 2. Se for link do YouTube normal
  const youtubeRegex =
    /(?:https?:\/\/(?:www\.|m\.)?)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const ytMatch = input.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  return "";
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const titulo = inputTitulo.value.trim();
  const embedRaw = inputIframe.value.trim();
  const embed = extrairSrcIframe(embedRaw);

  if (!titulo || !embed) {
    exibirToast(
      "Preencha corretamente o título e o link/código do YouTube.",
      "error"
    );
    return;
  }

  try {
    if (editarId) {
      await updateDoc(doc(db, "linksMusicas", editarId), {
        titulo,
        embed,
        atualizadoEm: serverTimestamp(),
      });
      exibirToast("Música atualizada com sucesso!", "success");
    } else {
      await addDoc(collection(db, "linksMusicas"), {
        titulo,
        embed,
        criadoEm: serverTimestamp(),
      });
      exibirToast("Música adicionada com sucesso!", "success");
    }

    editarId = null;
    fecharModalCadastro();
    carregarMusicas();
  } catch (error) {
    console.error("Erro ao salvar música:", error);
    exibirToast("Erro ao salvar música.", "error");
  }
};

async function carregarMusicas() {
  galeria.innerHTML = "";
  const snap = await getDocs(collection(db, "linksMusicas"));
  musicas = [];

  snap.forEach((docSnap) => {
    musicas.push({ id: docSnap.id, ...docSnap.data() });
  });

  musicas.forEach((musica) => {
    const container = document.createElement("div");
    container.className =
      "bg-cyan-900 text-white rounded-xl overflow-hidden mb-4 shadow transition-all duration-300";

    const header = document.createElement("div");
    header.className =
      "p-4 font-bold cursor-pointer flex justify-between items-center";
    header.textContent = musica.titulo;

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo hidden bg-white p-2";

    const iframe = document.createElement("iframe");
    iframe.className = "w-full aspect-video rounded";
    iframe.src = musica.embed;
    iframe.frameBorder = "0";
    iframe.allow =
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;

    conteudo.appendChild(iframe);

    if (isAdminOuMinistro) {
      const botoes = document.createElement("div");
      botoes.className = "flex justify-end gap-2 mt-2";

      const editarBtn = document.createElement("button");
      editarBtn.textContent = "✏️ Editar";
      editarBtn.className =
        "bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600";
      editarBtn.onclick = (e) => {
        e.stopPropagation();
        editarId = musica.id;
        inputTitulo.value = musica.titulo;
        inputIframe.value = `https://www.youtube.com/watch?v=${musica.embed
          .split("/")
          .pop()}`;
        modalCadastro.style.display = "flex";
      };

      const excluirBtn = document.createElement("button");
      excluirBtn.textContent = "🗑️ Excluir";
      excluirBtn.className =
        "bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700";
      excluirBtn.onclick = async (e) => {
        e.stopPropagation();
        const confirmado = await showConfirmationModal(
          "Deseja excluir esta música?"
        );
        if (!confirmado) return;

        try {
          await deleteDoc(doc(db, "linksMusicas", musica.id));
          exibirToast("Música excluída!", "success");
          carregarMusicas();
        } catch (err) {
          console.error("Erro ao excluir:", err);
          exibirToast("Erro ao excluir música.", "error");
        }
      };

      botoes.appendChild(editarBtn);
      botoes.appendChild(excluirBtn);
      conteudo.appendChild(botoes);
    }

    container.appendChild(header);
    container.appendChild(conteudo);
    header.onclick = () => conteudo.classList.toggle("hidden");
    galeria.appendChild(container);
  });
}

// Exibir modal expandido (opcional - se desejar implementar)
window.fecharModalExpandido = () => {
  document.getElementById("modalExpandido").classList.add("hidden");
};
