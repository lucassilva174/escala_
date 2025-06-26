import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  addDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { exibirToast } from "./utils.js";

const auth = getAuth();
const lista = document.getElementById("paletasContainer");
const fileInput = document.getElementById("fileInput");
const btnAbrirModalLimpar = document.getElementById("limparGaleria");
const modalLimpar = document.getElementById("limparGaleriaModal");
const btnCancelarLimpar = document.getElementById("cancelarLimparGaleria");
const btnConfirmarLimpar = document.getElementById("confirmarLimparGaleria");

// Abrir o modal
btnAbrirModalLimpar.addEventListener("click", () => {
  modalLimpar.classList.remove("hidden");
});

// Cancelar
btnCancelarLimpar.addEventListener("click", () => {
  modalLimpar.classList.add("hidden");
});

// Confirmar e limpar
btnConfirmarLimpar.addEventListener("click", async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "paletasCores"));
    const deletions = [];

    querySnapshot.forEach((docSnap) => {
      deletions.push(deleteDoc(doc(db, "paletasCores", docSnap.id)));
    });

    await Promise.all(deletions);

    exibirToast("Galeria limpa com sucesso.", "success");
    modalLimpar.classList.add("hidden");
    carregarPaletas();
  } catch (err) {
    console.error("Erro ao limpar galeria:", err);
    exibirToast("Erro ao limpar galeria.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "index.html");

  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);
  const dados = userSnap.data();

  if (!dados?.admin && !dados?.instrumentos?.includes("Ministro")) {
    exibirToast("Acesso restrito.", "error");
    return (window.location.href = "perfil.html");
  }

  carregarPaletas();
});

// Upload múltiplo de imagem
fileInput.addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files.length) return;

  const snap = await getDocs(collection(db, "paletasCores"));
  let totalExistente = snap.size;

  const progressContainer = document.getElementById("uploadProgressContainer");
  progressContainer.innerHTML = "";

  for (const file of files) {
    const numero = ++totalExistente;

    // Cria o container da barra
    const wrapper = document.createElement("div");
    wrapper.className =
      "w-full bg-gray-200 rounded h-6 flex items-center overflow-hidden relative";

    const bar = document.createElement("div");
    bar.className =
      "bg-blue-500 h-full w-0 transition-all duration-300 ease-linear";
    wrapper.appendChild(bar);

    const label = document.createElement("span");
    label.className = "absolute right-2 text-sm text-white font-medium";
    label.textContent = "0%";
    wrapper.appendChild(label);

    progressContainer.appendChild(wrapper);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imagemBase64 = e.target.result;

      try {
        // Simulação de progresso
        let progress = 0;
        const interval = setInterval(() => {
          if (progress >= 100) {
            clearInterval(interval);
          } else {
            progress += 5;
            bar.style.width = `${progress}%`;
            label.textContent = `${progress}%`;
          }
        }, 40); // Aumenta rapidamente, simula envio

        await addDoc(collection(db, "paletasCores"), {
          imagemBase64,
          numero,
          dataCriacao: new Date(),
        });

        exibirToast(`Paleta nº ${numero} adicionada.`, "success");
        carregarPaletas();

        // Aguarda um pouco e remove visualmente
        setTimeout(() => {
          wrapper.classList.add(
            "opacity-0",
            "transition-opacity",
            "duration-500"
          );
          setTimeout(() => wrapper.remove(), 500);
        }, 1000);
      } catch (err) {
        console.error("Erro ao adicionar paleta:", err);
        exibirToast("Erro ao adicionar paleta.", "error");
      }
    };

    reader.readAsDataURL(file);
  }

  event.target.value = "";
});

// Carregar paletas
async function carregarPaletas() {
  lista.innerHTML = "<p>Carregando paletas...</p>";

  const snap = await getDocs(
    query(collection(db, "paletasCores"), orderBy("numero"))
  );
  lista.innerHTML = "";

  snap.forEach((docSnap) => {
    const { imagemBase64, numero } = docSnap.data();
    const div = document.createElement("div");

    div.className = "bg-white rounded shadow p-4";
    div.innerHTML = `
  <div class="flex flex-col items-center bg-white rounded shadow p-2 w-28 mx-auto relative">
    <img src="${imagemBase64}" alt="Paleta"
         class="rounded cursor-pointer w-24 h-24 object-cover border"
         onclick="abrirImagem('${imagemBase64}')" />
    <p class="text-center text-sm text-gray-600 mt-1">Paleta nº <span class="font-bold">${numero}</span></p>
    <button onclick="removerPaleta('${docSnap.id}')" title="Remover"
            class="absolute top-1 right-1 text-gray-500 hover:text-red-600">🗑️</button>
  </div>
`;

    lista.appendChild(div);
  });

  atualizarNumeracaoPaletas();
}

// Remover paleta
let paletaIdParaRemover = null;

window.removerPaleta = function (id) {
  paletaIdParaRemover = id;
  document.getElementById("confirmModal").classList.remove("hidden");
};

document.getElementById("cancelarRemocao").addEventListener("click", () => {
  paletaIdParaRemover = null;
  document.getElementById("confirmModal").classList.add("hidden");
});

document
  .getElementById("confirmarRemocao")
  .addEventListener("click", async () => {
    if (!paletaIdParaRemover) return;

    try {
      await deleteDoc(doc(db, "paletasCores", paletaIdParaRemover));
      exibirToast("Paleta removida.", "error");
      await carregarPaletas();
    } catch (error) {
      console.error("Erro ao remover paleta:", error);
      exibirToast("Erro ao remover paleta.", "error");
    } finally {
      document.getElementById("confirmModal").classList.add("hidden");
      paletaIdParaRemover = null;
    }
  });

// Atualiza numeração visual
function atualizarNumeracaoPaletas() {
  const legendas = document.querySelectorAll(".numero-paleta");
  legendas.forEach((legenda, index) => {
    legenda.innerHTML = `Paleta nº <span class="font-bold">${index + 1}</span>`;
  });
}

// Cria o modal de visualização da imagem em tamanho grande
const imageModal = document.createElement("div");
imageModal.id = "imageViewerModal";
imageModal.className =
  "fixed inset-0 bg-black bg-opacity-70 hidden flex items-center justify-center z-50";
imageModal.innerHTML = `
  <div id="imageViewerContent" class="relative max-w-full max-h-full">
    <img id="imageViewerImg" src="" class="max-w-[90vw] max-h-[90vh] rounded shadow-lg" />
  </div>
`;
document.body.appendChild(imageModal);

// Fecha ao clicar fora
imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    imageModal.classList.add("hidden");
    document.getElementById("imageViewerImg").src = "";
  }
});
window.abrirImagem = function (src) {
  const modal = document.getElementById("imageViewerModal");
  const img = document.getElementById("imageViewerImg");
  img.src = src;
  modal.classList.remove("hidden");
};
