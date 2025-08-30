// utils.js
export function exibirToast(message, type = "info") {
  const toastContainer =
    document.getElementById("toastContainer") ||
    (() => {
      const div = document.createElement("div");
      div.id = "toastContainer";
      div.className =
        "fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 max-w-xs";
      document.body.appendChild(div);
      return div;
    })();

  const toast = document.createElement("div");

  const bgColor =
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : type === "warning"
      ? "bg-yellow-500"
      : "bg-gray-700"; // info ou padrão

  toast.className = `p-3 rounded-lg shadow-md text-white text-sm break-words transition-opacity duration-500 ease-out ${bgColor} opacity-100`;

  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        // toastContainer.remove();
      }
    }, 500);
  }, 2000);
}

/**
 * Exibe um modal de confirmação personalizado.
 * @param {string} message A mensagem a ser exibida no modal.
 * @returns {Promise<boolean>} Uma promessa que resolve para true se o usuário confirmar, false caso contrário.
 */
export function showConfirmationModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmationModal");
    const messageEl = document.getElementById("confirmationMessage");
    const yesBtn = document.getElementById("confirmYesBtn");
    const noBtn = document.getElementById("confirmNoBtn");

    if (!modal || !messageEl || !yesBtn || !noBtn) {
      console.error("Elementos do modal de confirmação não encontrados.");
      // Fallback para alert se os elementos não existirem
      resolve(confirm(message));
      return;
    }

    messageEl.textContent = message;
    modal.classList.remove("hidden"); // Mostra o modal
    modal.classList.add("flex"); // Garante que o flexbox esteja ativo para centralização

    const handleYes = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      yesBtn.removeEventListener("click", handleYes);
      noBtn.removeEventListener("click", handleNo);
      resolve(true);
    };

    const handleNo = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      yesBtn.removeEventListener("click", handleYes);
      noBtn.removeEventListener("click", handleNo);
      resolve(false);
    };

    yesBtn.addEventListener("click", handleYes);
    noBtn.addEventListener("click", handleNo);
  });
}
