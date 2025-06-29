// firestoreService.js
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const getDocument = async (collectionName, documentId) => {
  const docRef = doc(db, collectionName, documentId);
  return await getDoc(docRef);
};

export const getCollection = async (collectionName) => {
  const q = collection(db, collectionName);
  return await getDocs(q);
};

export const setDocument = async (
  collectionName,
  documentId,
  data,
  options
) => {
  const docRef = doc(db, collectionName, documentId);
  await setDoc(docRef, data, options);
};

export const updateDocument = async (collectionName, documentId, data) => {
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, data);
};

// Funções específicas para as coleções que você usa no perfil.js
export const getUserDocument = (userId) => getDocument("usuarios", userId);
export const getEscalasCollection = () => getCollection("escalas");
export const getGrupoExtraCollection = () => getCollection("grupoExtra");
export const getLinksEventosDocument = (eventoId) =>
  getDocument("linksEventos", eventoId);
export const setLinksEventosDocument = (eventoId, data) =>
  setDocument("linksEventos", eventoId, data);
