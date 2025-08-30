// scripts/consulta.js
import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  arrayUnion,
  query,
  where,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { exibirToast, showConfirmationModal } from "./utils.js";
// 🔒 Verifica se administrador
if (window.location.pathname.endsWith("consulta.html")) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const isAdmin = userDoc.exists() && userDoc.data().admin;

    if (!isAdmin) {
      exibirToast("Acesso restrito ao administrador.", "error");
      window.location.href = "perfil.html";
      return;
    }

    carregarEscalas();
  });
}

/**
 * Determina o período ('manha' ou 'noite') de uma descrição de evento.
 * Se a descrição não contiver 'noite' nem 'manhã', assume 'manha' como padrão.
 * @param {string} description A string de descrição do evento.
 * @returns {string} 'manha', 'noite', ou 'outro' (se você quiser uma categoria para eventos sem turno definido).
 */
function getPeriodoFromDescricao(description) {
  const lowerDesc = description?.toLowerCase() || "";
  if (lowerDesc.includes("noite")) {
    return "noite";
  }
  // Adicionado tratamento para "manhã" com e sem acento
  if (lowerDesc.includes("manhã") || lowerDesc.includes("manha")) {
    return "manha";
  }
  return "manha";
}

// 🔁 Controle do modal de edição
let uidAtual = "";
let indiceAtual = -1;

window.editarDia = async (uid, index) => {
  uidAtual = uid;
  indiceAtual = index;

  const nomeInput = document.getElementById("nomeEdicao");
  const instrumentoInput = document.getElementById("instrumentoEdicao");
  const descricaoInput = document.getElementById("descricaoEdicao");

  const escalaRef = doc(db, "escalas", uid);
  const docSnap = await getDoc(escalaRef);

  if (docSnap.exists()) {
    const dados = docSnap.data();
    const dia = dados.diasSelecionados?.[index];

    if (dia) {
      nomeInput.value = dados.nome || "";
      instrumentoInput.value = dia.instrumento || "";
      descricaoInput.value = dia.descricao || "";
      document.getElementById("modalEdicao").style.display = "flex";
    } else {
      exibirToast("Evento não encontrado.", "error");
    }
  } else {
    exibirToast("Usuário não encontrado.", "error");
  }
};

window.fecharModalEdicao = function () {
  document.getElementById("modalEdicao").style.display = "none";
};

async function carregarUsuariosParaSelecao() {
  const select = document.getElementById("usuarioExistente");
  select.innerHTML =
    '<option value="">— Digite ou selecione um usuário —</option>';

  const snap = await getDocs(collection(db, "usuarios"));
  snap.forEach((doc) => {
    const data = doc.data();
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = data.nome;
    option.dataset.instrumentos = (data.instrumentos || []).join(",");
    select.appendChild(option);
  });
}
carregarUsuariosParaSelecao();

// Quando selecionar alguém, preenche nome/instrumento
document.getElementById("usuarioExistente").addEventListener("change", (e) => {
  const option = e.target.selectedOptions[0];
  const nome = option.textContent;
  const instrumentos = option.dataset.instrumentos?.split(",") || [];

  if (nome) {
    document.getElementById("novoNome").value = nome;
    if (instrumentos.length === 1) {
      document.getElementById("novoInstrumento").value = instrumentos[0];
    }
  }
});

