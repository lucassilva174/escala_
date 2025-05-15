// database.js

// Importa apenas o que precisa da instância já inicializada
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Função para obter os dias definidos pelo administrador
export async function obterDiasDefinidosPeloAdmin() {
  try {
    const diasRef = collection(db, "diasDisponiveis");
    const snapshot = await getDocs(diasRef);

    const dias = [];
    snapshot.forEach((doc) => {
      dias.push(doc.data());
    });

    return dias;
  } catch (error) {
    console.error("Erro ao obter dias do Firestore:", error);
    return [];
  }
}
