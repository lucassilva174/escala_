// scripts/consulta.js
import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Verifica se a página atual é 'consulta.html'
if (window.location.pathname.endsWith("consulta.html")) {
  // Verifica se o usuário está autenticado e se é administrador
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

// Carrega todas as escalas preenchidas por todos os usuários
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

    (dados.diasSelecionados || []).forEach((dia) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${dia.data}</td>
        <td>${dia.descricao || "-"}</td>
        <td>${nome}</td>
        <td>${dia.instrumento}</td>
        <td>
          <button class="btn-editar" onclick="editarDia('${uid}', '${
        dia.data
      }')">✏️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tabela.appendChild(tbody);
  document.getElementById("tabelaEscala").appendChild(tabela);
}

// Função global para edição futura
window.editarDia = (uid, data) => {
  alert(`Abrir modal para editar o dia ${data} do usuário ${uid}`);
};
