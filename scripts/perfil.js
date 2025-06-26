// perfil.js (principal da página de perfil)
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { loadLoggedInUserData, getLoggedInUserData } from "./currentUser.js";
import { carregarCalendario } from "./calendar.js"; // Importa a função do calendário

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userData = await loadLoggedInUserData(user.uid);
  if (!userData) {
    alert("Usuário não encontrado.");
    return;
  }

  const usuarioLogado = getLoggedInUserData(); // Pega os dados carregados

  document.getElementById("perfilContainer").innerHTML = `
        <div class="card"><strong>Email</strong><div>${
          usuarioLogado.email || user.email
        }</div></div>
        <div class="card"><strong>Telefone</strong><div>${
          usuarioLogado.telefone || "Não informado"
        }</div></div>
        <div class="card"><strong>Instrumentos</strong><div>${(
          usuarioLogado.instrumentos || []
        ).join(", ")}</div></div>
        <div class="card"><strong>Equipe</strong><div>${
          usuarioLogado.equipe || "Não informado"
        }</div></div>
    `;

  await carregarCalendario(); // Chama a função para carregar o calendário
});

// Outras lógicas que eram globais ou não se encaixavam em outro lugar, mas são específicas do perfil.
// Exemplo: se houver alguma interação com o HTML do perfil que não seja o calendário ou modais de link.
