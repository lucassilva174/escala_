// scripts/logger.js
import { db, auth } from "./firebase-config.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function registrarMovimentacao({ acao, colecao, alvo, tipo }) {
  try {
    const user = auth.currentUser;
    const feitoPor = user?.displayName || user?.email || "Usuário desconhecido";

    await addDoc(collection(db, "movimentacoesLogs"), {
      acao,
      colecao,
      alvo,
      tipo,
      feitoPor,
      feitoPorUid: user?.uid || null,
      timestamp: new Date().toISOString(), // mais legível no console
      criadoEm: serverTimestamp(), // para ordenação no Firestore
    });

    console.log(`✅ Log registrado: ${acao} — ${alvo}`);
  } catch (error) {
    console.error("❌ Erro ao registrar movimentação:", error);
  }
}
