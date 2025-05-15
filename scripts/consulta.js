import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

document.addEventListener("DOMContentLoaded", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Usuário não autenticado");

  const docRef = doc(db, "escalas", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("nome").innerText = data.nome;
    document.getElementById("instrumento").innerText = data.instrumento;
    document.getElementById("equipe").innerText = data.equipe;

    const tbody = document.getElementById("tabela-corpo");
    data.diasSelecionados.forEach((item) => {
      const row = `<tr>
        <td>${item.data}</td>
        <td>${item.dia}</td>
        <td>${item.evento}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  }
});
