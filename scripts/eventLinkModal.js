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
import { configurarPlayerYT } from "./inatividade.js";

async function carregarLinksSalvos(eventoId, listaContainer, canEdit) {
  //console.log("Passando pelo CarregarLinksSalvos", carregarLinksSalvos);
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
      //console.log("Passando pelo links.forEach", links.forEach); // console
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
        // console.log("Elemento foi criado?", a); // Ponto importante
      };

      li.appendChild(a);

      if (canEdit) {
        const divBotoes = document.createElement("div");
        divBotoes.className = "flex gap-1";

        const btnEditar = document.createElement("button");
        btnEditar.innerHTML = "✏️";
        btnEditar.className = "text-gray-600 hover:text-blue-800 p-1 rounded";
        btnEditar.onclick = () => {
          abrirModalNomeMusica(
            async (resultado) => {
              if (!resultado) return; // <- Isso evita o erro

              const { titulo, link } = resultado;

              // Agora pode usar com segurança
              links[index].titulo = titulo;
              links[index].url = link;
              await setLinksEventosDocument(eventoId, { links });
              carregarLinksSalvos(eventoId, listaContainer, canEdit);
            },
            links[index].titulo,
            links[index].url
          );
        };

        const btnRemover = document.createElement("button");
        btnRemover.innerHTML = "❌";
        btnRemover.className = "text-red-600 hover:text-red-800 p-1 rounded";
        btnRemover.onclick = async () => {
          await removerLink(eventoId, index);
          carregarLinksSalvos(eventoId, listaContainer, canEdit);
          console.log("excluir M", btnRemover); //log de excusão de música
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
  //console.log("Função adicionarLink", adicionarLink); // console funcional
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
  console.log("Abertura do modalLinks", data, descricao); //Log funcional
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
      console.log("form.onsubmit", form.onsubmit);
      e.preventDefault();
      const url = document.getElementById("novoLink").value.trim();
      if (!url) return;

      abrirModalNomeMusica(
        async ({ titulo, link }) => {
          if (!titulo || !link) return;

          await adicionarLink(eventoId, { url: link, titulo });
          document.getElementById("novoLink").value = "";
          carregarLinksSalvos(eventoId, lista, canEdit);
          console.log("abrirModalNomeMusica", titulo, link); // Chegou no nome da musica
        },
        "",
        url
      ); // já preenche o link que o usuário colou
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
//script para modal de links musicas
const btnEscolherMusica = document.getElementById("btnEscolherMusica");
const modalEscolherMusica = document.getElementById("modalEscolherMusica");
const galeriaMusicas = document.getElementById("galeriaMusicas");
const btnFecharEscolhaMusica = document.getElementById(
  "btnFecharEscolhaMusica"
);

btnEscolherMusica.addEventListener("click", async () => {
  console.log("➡️ Botão 'Escolher Música' clicado."); // passou aqui

  //Ajustar Galeria de música depois
  galeriaMusicas.innerHTML =
    "<p class='text-center text-gray-500'>Carregando...</p>";
  modalEscolherMusica.style.display = "flex";

  try {
    const querySnapshot = await getDocs(collection(db, "linksMusicas"));
    galeriaMusicas.innerHTML = "";

    if (querySnapshot.empty) {
      galeriaMusicas.innerHTML =
        "<p class='text-center text-red-500'>Nenhuma música encontrada.</p>";
      console.warn("⚠️ Nenhuma música encontrada na coleção linksMusicas.");
      return;
    }

    querySnapshot.forEach((doc) => {
      const musica = doc.data();
      console.log("🎵 Música carregada:", musica);

      const item = document.createElement("div");
      item.className =
        "p-3 border rounded cursor-pointer hover:bg-gray-100 transition";

      item.innerHTML = `
        <p class="font-semibold">${musica.titulo || "Sem título"}</p>
        <p class="text-xs text-gray-500">${musica.embed || "❌ Sem embed"}</p>
      `;

      item.addEventListener("click", async () => {
        console.log("✅ Música selecionada:", musica);

        const data = document.getElementById("dataModalLinks").value;
        const descricao = document.getElementById("descricaoModalLinks").value;
        const eventoId = `${data}_${descricao}`;

        if (!musica.embed) {
          alert("Essa música não possui link embed válido.");
          console.error("❌ Música sem embed:", musica);
          return;
        }

        try {
          // salva no evento (para aparecer na lista depois)
          await adicionarLink(eventoId, {
            url: musica.embed,
            titulo: musica.titulo || "Sem título",
          });
          console.log("💾 Link salvo no evento:", eventoId);

          const lista = document.getElementById("listaLinks");
          const { isAdmin, isMinistro } = getUserPermissions();
          const canEdit = isAdmin || isMinistro;
          carregarLinksSalvos(eventoId, lista, canEdit);

          modalEscolherMusica.style.display = "none";

          // 🚀 abre o player direto
          abrirModalPlayer(musica.embed);
          console.log("▶️ Player aberto com:", musica.embed);
        } catch (err) {
          console.error("❌ Erro ao salvar link no evento:", err);
        }
      });

      galeriaMusicas.appendChild(item);
    });
  } catch (err) {
    console.error("❌ Erro ao buscar músicas:", err);
    galeriaMusicas.innerHTML =
      "<p class='text-center text-red-500'>Erro ao carregar músicas.</p>";
  }
});

btnFecharEscolhaMusica.addEventListener("click", () => {
  modalEscolherMusica.style.display = "none";
});

//Variáveis para o filtro
let listaMusicas = []; // guarda as músicas da galeria

btnEscolherMusica.addEventListener("click", async () => {
  galeriaMusicas.innerHTML =
    "<p class='text-center text-gray-500'>Carregando...</p>";
  modalEscolherMusica.style.display = "flex";

  const querySnapshot = await getDocs(collection(db, "linksMusicas"));
  galeriaMusicas.innerHTML = "";

  listaMusicas = []; // limpa antes de carregar de novo

  querySnapshot.forEach((doc) => {
    const musica = doc.data();
    listaMusicas.push(musica); // guarda em array
  });

  renderizarMusicas(listaMusicas);
});

// Função para renderizar
function renderizarMusicas(musicas) {
  galeriaMusicas.innerHTML = "";

  musicas.forEach((musica) => {
    const item = document.createElement("div");
    item.className = "p-3 border rounded cursor-pointer hover:bg-gray-100";

    item.innerHTML = `
      <p class="font-semibold">${musica.titulo || "Sem título"}</p>
      <p class="text-xs text-gray-500">${musica.embed}</p>
    `;

    item.addEventListener("click", async () => {
      const data = document.getElementById("dataModalLinks").value;
      const descricao = document.getElementById("descricaoModalLinks").value;
      const eventoId = `${data}_${descricao}`;

      if (!musica.embed) {
        alert("Essa música não possui link embed válido.");
        return;
      }

      await adicionarLink(eventoId, {
        url: musica.embed,
        titulo: musica.titulo || "Sem título",
      });

      const lista = document.getElementById("listaLinks");
      const { isAdmin, isMinistro } = getUserPermissions();
      const canEdit = isAdmin || isMinistro;
      carregarLinksSalvos(eventoId, lista, canEdit);

      modalEscolherMusica.style.display = "none";

      abrirModalPlayer(musica.embed);
    });

    galeriaMusicas.appendChild(item);
  });
}

//Filtro próprio
const inputFiltro = document.getElementById("filtroMusica");

if (inputFiltro) {
  inputFiltro.addEventListener("input", () => {
    const termo = inputFiltro.value.trim().toLowerCase();

    const filtradas = listaMusicas.filter((musica) =>
      musica.titulo.toLowerCase().includes(termo)
    );

    renderizarMusicas(filtradas);
  });
}

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

  console.log("Modal do Iframe", input);
  return "";
}

//Ajuste final
function abrirModalPlayer(link) {
  let embed = "";

  // Se já vier no formato embed (galeria)
  if (link.includes("/embed/")) {
    embed = link;
    console.log("🎵 Link já é EMBED:", embed);
  } else {
    // Se for URL comum (manual), converte
    embed = extrairSrcIframe(link);
    console.log("🎵 Link convertido de URL para EMBED:", embed);
  }

  if (!embed) {
    console.error("❌ Link inválido para abrir no player:", link);
    return;
  }

  const modal = document.getElementById("modalPlayerMusica");
  const container = document.getElementById("playerMusicaEmbed");

  container.innerHTML = `
    <iframe class="w-full h-full rounded" src="${embed}" frameborder="0"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  console.log("✅ Modal de player aberto com:", embed);
}
function fecharModalPlayer() {
  console.log("Fechar o player que está aberto", fecharModalPlayer);
  const modal = document.getElementById("modalPlayerMusica");
  const container = document.getElementById("playerMusicaEmbed");

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  container.innerHTML = ""; // limpa o player
}
document.addEventListener("DOMContentLoaded", () => {
  const btnFecharPlayer = document.getElementById("btnFecharPlayer");
  if (btnFecharPlayer) {
    btnFecharPlayer.addEventListener("click", () => {
      console.log("Clicou no botão fechar!");
      fecharModalPlayer();
    });
  } else {
    console.log("Botão fechar não encontrado no DOM!");
  }
});

export { fecharModalPlayer };
window.configurarPlayerYT = configurarPlayerYT;
