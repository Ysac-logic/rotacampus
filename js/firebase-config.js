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

export const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  databaseURL:       "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "SEU_APP_ID"
};

// ── Credenciais do motorista (login simples) ──────────────────
// Troque por uma senha mais segura depois de testar
export const CREDENCIAIS_MOTORISTA = {
  usuario: "motorista",
  senha:   "rota2024"
};
