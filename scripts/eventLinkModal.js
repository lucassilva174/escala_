// scripts/eventLinkModal.js
import {
  getLinksEventosDocument,
  setLinksEventosDocument,
} from "./firestoreService.js";
import { exibirToast } from "./utils.js";
import { abrirModalNomeMusica } from "./musicTitleModal.js";
import { getUserPermissions } from "./currentUser.js";
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function carregarLinksSalvos(eventoId, listaContainer, canEdit) {
  const snap = await getLinksEventosDocument(eventoId);
  listaContainer.innerHTML = "";

  if (snap.exists()) {
    const links = snap.data().links || [];
    if (links.length === 0) {
      listaContainer.innerHTML =
        "<li style='color:gray'>Nenhum link de música registrado.</li>";
      return;
    }

    links.forEach((item, index) => {
      const { url, titulo } =
        typeof item === "string"
          ? { url: item, titulo: `Música ${index + 1}` }
          : item;

      const li = document.createElement("li"); // <- CRIAR AQUI
      li.className = "flex items-center justify-between";

      const a = document.createElement("a"); // <- CRIAR AQUI
      a.href = "#";
      a.textContent = `🎵 ${titulo}`;
      a.className =
        "mr-2 text-blue-700 hover:underline flex-grow cursor-pointer";
      a.onclick = (e) => {
        e.preventDefault();
        abrirModalPlayer(url);
      };

      li.appendChild(a);

      if (canEdit) {
        const divBotoes = document.createElement("div");
        divBotoes.className = "flex gap-1";

        const btnEditar = document.createElement("button");
        btnEditar.innerHTML = "✏️";
        btnEditar.className = "text-gray-600 hover:text-blue-800 p-1 rounded";
        btnEditar.onclick = () => {
          abrirModalNomeMusica(async (novoTitulo) => {
            if (!novoTitulo) return;
            links[index].titulo = novoTitulo;
            await setLinksEventosDocument(eventoId, { links });
            carregarLinksSalvos(eventoId, listaContainer, canEdit);
          });
        };

        const btnRemover = document.createElement("button");
        btnRemover.innerHTML = "❌";
        btnRemover.className = "text-red-600 hover:text-red-800 p-1 rounded";
        btnRemover.onclick = async () => {
          await removerLink(eventoId, index);
          carregarLinksSalvos(eventoId, listaContainer, canEdit);
        };

        divBotoes.appendChild(btnEditar);
        divBotoes.appendChild(btnRemover);
        li.appendChild(divBotoes);
      }
      listaContainer.appendChild(li);
    });
  } else {
    listaContainer.innerHTML =
      "<li style='color:gray'>Nenhum link de música registrado.</li>";
  }
}

async function adicionarLink(eventoId, objLink) {
  const snap = await getLinksEventosDocument(eventoId);
  const links = snap.exists() ? snap.data().links || [] : [];
  links.push(objLink);
  await setLinksEventosDocument(eventoId, { links });
}

async function removerLink(eventoId, index) {
  const snap = await getLinksEventosDocument(eventoId);
  if (!snap.exists()) return;
  const links = snap.data().links || [];
  links.splice(index, 1);
  await setLinksEventosDocument(eventoId, { links });
}

async function carregarPaletaSalva(eventoId) {
  const snap = await getLinksEventosDocument(eventoId);
  const container = document.getElementById("previewPaleta");
  container.innerHTML = "";

  if (snap.exists() && snap.data().paletaBase64) {
    const wrapper = document.createElement("div");
    wrapper.className = "relative inline-block";

    const img = document.createElement("img");
    img.src = snap.data().paletaBase64;
    img.className = "max-w-xs mx-auto mt-2 rounded shadow";

    const btnRemove = document.createElement("button");
    btnRemove.innerHTML = "❌";
    btnRemove.title = "Remover paleta";
    btnRemove.className =
      "absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10";
    btnRemove.onclick = async () => {
      const links = snap.data().links || [];
      await setLinksEventosDocument(eventoId, {
        links,
        paletaBase64: null,
      });
      exibirToast("Paleta removida com sucesso!", "info");
      carregarPaletaSalva(eventoId);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btnRemove);
    container.appendChild(wrapper);
  }
}

