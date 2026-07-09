# 🚌 RotaCampus

> Plataforma web de rastreamento de ônibus universitário em tempo real — sem app, sem custo, funciona direto no navegador.

![Status](https://img.shields.io/badge/status-ativo-green)
![Licença](https://img.shields.io/badge/licença-MIT-blue)
![Firebase](https://img.shields.io/badge/banco-Firebase_Realtime_DB-orange)
![Hospedagem](https://img.shields.io/badge/hospedagem-Vercel-black)

---

## 📌 Sobre o projeto

O **RotaCampus** nasceu de uma necessidade real em Monte Santo, Bahia: alunos universitários não tinham como saber se o ônibus já havia passado ou quando chegaria ao ponto.

A plataforma resolve isso de forma simples — o motorista abre o site no celular, inicia o rastreamento, e todos os alunos passam a ver o ônibus se movendo ao vivo no mapa. Nenhum aplicativo precisa ser instalado. Funciona em qualquer celular com navegador e internet.

---

## ✨ Funcionalidades

### Para os alunos (`/aluno`)
- 🗺️ Mapa interativo com a posição do ônibus em tempo real
- 🔔 Alerta na tela quando o ônibus chega em cada ponto, com o horário exato
- 📋 Histórico de passagens durante a corrida
- 🟢 Indicador de status (em rota / offline)
- 🚏 Paradas numeradas desenhadas no mapa com o trajeto da rota

### Para o motorista (`/motorista`)
- 🔐 Login com credenciais cadastradas pelo admin
- ▶️ Botão para iniciar o rastreamento via GPS do celular
- ■ Botão para encerrar a corrida (limpa o histórico para os alunos)
- 📍 Exibição de coordenadas, velocidade e precisão em tempo real
- 🖥️ Log de eventos na tela

### Para o administrador (`/admin`)
- 👤 Cadastro, edição e exclusão de motoristas
- 📋 Logs completos de login, falhas de acesso e eventos de rastreamento
- 🚌 Monitoramento do status do ônibus ao vivo
- 🔒 Acesso protegido por senha

---

## 🛠️ Tecnologias utilizadas

| Função | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript puro |
| Mapas | [Leaflet.js](https://leafletjs.com/) |
| Dados do mapa | [OpenStreetMap](https://www.openstreetmap.org/) |
| Banco de dados | [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) |
| Geolocalização | Geolocation API (nativa do navegador) |
| Hospedagem | [Vercel](https://vercel.com/) |
| Controle de versão | Git + GitHub |

---

## 🗂️ Estrutura do projeto

```
rota-campus/
├── index.html                     → Página dos alunos (mapa ao vivo)
├── motorista.html                 → Painel do motorista
├── admin.html                     → Painel administrativo
├── vercel.json                    → Configuração de rotas da Vercel
├── firebase-rules.json            → Regras de segurança do Firebase
├── firebase-database-inicial.json → Estrutura inicial do banco
│
├── css/
│   ├── style.css                  → Estilos gerais
│   └── admin.css                  → Estilos do painel admin
│
└── js/
    ├── firebase-config.js         → Credenciais do Firebase
    ├── mapa-aluno.js              → Lógica do mapa e alertas
    ├── motorista.js               → Lógica de rastreamento e login
    └── admin.js                   → Lógica do painel administrativo
```

---

## 🚀 Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/rota-campus.git
cd rota-campus
```

### 2. Configure o Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto
3. Vá em **Realtime Database → Criar banco de dados** (modo de teste)
4. Vá em **Configurações do projeto → Seus aplicativos → Web** e copie o `firebaseConfig`
5. Abra `js/firebase-config.js` e substitua pelos seus valores:

```js
export const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  databaseURL:       "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "SEU_APP_ID"
};
```

> ⚠️ Copie **apenas o objeto** `firebaseConfig`. Não copie os `import` gerados pelo Firebase Console — eles são para projetos com npm e quebram este projeto.

### 3. Importe a estrutura inicial do banco

No Firebase Console → Realtime Database → clique nos **⋮** → **Importar JSON** → selecione o arquivo `firebase-database-inicial.json`.

### 4. Configure as regras do banco

No Firebase Console → Realtime Database → **Regras** → cole o conteúdo de `firebase-rules.json` e clique em **Publicar**.

### 5. Publique na Vercel

1. Suba o projeto no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Clique em **Deploy**
4. Acesse pelas rotas:
   - `seusite.vercel.app/aluno`
   - `seusite.vercel.app/motorista`
   - `seusite.vercel.app/admin`

> O HTTPS da Vercel é obrigatório para que a Geolocation API funcione no celular.

---

## 🔐 Credenciais padrão

| Acesso | Usuário | Senha |
|---|---|---|
| Admin | `admin` | `admin2024` |
| Motorista | `motorista` | `rota2024` |

> ⚠️ Altere as senhas antes de publicar em produção. As credenciais do admin ficam em `admin` no Realtime Database. As dos motoristas são gerenciadas pelo painel `/admin`.

---

## 📍 Pontos da rota (Monte Santo – BA)

| Ponto | Local | Coordenadas |
|---|---|---|
| 1 | Av. Pedra Vermelha, 2751 | -10.439971, -39.327771 |
| 2 | Posto Altar do Sertão | -10.439915, -39.329013 |
| 3 | Praça Professor Salgado | -10.440289, -39.333558 |

Para alterar os pontos, edite o array `PARADAS` em `js/mapa-aluno.js`.

---

## 🗺️ Como funciona o rastreamento

```
Celular do motorista
        │
        │  Geolocation API (watchPosition)
        ▼
Firebase Realtime Database
        │
        │  onValue (WebSocket em tempo real)
        ▼
Navegador dos alunos → Leaflet.js atualiza o marcador no mapa
```

O Firebase mantém uma conexão persistente via WebSocket. Toda vez que o motorista se move e o GPS atualiza, os dados sobem para o banco e são transmitidos instantaneamente para todos os alunos conectados.

---

## 🔮 Próximas melhorias

- [ ] Suporte a múltiplos ônibus e rotas
- [ ] Estimativa de chegada em cada ponto
- [ ] Notificação push quando o ônibus estiver próximo
- [ ] Histórico de trajetos por data
- [ ] Firebase Authentication para substituir o login manual
- [ ] Ícone personalizado do ônibus

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">Feito com ☕ em Monte Santo, Bahia.</p>
