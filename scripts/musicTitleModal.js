// musicTitleModal.js
export function abrirModalNomeMusica(
  callback,
  tituloAtual = "",
  linkAtual = ""
) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

  modal.innerHTML = `
    <div class="bg-white p-6 rounded shadow max-w-sm w-full animate-fade-in">
      <h3 class="text-lg font-semibold text-center mb-4">Nome da Música</h3>
      <input id="inputTituloMusica" class="w-full px-3 py-2 border rounded mb-4" 
             placeholder="Digite o nome da música" value="${tituloAtual}" autofocus />
      <input id="inputLinkMusica" type="url" 
             placeholder="Cole o link da música"
             class="w-full px-4 py-2 border rounded mt-2" value="${linkAtual}" />
      <div class="flex justify-end gap-2 mt-4">
        <button id="btnCancelarTitulo" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
          Cancelar
        </button>
        <button id="btnConfirmarTitulo" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Salvar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("btnCancelarTitulo").onclick = () => {
    modal.remove();
    callback(null); // cancelado
  };

  document.getElementById("btnConfirmarTitulo").onclick = () => {
    const titulo = document.getElementById("inputTituloMusica").value.trim();
    const link = document.getElementById("inputLinkMusica").value.trim();

    if (titulo && link) {
      callback({ titulo, link });
      modal.remove();
    }
  };
}