window.removerParticipante = async (type, id, index = -1) => {
  // 'type' pode ser 'escala' ou 'grupoExtra'
  const confirmacao = await showConfirmationModal(
    "Tem certeza que deseja remover este participante?"
  );
  if (!confirmacao) return;

  try {
    if (type === "escala") {
      // Lógica para remover de 'escalas'
      const escalaRef = doc(db, "escalas", id); // 'id' é o UID do usuário (documento da escala)
      const docSnap = await getDoc(escalaRef);

      if (docSnap.exists()) {
        const dados = docSnap.data();
        const novaLista = [...(dados.diasSelecionados || [])];

        if (index > -1 && index < novaLista.length) {
          novaLista.splice(index, 1); // Remove o dia específico pelo índice

          if (novaLista.length === 0) {
            // Se não houver mais dias selecionados, pode ser útil remover o documento inteiro da escala
            await deleteDoc(escalaRef);
            exibirToast(
              "Participante e todos os dias associados removidos com sucesso!"
            );
          } else {
            await updateDoc(escalaRef, { diasSelecionados: novaLista });
            exibirToast("Dia do participante removido com sucesso!");
          }
        } else {
          exibirToast("Dia do participante não encontrado.");
        }
      } else {
        exibirToast("Escala do participante não encontrada.");
      }
    } else if (type === "grupoExtra") {
      // Lógica para remover de 'grupoExtra'
      const grupoExtraRef = doc(db, "grupoExtra", id); // 'id' é o ID do documento do participante extra
      await deleteDoc(grupoExtraRef);
      exibirToast("Participante extra removido com sucesso!", "success");
    }

    location.reload(); // Recarrega a página para atualizar a tabela
  } catch (error) {
    console.error("Erro ao remover participante:", error);
    exibirToast("Erro ao remover participante. Veja o console.");
  }
};

document.getElementById("formEdicao").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nomeEdicao").value;
  const instrumento = document.getElementById("instrumentoEdicao").value;
  const descricao = document.getElementById("descricaoEdicao").value;

  try {
    const escalaRef = doc(db, "escalas", uidAtual);
    const docSnap = await getDoc(escalaRef);

    if (docSnap.exists()) {
      const dados = docSnap.data();
      const novaLista = [...(dados.diasSelecionados || [])];

      novaLista[indiceAtual] = {
        ...novaLista[indiceAtual],
        instrumento,
        descricao,
      };

      await updateDoc(escalaRef, { diasSelecionados: novaLista });

      exibirToast("Dia atualizado com sucesso!", "success");
      fecharModalEdicao();
      location.reload();
    }
  } catch (error) {
    console.error("Erro ao salvar edição:", error);
    exibirToast("Erro ao editar a escala.", "error");
  }
});
//formatar data
function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}
let todosRegistros = [];

async function carregarEscalas() {
  todosRegistros = []; // reset global

  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  const extrasRef = collection(db, "grupoExtra");
  const extrasSnap = await getDocs(extrasRef);

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const uid = docSnap.id;
    const nome = dados.nome || "Usuário";

    dados.diasSelecionados?.forEach((dia, index) => {
      todosRegistros.push({
        origem: "escalas",
        uid,
        index,
        nome,
        data: dia.data,
        descricao: dia.descricao || "-",
        instrumento: dia.instrumento,
      });
    });
  });

  extrasSnap.forEach((docSnap) => {
    const { data, descricao, nome, instrumento } = docSnap.data();
    todosRegistros.push({
      origem: "grupoExtra",
      idExtra: docSnap.id,
      nome: nome || "-",
      data,
      descricao: descricao || "-",
      instrumento: instrumento || "-",
    });
  });

  todosRegistros.sort((a, b) => new Date(a.data) - new Date(b.data));

  renderizarTabela(todosRegistros);
}

