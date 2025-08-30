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
import { configurarPlayerYT } from "./inatividade.js";

window.onYouTubeIframeAPIReady = () => {
  const player = new YT.Player("youtubePlayer", {
    height: "360",
    width: "640",
    videoId: "",
    playerVars: { autoplay: 1 },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });

  window.player = player; // ← isso é crucial
  configurarPlayerYT(player);
};

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

  if (musicas.length === 0) {
    galeria.innerHTML =
      "<p class='text-gray-500'>Nenhuma música cadastrada.</p>";
    return;
  }

  const lista = document.createElement("ul");
  lista.className = "space-y-2 w-full";

  musicas.forEach((musica) => {
    const item = document.createElement("li");
    item.className =
      "bg-white px-4 py-2 rounded shadow hover:bg-gray-100 cursor-pointer flex justify-between items-center";

    const titulo = document.createElement("span");
    titulo.className = "text-blue-800 font-medium";
    titulo.textContent = musica.titulo;

    item.appendChild(titulo);

    /*item.onclick = () => {
      const iframeContainer = document.getElementById("iframeExpandido");
      iframeContainer.innerHTML = `
        <iframe class="w-full h-full rounded" src="${musica.embed}" frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen></iframe>`;
      document.getElementById("modalExpandido").classList.remove("hidden");
    };*/
    item.onclick = () => {
      const videoId = musica.embed.split("/").pop();
      console.log("Tentando carregar vídeo:", videoId);
      console.log("Player atual:", window.player);

      if (window.player && typeof window.player.loadVideoById === "function") {
        window.player.loadVideoById(videoId);
        document.getElementById("modalExpandido").classList.remove("hidden");
      } else {
        exibirToast("Player não disponível no momento.", "error");
      }
    };

    // Se for admin ou ministro, mostrar botões
    if (isAdminOuMinistro) {
      const botoes = document.createElement("div");
      botoes.className = "flex gap-2";

      const editarBtn = document.createElement("button");
      editarBtn.textContent = "✏️";
      editarBtn.title = "Editar";
      editarBtn.className =
        "bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600";
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
      excluirBtn.textContent = "🗑️";
      excluirBtn.title = "Excluir";
      excluirBtn.className =
        "bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700";
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
      item.appendChild(botoes);
    }

    lista.appendChild(item);
  });

  galeria.appendChild(lista);
}

// Exibir modal expandido (opcional - se desejar implementar)
window.fecharModalExpandido = () => {
  document.getElementById("modalExpandido").classList.add("hidden");
};
window.configurarPlayerYT = configurarPlayerYT;

// Filtro

const inputFiltro = document.getElementById("filtroMusica");

if (inputFiltro) {
  inputFiltro.addEventListener("input", () => {
    const termo = inputFiltro.value.trim().toLowerCase();

    // Filtrar músicas pelo título
    const filtradas = musicas.filter((musica) =>
      musica.titulo.toLowerCase().includes(termo)
    );

    renderizarMusicas(filtradas);
  });
}

function renderizarMusicas(listaMusicas) {
  galeria.innerHTML = "";

  if (listaMusicas.length === 0) {
    galeria.innerHTML =
      "<p class='text-gray-500'>Nenhuma música encontrada.</p>";
    return;
  }

  const lista = document.createElement("ul");
  lista.className = "space-y-2 w-full";

  listaMusicas.forEach((musica) => {
    const item = document.createElement("li");
    item.className =
      "bg-white px-4 py-2 rounded shadow hover:bg-gray-100 cursor-pointer flex justify-between items-center";

    const titulo = document.createElement("span");
    titulo.className = "text-blue-800 font-medium";
    titulo.textContent = musica.titulo;

    item.appendChild(titulo);

    item.onclick = () => {
      const videoId = musica.embed.split("/").pop();
      if (window.player && typeof window.player.loadVideoById === "function") {
        window.player.loadVideoById(videoId);
        document.getElementById("modalExpandido").classList.remove("hidden");
      } else {
        exibirToast("Player não disponível no momento.", "error");
      }
    };

    // Botões de edição e exclusão (se for admin)
    if (isAdminOuMinistro) {
      const botoes = document.createElement("div");
      botoes.className = "flex gap-2";

      const editarBtn = document.createElement("button");
      editarBtn.textContent = "✏️";
      editarBtn.title = "Editar";
      editarBtn.className =
        "bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600";
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
      excluirBtn.textContent = "🗑️";
      excluirBtn.title = "Excluir";
      excluirBtn.className =
        "bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700";
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
      item.appendChild(botoes);
    }

    lista.appendChild(item);
  });

  galeria.appendChild(lista);
}