async function carregarModalEscolhaPaletas(eventoId) {
  const modal = document.getElementById("modalEscolherPaleta");
  const galeria = document.getElementById("galeriaPaletas");
  galeria.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "paletasCores"));
  if (querySnapshot.empty) {
    galeria.innerHTML =
      "<p class='col-span-2 text-center text-gray-500'>Nenhuma paleta disponível.</p>";
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.imagemBase64) return;

    const img = document.createElement("img");
    img.src = data.imagemBase64;
    img.className = "cursor-pointer rounded shadow hover:opacity-80";
    img.onclick = async () => {
      const snap = await getLinksEventosDocument(eventoId);
      const links = snap.exists() ? snap.data().links || [] : [];
      await setLinksEventosDocument(eventoId, {
        links,
        paletaBase64: data.imagemBase64,
      });
      exibirToast("Paleta associada com sucesso!", "success");
      carregarPaletaSalva(eventoId);
      modal.style.display = "none";
    };
    galeria.appendChild(img);
  });
}

export function abrirModalLinks(data, descricao) {
  const modal = document.getElementById("modalLinks");
  const lista = document.getElementById("listaLinks");
  const eventoId = `${data}_${descricao}`;

  document.getElementById("dataModalLinks").value = data;
  document.getElementById("descricaoModalLinks").value = descricao;
  document.getElementById("novoLink").value = "";
  document.getElementById("previewPaleta").innerHTML = "";
  modal.style.display = "flex";

  const { isAdmin, isMinistro } = getUserPermissions();
  const canEdit = isAdmin || isMinistro;

  carregarLinksSalvos(eventoId, lista, canEdit);
  carregarPaletaSalva(eventoId);

  const form = document.getElementById("formLinks");
  const btnEscolherPaleta = document.getElementById("btnEscolherPaleta");

  form.style.display = canEdit ? "block" : "none";
  btnEscolherPaleta.style.display = canEdit ? "block" : "none";

  if (canEdit) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const url = document.getElementById("novoLink").value.trim();
      if (!url) return;

      abrirModalNomeMusica(async (titulo) => {
        if (!titulo) return;
        await adicionarLink(eventoId, { url, titulo });
        document.getElementById("novoLink").value = "";
        carregarLinksSalvos(eventoId, lista, canEdit);
      });
    };

    btnEscolherPaleta.onclick = () => {
      const modalEscolha = document.getElementById("modalEscolherPaleta");
      modalEscolha.style.display = "flex";
      carregarModalEscolhaPaletas(eventoId);
    };

    document.getElementById("btnFecharEscolhaPaleta").onclick = () => {
      document.getElementById("modalEscolherPaleta").style.display = "none";
    };
  }
}
document
  .getElementById("btnFecharPlayer")
  .addEventListener("click", fecharModalPlayer);
// modal do Iframe
function extrairSrcIframe(input) {
  if (!input || typeof input !== "string") return "";

  const iframeMatch = input.match(/src=["']([^"']+)["']/);
  if (iframeMatch) return iframeMatch[1];

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const ytMatch = input.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const spotifyRegex =
    /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([\w]+)/;
  const spMatch = input.match(spotifyRegex);
  if (spMatch && spMatch[1] && spMatch[2]) {
    return `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`;
  }

  return "";
}

function abrirModalPlayer(link) {
  const embed = extrairSrcIframe(link);
  if (!embed) return;

  const modal = document.getElementById("modalPlayerMusica");
  const container = document.getElementById("playerMusicaEmbed");

  container.innerHTML = `<iframe class="w-full h-full rounded" src="${embed}" frameborder="0"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    allowfullscreen></iframe>`;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function fecharModalPlayer() {
  const modal = document.getElementById("modalPlayerMusica");
  const container = document.getElementById("playerMusicaEmbed");

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  container.innerHTML = ""; // limpa o player
}
export { fecharModalPlayer };
