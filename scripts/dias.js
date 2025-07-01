// dias.js atualizado com modal funcional, atualização visual e recarregamento automático
// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração da aplicação Firebase
import { firebaseConfig } from "./firebase-config.js";
import { obterDiasDefinidosPeloAdmin } from "./database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Objeto que armazenará dados do usuário atualmente logado
let usuarioAtual = {};

/**
 * Cria dinamicamente o modal para seleção de instrumentos.
 * O modal será inserido no <body> com id "modalInstrumento".
 */
function criarModalInstrumento() {
  const modal = document.createElement("div");
  modal.id = "modalInstrumento";
  modal.className = "modal-overlay"; // Classe para estilização de overlay
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Escolha o instrumento</h3>
      <div id="opcoesInstrumentos" class="instrumentos-lista"></div>
      <div class="modal-buttons bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded items-center gap-2 cursor-pointer">
        <button id="cancelarInstrumento">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Botão de cancelar fecha o modal
  document
    .getElementById("cancelarInstrumento")
    .addEventListener("click", fecharModal);
}

/**
 * Abre o modal de seleção de instrumento, listando todos os instrumentos possíveis.
 * Também colore os botões de acordo com o que já foi marcado pelo usuário naquele dia e descrição.
 *
 * @param {Array<string>} instrumentos - Lista de instrumentos disponíveis para o usuário.
 * @param {string} data - Data do evento ("YYYY-MM-DD").
 * @param {string} descricao - Descrição do evento (por exemplo, "Culto da Manhã").
 */
