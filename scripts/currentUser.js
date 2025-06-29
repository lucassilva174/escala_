// currentUser.js
import { auth } from "./firebase-config.js";
import { getUserDocument } from "./firestoreService.js";

let _usuarioLogado = {}; // Variável interna para armazenar os dados do usuário
let _userUid = null; // Variável interna para armazenar o UID

export const getLoggedInUser = () => auth.currentUser;
export const getLoggedInUserUid = () => _userUid;
export const getLoggedInUserData = () => _usuarioLogado;

export const loadLoggedInUserData = async (uid) => {
  _userUid = uid;
  const userDocSnap = await getUserDocument(uid);
  if (userDocSnap.exists()) {
    _usuarioLogado = userDocSnap.data();
    return _usuarioLogado;
  }
  return null; // Usuário não encontrado no Firestore
};

export const getUserPermissions = () => {
  return {
    isAdmin: _usuarioLogado.admin === true,
    isMinistro: _usuarioLogado.instrumentos?.includes("Ministro") || false,
  };
};
