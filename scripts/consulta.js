// scripts/consulta.js
import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
      alert("Acesso restrito ao administrador.");
      window.location.href = "perfil.html";
      return;
    }

    carregarEscalas();
  });
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
      alert("Evento não encontrado.");
    }
  } else {
    alert("Usuário não encontrado.");
  }
};

window.fecharModalEdicao = function () {
  document.getElementById("modalEdicao").style.display = "none";
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

      alert("Dia atualizado com sucesso!");
      fecharModalEdicao();
      location.reload();
    }
  } catch (error) {
    console.error("Erro ao salvar edição:", error);
    alert("Erro ao editar a escala.");
  }
});

async function carregarEscalas() {
  const escalasRef = collection(db, "escalas");
  const snapshot = await getDocs(escalasRef);
  const tabela = document.createElement("table");
  tabela.classList.add("tabela-escala");

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Data</th>
      <th>Descrição</th>
      <th>Nome</th>
      <th>Instrumento</th>
      <th>Ações</th>
    </tr>
  `;
  tabela.appendChild(thead);

  const tbody = document.createElement("tbody");

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const uid = dados.uid;
    const nome = dados.nome || "Usuário";

    dados.diasSelecionados?.forEach((dia, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dia.data}</td>
        <td>${dia.descricao || "-"}</td>
        <td>${nome}</td>
        <td>${dia.instrumento}</td>
        <td>
          <button class="btn-editar" onclick="editarDia('${uid}', ${index})">✏️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tabela.appendChild(tbody);
  document.getElementById("tabelaEscala").innerHTML = "";
  document.getElementById("tabelaEscala").appendChild(tabela);

  const extrasRef = collection(db, "grupoExtra");
  const extrasSnap = await getDocs(extrasRef);

  extrasSnap.forEach((docSnap) => {
    const { data, descricao, nome, instrumento } = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${data}</td>
    <td>${descricao || "-"}</td>
    <td>${nome || "-"}</td>
    <td>${instrumento || "-"}</td>
    <td>—</td>
  `;
    tbody.appendChild(tr);
  });
}

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

document.getElementById("btnAddParticipante").addEventListener("click", () => {
  const nome = document.getElementById("novoNome").value.trim();
  const instrumento = document.getElementById("novoInstrumento").value.trim();
  const data = document.getElementById("novoData").value;
  const descricao = document.getElementById("novoDescricao").value.trim();

  if (!nome || !instrumento || !data || !descricao) {
    alert("Preencha todos os campos.");
    return;
  }

  const duplicado = participantesExtras.some(
    (p) =>
      p.instrumento.toLowerCase() === instrumento.toLowerCase() &&
      p.data === data
  );

  if (duplicado) {
    alert(
      `Já existe um participante com o instrumento "${instrumento}" para o dia ${data}.`
    );
    return;
  }

  participantesExtras.push({ nome, instrumento, data, descricao });
  atualizarListaVisual();
  document.getElementById("formNovoParticipante").reset();
});

document
  .getElementById("btnSalvarTodosParticipantes")
  .addEventListener("click", async () => {
    if (participantesExtras.length === 0) {
      alert("Nenhum participante adicionado.");
      return;
    }

    try {
      const grupoExtraRef = collection(db, "grupoExtra");

      // 🔎 Verifica se há duplicata no Firestore
      for (const p of participantesExtras) {
        const q = query(
          grupoExtraRef,
          where("data", "==", p.data),
          where("instrumento", "==", p.instrumento)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert(
            `O instrumento "${p.instrumento}" já está preenchido em ${p.data}.`
          );
          return;
        }
      }

      const promises = participantesExtras.map((p) =>
        addDoc(collection(db, "grupoExtra"), p)
      );
      await Promise.all(promises);

      alert("Participantes adicionados com sucesso!");
      participantesExtras = [];
      atualizarListaVisual();
      fecharModalParticipante();
      location.reload();
    } catch (error) {
      console.error("Erro ao adicionar participantes:", error);
      alert("Erro ao salvar participantes.");
    }
  });

//Parte que exclui os arquivos do Banco de dados.
document
  .getElementById("btnLimparDados")
  .addEventListener("click", async () => {
    const confirmacao = confirm(
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

      alert("Dados apagados com sucesso. Backup salvo em: " + backupPath);
      location.reload();
    } catch (error) {
      console.error("Erro ao apagar e fazer backup:", error);
      alert("Erro ao limpar dados. Veja o console.");
    }
  });
