# 🚌 RotaCampus

Sistema de rastreamento de ônibus universitário em tempo real.

---

## Estrutura de arquivos

```
rota-campus/
├── index.html                    → Página dos alunos (mapa)
├── motorista.html                → Painel do motorista
├── firebase-database-inicial.json → Estrutura inicial do banco
├── css/
│   └── style.css                 → Estilos de ambas as páginas
└── js/
    ├── firebase-config.js        → ⚠️  Suas credenciais do Firebase
    ├── mapa-aluno.js             → Lógica do mapa em tempo real
    └── motorista.js              → Lógica do rastreamento GPS
```

---

## Configuração passo a passo

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto**
3. Dê um nome (ex: `rotacampus`) e crie
4. No menu lateral: **Compilação → Realtime Database**
5. Clique em **Criar banco de dados**
6. Escolha **Iniciar no modo de teste**
7. Copie a URL do banco (ex: `https://rotacampus-default-rtdb.firebaseio.com`)

### 2. Registrar um app Web

1. Na página inicial do projeto, clique em **</>** (Web)
2. Dê um apelido ao app e clique em **Registrar**
3. Copie o objeto `firebaseConfig` que aparecer

### 3. Editar `js/firebase-config.js`

Substitua os valores de exemplo pelas suas credenciais reais:

```js
export const firebaseConfig = {
  apiKey:            "SUA_CHAVE_REAL",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  databaseURL:       "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### 4. Importar estrutura inicial do banco

1. No Realtime Database, clique nos **três pontos** (⋮) → **Importar JSON**
2. Selecione o arquivo `firebase-database-inicial.json`

### 5. Ajustar as coordenadas para sua cidade

Edite `js/mapa-aluno.js` e altere o array `PARADAS` com as coordenadas reais da sua rota.

Para descobrir coordenadas: abra [openstreetmap.org](https://openstreetmap.org), clique no local com o botão direito e veja a latitude/longitude.

Ajuste também o `CENTRO_MAPA` para o centro da sua rota.

---

## Como testar

1. Abra `motorista.html` no celular
2. Permita o acesso à localização quando o navegador pedir
3. Clique em **▶ Iniciar rastreamento**
4. Abra `index.html` em outro dispositivo ou aba
5. O marcador do ônibus deve aparecer e se mover

> **Importante:** a geolocalização exige HTTPS em produção. Ao publicar na Vercel ou Firebase Hosting, isso já vem incluso.

---

## Publicar gratuitamente

### Opção A — Vercel (recomendado)
1. Crie conta em [vercel.com](https://vercel.com)
2. Envie a pasta para o [GitHub](https://github.com)
3. Importe o repositório na Vercel → **Deploy**
4. Receba uma URL tipo `rotacampus.vercel.app`

### Opção B — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## Personalizar a rota

Edite `js/motorista.js`:
```js
const ROTA_NOME = "Faculdade → Centro";   // nome exibido na tela
const ONIBUS_ID = "onibus1";              // chave no banco de dados
```

---

## Próximos passos (versão 2)

- [ ] Login do motorista com Firebase Auth
- [ ] Suporte a vários ônibus
- [ ] Ícone personalizado do ônibus (SVG)
- [ ] Estimativa de chegada nas paradas
- [ ] Notificação quando o ônibus estiver próximo
- [ ] Painel administrativo para gerenciar rotas
- [ ] Histórico do trajeto percorrido