async function abrirModal(instrumentos, data, descricao) {
  const container = document.getElementById("listaInstrumentosModal");
  container.innerHTML = ""; // Limpa antes de inserir botões

  // Busca documentos da coleção "escalas" para verificar quais instrumentos já foram marcados
  const escalaRef = doc(db, "escalas", usuarioAtual.uid);
  const snap = await getDoc(escalaRef);

  let instrumentosMarcados = [];
  if (snap.exists()) {
    const dias = snap.data().diasSelecionados || [];
    // Filtra apenas os dias que coincidem com a data e descrição atuais
    instrumentosMarcados = dias
      .filter((d) => d.data === data && d.descricao === descricao)
      .map((d) => d.instrumento.toLowerCase());
  }

  // Para cada instrumento, cria um botão estilizado
  instrumentos.forEach((inst) => {
    const isMarcado = instrumentosMarcados.includes(inst.toLowerCase());

    const btn = document.createElement("button");
    btn.textContent = inst;
    btn.className = `
      ${isMarcado ? "bg-green-600" : "bg-blue-600"} 
      text-white hover:opacity-90 px-4 py-2 rounded transition
    `;
    // Ao clicar, chama a função de verificação de conflito
    btn.onclick = () => verificarConflito(data, descricao, inst);
    container.appendChild(btn);
  });

  // Exibe o modal (remove "hidden" e adiciona "flex")
  const modal = document.getElementById("instrumentoModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * Fecha o modal de seleção de instrumento,
 * removendo as classes "flex" e adicionando "hidden" para escondê-lo.
 */
function fecharModal() {
  const modal = document.getElementById("instrumentoModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * Exibe um toast de notificação no centro da tela, com ícone e animação.
 *
 * @param {string} mensagem - Texto a ser exibido no toast.
 * @param {string} tipo - Tipo de toast: "success", "error" ou "info". Define cor e ícone.
 */
function exibirToast(mensagem, tipo = "error") {
  // Definição dos caminhos SVG para cada tipo de ícone
  const icones = {
    success: "M5 13l4 4L19 7", // ícone de check
    error: "M6 18L18 6M6 6l12 12", // ícone de X
    info: "M13 16h-1v-4h-1m1-4h.01", // ícone de info
  };

  // Definição das classes de cor para cada tipo
  const cores = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  // Cria o contêiner do toast
  const toast = document.createElement("div");
  toast.className = `
    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
    px-6 py-4 rounded-lg shadow-lg text-white z-[9999] flex items-center space-x-3 text-sm 
    ${cores[tipo] || cores.info} animate-fade
  `;

  // Insere o SVG do ícone e a mensagem
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
        icones[tipo] || icones.info
      }" />
    </svg>
    <span>${mensagem}</span>
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Verifica se já existe conflito de instrumento marcado para a mesma data e descrição.
 * Se houver conflito, exibe toast informando quem marcou. Caso contrário, aplica regras de marcação (ministro/comum),
 * salva a escolha e recarrega a página para atualizar visual.
 *
 * @param {string} data - Data do evento.
 * @param {string} descricao - Descrição do evento.
 * @param {string} instrumentoSelecionado - Instrumento que o usuário está tentando marcar.
 */
async function verificarConflito(data, descricao, instrumentoSelecionado) {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  let conflito = null;
  let instrumentosDoUsuario = [];

  snapshot.forEach((doc) => {
    const dados = doc.data();

    // 🔍 Verifica se o instrumento já foi marcado por outra pessoa
    if (
      dados.diasSelecionados?.some(
        (d) =>
          d.data === data &&
          d.instrumento === instrumentoSelecionado &&
          d.descricao === descricao
      )
    ) {
      if (dados.uid !== usuarioAtual.uid) {
        conflito = dados.nome;
      }
    }

    // 🔍 Coleta os instrumentos que o usuário já marcou nesta data+descrição
    if (dados.uid === usuarioAtual.uid) {
      dados.diasSelecionados?.forEach((d) => {
        if (d.data === data && d.descricao === descricao) {
          instrumentosDoUsuario.push(d.instrumento);
        }
      });
    }
  });

  if (conflito) {
    exibirToast(`Instrumento já marcado por ${conflito}`);
    return;
  }

  // 🧠 Regras de limite
  const isMinistro = usuarioAtual.instrumentos?.includes("Ministro");

  if (!isMinistro && instrumentosDoUsuario.length >= 1) {
    exibirToast("Você só pode marcar um instrumento por culto.");
    return;
  }

  if (isMinistro) {
    if (instrumentosDoUsuario.length >= 2) {
      exibirToast("Ministro só pode marcar 2 instrumentos por culto.");
      return;
    }

    // Se já marcou um que não é ministro, o próximo tem que ser ministro
    if (
      instrumentosDoUsuario.length === 1 &&
      instrumentosDoUsuario[0] !== "Ministro" &&
      instrumentoSelecionado !== "Ministro"
    ) {
      exibirToast("Ministro deve marcar 'Ministro' + 1 instrumento.");
      return;
    }

    // Se já marcou 'Ministro', o segundo não pode ser outro 'Ministro'
    if (
      instrumentosDoUsuario.length === 1 &&
      instrumentosDoUsuario[0] === "Ministro" &&
      instrumentoSelecionado === "Ministro"
    ) {
      exibirToast("Você já marcou 'Ministro'. Escolha outro instrumento.");
      return;
    }
  }

  // ✅ Se passou, salva
  await salvarEscolha(data, descricao, instrumentoSelecionado);
  exibirToast("Obrigado pelo seu Servir !", "#27ae60");
  fecharModal();

  setTimeout(() => {
    location.reload();
  }, 2000);
}

/**
 * Salva a escolha de instrumento do usuário no Firestore.
 * Atualiza ou cria o documento em "escalas" com uid do usuário.
 *
 * @param {string} data - Data do evento no formato "YYYY-MM-DD".
 * @param {string} descricao - Descrição do evento.
 * @param {string} instrumento - Instrumento que o usuário escolheu.
 */
async function salvarEscolha(data, descricao, instrumento) {
  const { uid, nome, equipe, ministro } = usuarioAtual;
  // Valida se o usuário continua autenticado
  if (!auth.currentUser || uid !== auth.currentUser.uid) {
    console.error("Tentativa de gravar com UID inválido.");
    exibirToast("Erro de autenticação ao salvar.", "error");
    return;
  }

  const ref = doc(db, "escalas", uid);
  const snapshot = await getDoc(ref);
  const diasSelecionados = snapshot.exists()
    ? snapshot.data().diasSelecionados || []
    : [];
  // Converte data para string ISO (caso não seja string)
  const dataISO =
    typeof data === "string"
      ? data
      : new Date(data).toISOString().split("T")[0];
  diasSelecionados.push({ data: dataISO, descricao, instrumento });

  // Grava/atualiza documento
  await setDoc(ref, {
    uid,
    nome,
    equipe,
    instrumento,
    ministro,
    diasSelecionados,
  });
}

/**
 * Função principal executada quando o DOM é carregado.
 * Cria o modal, monitora o estado de autenticação e popula a lista de dias.
 */
document.addEventListener("DOMContentLoaded", () => {
  criarModalInstrumento();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Se não autenticado, redireciona para login
      window.location.href = "index.html";
      return;
    }

    // Busca dados do usuário no Firestore
    const userSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (!userSnap.exists()) return;

    const dados = userSnap.data();
    usuarioAtual = {
      uid: user.uid,
      nome: dados.nome || user.email,
      instrumentos: dados.instrumentos || [], // lista de instrumentos permitidos
      equipe: dados.equipe || "Não informado",
      ministro: dados.ministro || false, // flag se é ministro principal
    };

    // Verifica quais dias o usuário já marcou
    const escalaRef = doc(db, "escalas", user.uid);
    const escalaSnap = await getDoc(escalaRef);
    const diasMarcados = new Set();
    if (escalaSnap.exists()) {
      const dias = escalaSnap.data().diasSelecionados || [];
      dias.forEach((d) => diasMarcados.add(`${d.data}|${d.descricao}`));
    }

    // Obtém a lista de dias definidos pelo admin e eventos extras
    const diasPadrao = await obterDiasDefinidosPeloAdmin();
    const extrasSnap = await getDocs(collection(db, "eventosExtras"));
    const eventosExtras = extrasSnap.docs.map((doc) => ({
      ...doc.data(),
      extra: true,
    }));
    const dias = [...diasPadrao, ...eventosExtras];
    // Ordena pela data crescente
    dias.sort((a, b) => a.data.localeCompare(b.data));

    const diasContainer = document.getElementById("dias-container");
    diasContainer.innerHTML =
      dias.length === 0 ? "<p>Nenhum dia definido pelo administrador.</p>" : "";

    // Para cada dia, cria um wrapper que contém input[type=checkbox] (oculto) e label clicável
    dias.forEach((dia, index) => {
      const chave = `${dia.data}|${dia.descricao || dia.nome || "Evento"}`;
      const jaMarcado = diasMarcados.has(chave);
      const descricaoTexto = dia.descricao || dia.nome || "Evento";
      const dataFormatada = dia.data.split("-").reverse().join("/");

      // Div que atua como "checkbox customizado"
      const wrapper = document.createElement("div");
      wrapper.className = `checkbox-dia${jaMarcado ? " marcado" : ""}`;

      // Input checkbox oculto
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `dia-${index}`;
      input.name = "dias[]";
      input.value = dia.data;
      input.style.display = "none"; // esconde o input original

      // Label clicável que ocupa toda a área do quadrado
      const label = document.createElement("label");
      label.setAttribute("for", `dia-${index}`);
      label.innerHTML = `
        <strong>${descricaoTexto} (${dataFormatada})</strong>
        ${dia.extra ? '<span style="color:green;"> (Extra)</span>' : ""}
      `;
      // Ao clicar no label, abre o modal de instrumentos
      label.addEventListener("click", (e) => {
        e.preventDefault();
        abrirModal(usuarioAtual.instrumentos, dia.data, descricaoTexto);
      });

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      diasContainer.appendChild(wrapper);
    });
  });
});

/**
 * Adiciona estilos CSS dinamicamente para:
 * - Tornar cada `.checkbox-dia` um bloco clicável.
 * - Definir as cores de hover e estado marcado.
 * - Estilizar overlay e conteúdo do modal.
 * - Estilizar botões de instrumento dentro do modal.
 */
const estilo = document.createElement("style");
estilo.textContent = `
  .checkbox-dia {
    display: block;
    background-color: #f0f9ff;
    border: 2px solid #38bdf8;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  .checkbox-dia:hover {
    background-color: #e0f2fe;
    border-color: #0ea5e9;
    transform: scale(1.02);
  }
  .checkbox-dia.marcado {
    background-color: #22c55e;
    color: white;
    border-color: #16a34a;
  }
  .modal-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    text-align: center;
  }
  .instrumentos-lista {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin: 1rem 0;
  }
  .btn-instrumento {
    background-color: #0ea5e9;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-instrumento:hover {
    background-color: #0284c7;
  }
`;
document.head.appendChild(estilo);
