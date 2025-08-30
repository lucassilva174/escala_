import { auth } from "./firebase-config.js";
import { exibirToast } from "./utils.js";

let tempoLimite = 10 * 60 * 1000; // 10 minutos
let tempoAviso = 1 * 60 * 1000;
let timeoutInatividade;
let timeoutAviso;
let player = null;

export function configurarPlayerYT(instancia) {
  player = instancia;
  console.log("Player recebido no inatividade.js:", player);
  resetarInatividade();
}

// Reinicia temporizadores
function resetarInatividade(suprimirAviso = false) {
  clearTimeout(timeoutInatividade);
  clearTimeout(timeoutAviso);

  if (!suprimirAviso) {
    timeoutAviso = setTimeout(() => {
      exibirToast(
        "Você será desconectado por inatividade em 1 minuto.",
        "warning"
      );
      console.log("Aviso emitido.");
    }, tempoAviso);
  }

  timeoutInatividade = setTimeout(() => {
    verificarELogout();
  }, tempoLimite);
}

function verificarELogout() {
  console.log("====== Verificação de logout ======");

  try {
    const modalYoutube = document.getElementById("modalExpandido");
    const modalPlayerMusica = document.getElementById("modalPlayerMusica");

    const modalYoutubeAberto =
      modalYoutube && getComputedStyle(modalYoutube).display !== "none";
    const modalMusicaAberto =
      modalPlayerMusica &&
      getComputedStyle(modalPlayerMusica).display !== "none";

    let emAtividade = false;

    if (player && typeof player.getPlayerState === "function") {
      const estado = player.getPlayerState();
      console.log("Estado do player:", estado);

      emAtividade =
        estado === 1 || // PLAYING
        estado === 3 || // BUFFERING
        estado === 5 || // CUED
        estado === -1; // UNSTARTED
    }

    // Se qualquer modal estiver visível e com atividade, considera ativo
    if ((modalYoutubeAberto && emAtividade) || modalMusicaAberto) {
      console.log("Atividade detectada. Não deslogar.");
      resetarInatividade(true); // ← passamos `true` para suprimir toast
      return;
    }
  } catch (e) {
    console.error("Erro ao verificar estado do player:", e);
  }

  // Desloga o usuário
  auth.signOut().then(() => {
    exibirToast("Você foi desconectado por inatividade.", "info");
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 3000);
  });
  console.log("Deslogando usuário...");
}

// Monitora atividade do usuário
["click", "mousemove", "keydown", "scroll", "touchstart"].forEach((evento) => {
  document.addEventListener(evento, resetarInatividade);
});

// Inicia temporizador
resetarInatividade();