function renderizarTabela(registros) {
  const tabela = document.createElement("table");
  //tabela.classList.add("tabela-escala");
  tabela.classList.add(
    "min-w-full",
    "border",
    "divide-y",
    "divide-gray-200",
    "bg-white",
    "rounded"
  );

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Data</th>
      <th>Descrição</th>
      <th>Nome</th>
      <th>Instrumento</th>
      <th>Ações</th>
    </tr>`;
  tabela.appendChild(thead);

  const tbody = document.createElement("tbody");

  registros.forEach((item) => {
    const tr = document.createElement("tr");

    let acoes = "";
    if (item.origem === "escalas") {
      acoes = `
        <button title="Editar" onclick="editarDia('${item.uid}', ${item.index})" class="text-yellow-600 hover:text-yellow-800">✏️</button>
        <button title="Excluir" onclick="excluirDia('${item.uid}', ${item.index})" class="text-red-600 hover:text-red-800">❌</button>
      `;
    } else {
      acoes = `
        <button title="Excluir" onclick="removerParticipante('grupoExtra', '${item.idExtra}')" class="text-red-600 hover:text-red-800">❌</button>
      `;
    }

    tr.innerHTML = `
      <td>${formatarDataBR(item.data)}</td>
      <td>${item.descricao}</td>
      <td>${item.nome}</td>
      <td>${item.instrumento}</td>
      <td class="flex gap-2 justify-center">${acoes}</td>
    `;
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);

  const container = document.getElementById("tabelaEscala");
  container.innerHTML = "";
  container.appendChild(tabela);
}

document.querySelectorAll("#filtros input").forEach((input) => {
  input.addEventListener("input", aplicarFiltros);
});

function aplicarFiltros() {
  //const data = document.getElementById("filtroData").value.toLowerCase();
  const descricao = document
    .getElementById("filtroDescricao")
    .value.toLowerCase();
  const nome = document.getElementById("filtroNome").value.toLowerCase();
  const instrumento = document
    .getElementById("filtroInstrumento")
    .value.toLowerCase();

  const filtrados = todosRegistros.filter((item) => {
    return (
      // item.data.toLowerCase().includes(data) &&
      item.descricao.toLowerCase().includes(descricao) &&
      item.nome.toLowerCase().includes(nome) &&
      item.instrumento.toLowerCase().includes(instrumento)
    );
  });

  renderizarTabela(filtrados);
}

let excluirContexto = { colecao: null, uid: null, index: null, docId: null };

window.excluirDia = (uid, index) => {
  excluirContexto = { colecao: "escalas", uid, index };
  abrirModalConfirmacao("Deseja realmente excluir este evento da escala?");
};

window.removerParticipante = (colecao, docId) => {
  excluirContexto = { colecao, docId };
  abrirModalConfirmacao("Deseja realmente excluir este participante?");
};

function abrirModalConfirmacao(mensagem) {
  document.getElementById("textoModalConfirmacao").textContent = mensagem;
  document.getElementById("modalConfirmacao").style.display = "flex";
}

function fecharModalConfirmacao() {
  document.getElementById("modalConfirmacao").style.display = "none";
}

document
  .getElementById("btnConfirmarExcluir")
  .addEventListener("click", async () => {
    try {
      if (excluirContexto.colecao === "escalas") {
        const { uid, index } = excluirContexto;
        const ref = doc(db, "escalas", uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Documento não encontrado");

        const dados = snap.data();
        const novaLista = [...(dados.diasSelecionados || [])];
        novaLista.splice(index, 1);

        await updateDoc(ref, { diasSelecionados: novaLista });
        exibirToast("Evento excluído com sucesso!", "success");
      } else {
        await deleteDoc(
          doc(db, excluirContexto.colecao, excluirContexto.docId)
        );
        exibirToast("Participante removido com sucesso!", "success");
      }

      fecharModalConfirmacao();
      carregarEscalas(); // Recarrega a tabela
    } catch (error) {
      console.error("Erro ao excluir:", error);
      exibirToast("Erro ao excluir o registro.", "error");
    }
  });
window.fecharModalConfirmacao = fecharModalConfirmacao;

window.exportarPDF = async function () {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);

  const eventosMap = new Map();

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const nome = dados.nome || "Usuário";
    (dados.diasSelecionados || []).forEach((dia) => {
      const chave = `${dia.data} - ${dia.descricao || ""}`;
      if (!eventosMap.has(chave)) eventosMap.set(chave, []);
      eventosMap.get(chave).push(`${nome} - ${dia.instrumento}`);
    });
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(14);
  doc.text("Escala de Louvor", 14, y);
  y += 10;

  [...eventosMap.entries()].sort().forEach(([chave, lista]) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(12);
    doc.text(chave, 14, y);
    y += 6;
    lista.forEach((item) => {
      doc.setFontSize(11);
      doc.text(`- ${item}`, 18, y);
      y += 6;
    });
    y += 4;
  });

  doc.save("escala_formatada.pdf");
};

function exportarCSV() {
  const rows = [["Data", "Descrição", "Nome", "Instrumento"]];

  document.querySelectorAll(".tabela-escala tbody tr").forEach((tr) => {
    const cols = [...tr.querySelectorAll("td")].map((td) => td.textContent);
    rows.push(cols.slice(0, 4));
  });

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "escala.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document
  .getElementById("btnExportarCSV")
  .addEventListener("click", exportarCSV);
document
  .getElementById("btnExportarPDF")
  .addEventListener("click", exportarPDF);
document
  .getElementById("btnAbrirModal")
  .addEventListener("click", abrirModalParticipante);

function abrirModalParticipante() {
  document.getElementById("modalParticipante").style.display = "flex";
}

function fecharModalParticipante() {
  document.getElementById("modalParticipante").style.display = "none";
}

window.fecharModalParticipante = fecharModalParticipante;

let participantesExtras = [];

function atualizarListaVisual() {
  const lista = document.getElementById("listaParticipantes");
  lista.innerHTML = "";

  participantesExtras.forEach((p, index) => {
    const item = document.createElement("li");
    item.textContent = `${p.nome} - ${p.instrumento} (${p.data} - ${p.descricao})`;

    const btnExcluir = document.createElement("button");
    btnExcluir.textContent = "🗑️";
    btnExcluir.onclick = () => {
      participantesExtras.splice(index, 1);
      atualizarListaVisual();
    };

    item.appendChild(btnExcluir);
    lista.appendChild(item);
  });
}

document
  .getElementById("btnAddParticipante")
  .addEventListener("click", async () => {
    const nome = document.getElementById("novoNome").value.trim();
    const instrumento = document
      .getElementById("novoInstrumento")
      .value.trim()
      .toLowerCase();
    const data = document.getElementById("novoData").value;
    const descricao = document.getElementById("novoDescricao").value.trim();

    // --- INÍCIO DA ALTERAÇÃO (btnAddParticipante) ---
    // Determina o período do novo participante usando a função auxiliar
    const novoParticipantePeriodo = getPeriodoFromDescricao(descricao);
    // --- FIM DA ALTERAÇÃO (btnAddParticipante) ---

    if (!nome || !instrumento || !data || !descricao) {
      exibirToast("Preencha todos os campos.");
      return;
    }

    // 🚫 Verifica se já está na lista temporária (mesmo instrumento, data e período)
    const duplicadoNaLista = participantesExtras.some(
      (p) =>
        p.data === data &&
        p.instrumento.toLowerCase() === instrumento &&
        // --- ALTERAÇÃO AQUI ---
        getPeriodoFromDescricao(p.descricao) === novoParticipantePeriodo
      // --- FIM DA ALTERAÇÃO ---
    );
    if (duplicadoNaLista) {
      exibirToast(
        `"${instrumento}" já foi adicionado para ${novoParticipantePeriodo} (${data}).`
      ); // Atualizado para mostrar o período
      return;
    }

    // 🔍 Verifica na coleção 'escalas'
    const escalasSnap = await getDocs(collection(db, "escalas"));
    for (const docSnap of escalasSnap.docs) {
      const dados = docSnap.data();
      const conflito = (dados.diasSelecionados || []).some(
        (d) =>
          d.data === data &&
          d.instrumento?.toLowerCase() === instrumento &&
          // --- ALTERAÇÃO AQUI ---
          getPeriodoFromDescricao(d.descricao) === novoParticipantePeriodo
        // --- FIM DA ALTERAÇÃO ---
      );
      if (conflito) {
        exibirToast(
          `"${instrumento}" já está marcado por ${dados.nome} no ${novoParticipantePeriodo} de ${data}.` // Atualizado para mostrar o período
        );
        return;
      }
    }

    // 🔍 Verifica na coleção 'grupoExtra'
    const grupoSnap = await getDocs(collection(db, "grupoExtra"));
    for (const docSnap of grupoSnap.docs) {
      const d = docSnap.data();
      const conflitoExtra =
        d.data === data &&
        d.instrumento?.toLowerCase() === instrumento &&
        // --- ALTERAÇÃO AQUI ---
        getPeriodoFromDescricao(d.descricao) === novoParticipantePeriodo;
      // --- FIM DA ALTERAÇÃO ---
      if (conflitoExtra) {
        exibirToast(
          `"${instrumento}" já foi adicionado manualmente por ${d.nome} no ${novoParticipantePeriodo} de ${data}.` // Atualizado para mostrar o período
        );
        return;
      }
    }

    const uid = document.getElementById("usuarioExistente").value || null;
    participantesExtras.push({ nome, instrumento, data, descricao, uid });

    atualizarListaVisual();
    document.getElementById("formNovoParticipante").reset();
  });

document
  .getElementById("btnSalvarTodosParticipantes")
  .addEventListener("click", async () => {
    if (participantesExtras.length === 0) {
      exibirToast("Nenhum participante adicionado.");
      return;
    }

    try {
      const escalasSnap = await getDocs(collection(db, "escalas"));
      const grupoSnap = await getDocs(collection(db, "grupoExtra"));

      for (const p of participantesExtras) {
        // --- INÍCIO DA ALTERAÇÃO (btnSalvarTodosParticipantes) ---
        // Determina o período do participante a ser salvo
        const pPeriodo = getPeriodoFromDescricao(p.descricao);
        // --- FIM DA ALTERAÇÃO (btnSalvarTodosParticipantes) ---

        const conflitoEscala = escalasSnap.docs.some((docSnap) =>
          (docSnap.data().diasSelecionados || []).some(
            (d) =>
              d.data === p.data &&
              d.instrumento?.toLowerCase() === p.instrumento.toLowerCase() &&
              // --- ALTERAÇÃO AQUI ---
              getPeriodoFromDescricao(d.descricao) === pPeriodo
            // --- FIM DA ALTERAÇÃO ---
          )
        );

        const conflitoGrupo = grupoSnap.docs.some((docSnap) => {
          const d = docSnap.data();
          return (
            d.data === p.data &&
            d.instrumento?.toLowerCase() === p.instrumento.toLowerCase() &&
            // --- ALTERAÇÃO AQUI ---
            getPeriodoFromDescricao(d.descricao) === pPeriodo
            // --- FIM DA ALTERAÇÃO ---
          );
        });

        if (conflitoEscala || conflitoGrupo) {
          exibirToast(
            `"${p.instrumento}" já está marcado no ${pPeriodo} de ${p.data}.` // Atualizado para mostrar o período
          );
          return;
        }
      }

      // ✅ Salvar no Firestore
      const promises = participantesExtras.map((p) =>
        addDoc(collection(db, "grupoExtra"), p)
      );
      await Promise.all(promises);

      exibirToast("Participantes adicionados com sucesso!", "success");
      participantesExtras = [];
      atualizarListaVisual();
      fecharModalParticipante();
      location.reload();
    } catch (error) {
      console.error("Erro ao salvar participantes:", error);
      exibirToast("Erro ao salvar participantes.", "error");
    }
  });

//Parte que exclui os arquivos do Banco de dados.
document
  .getElementById("btnLimparDados")
  .addEventListener("click", async () => {
    const confirmacao = await showConfirmationModal(
      "Tem certeza que deseja APAGAR todos os dados da escala?\nUm backup será criado antes."
    );

    if (!confirmacao) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `backups/${timestamp}`;

      // 🔁 Função auxiliar para backup
      async function fazerBackup(origem, destino) {
        const snap = await getDocs(collection(db, origem));
        const writes = snap.docs.map((docSnap) =>
          setDoc(
            doc(db, `${backupPath}/${destino}/${docSnap.id}`),
            docSnap.data()
          )
        );
        await Promise.all(writes);
      }

      // 🔁 Função auxiliar para apagar
      async function deletarColecao(origem) {
        const snap = await getDocs(collection(db, origem));
        const deletes = snap.docs.map((docSnap) =>
          deleteDoc(doc(db, origem, docSnap.id))
        );
        await Promise.all(deletes);
      }

      // 🔒 Backup antes de apagar
      await Promise.all([
        fazerBackup("escalas", "escalas"),
        fazerBackup("eventosExtras", "eventosExtras"),
        fazerBackup("grupoExtra", "grupoExtra"),
      ]);

      // 🧹 Limpar dados originais
      await Promise.all([
        deletarColecao("escalas"),
        deletarColecao("eventosExtras"),
        deletarColecao("grupoExtra"),
      ]);

      exibirToast(
        "Dados apagados com sucesso. Backup salvo em: ",
        "success" + backupPath
      );
      location.reload();
    } catch (error) {
      console.error("Erro ao apagar e fazer backup:", error);
      exibirToast("Erro ao limpar dados. Veja o console.", "error");
    }
  });

// ✅ Visualização PDF modal
window.visualizarEscala = async function () {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);
  const eventosMap = new Map();

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const nome = dados.nome || "Usuário";
    (dados.diasSelecionados || []).forEach((dia) => {
      const chave = `${dia.data} - ${dia.descricao || ""}`;
      if (!eventosMap.has(chave)) eventosMap.set(chave, []);
      eventosMap.get(chave).push(`${nome} - ${dia.instrumento}`);
    });
  });

  const extrasRef = collection(db, "grupoExtra");
  const extrasSnap = await getDocs(extrasRef);
  extrasSnap.forEach((docSnap) => {
    const { data, descricao, nome, instrumento } = docSnap.data();
    const chave = `${data} - ${descricao || ""}`;
    if (!eventosMap.has(chave)) eventosMap.set(chave, []);
    eventosMap.get(chave).push(`${nome} - ${instrumento}`);
  });

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center";
  const content = document.createElement("div");
  content.className =
    "bg-white max-h-[90vh] w-[90vw] overflow-y-auto p-6 rounded shadow text-sm";

  const titulo = document.createElement("h3");
  titulo.textContent = "Pré-visualização da Escala";
  titulo.className = "text-xl font-bold mb-4 text-center";

  const btnFechar = document.createElement("button");
  btnFechar.textContent = "Fechar";
  btnFechar.className =
    "block mx-auto mt-6 bg-red-600 text-white px-4 py-2 rounded";
  btnFechar.onclick = () => modal.remove();

  content.appendChild(titulo);

  [...eventosMap.entries()].sort().forEach(([chave, lista]) => {
    const bloco = document.createElement("div");
    bloco.className = "mb-4";
    const tituloData = document.createElement("h4");
    tituloData.textContent = chave;
    tituloData.className = "font-semibold text-gray-800";
    bloco.appendChild(tituloData);

    lista.forEach((p) => {
      const item = document.createElement("p");
      item.textContent = `- ${p}`;
      bloco.appendChild(item);
    });

    content.appendChild(bloco);
  });

  content.appendChild(btnFechar);
  modal.appendChild(content);
  document.body.appendChild(modal);
};

// ✅ Ligações dos botões
const abrirModalBtn = document.getElementById("btnAbrirModal");
if (abrirModalBtn)
  abrirModalBtn.addEventListener(
    "click",
    () => (document.getElementById("modalParticipante").style.display = "flex")
  );

const visualizarBtn = document.getElementById("btnVisualizarPDF");
if (visualizarBtn) visualizarBtn.addEventListener("click", visualizarEscala);
