// ============================================================
//  CONFIGURAÇÃO DO FIREBASE
//  Substitua os valores abaixo pelos do seu projeto Firebase.
//
//  Como obter:
//  1. Acesse https://console.firebase.google.com
//  2. Crie (ou abra) seu projeto
//  3. Vá em Configurações do projeto > Geral
//  4. Role até "Seus aplicativos" e copie o firebaseConfig
// ============================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAxcFuM2umRgN2MlfHTfLUKmYIKDksqrs",
  authDomain: "rotacampus.firebaseapp.com",
  databaseURL: "https://rotacampus-default-rtdb.firebaseio.com",
  projectId: "rotacampus",
  storageBucket: "rotacampus.firebasestorage.app",
  messagingSenderId: "491925252256",
  appId: "1:491925252256:web:00a2f5b4788b6deaf281c5",
  measurementId: "G-N4CY2VTMYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ── Credenciais do motorista (login simples) ──────────────────
// Troque por uma senha mais segura depois de testar
export const CREDENCIAIS_MOTORISTA = {
  usuario: "motorista",
  senha:   "rota2024"
};
