// ============================================================
//  PAINEL DO MOTORISTA  –  motorista.js
//  Credenciais buscadas do Firebase Realtime Database
// ============================================================

const ROTA_NOME = "Monte Santo – Rota Principal";
const ONIBUS_ID = "onibus1";

let watchId   = null;
let db        = null;
let dbRef     = null;
let dbUpdate  = null;
let dbGet     = null;
let dbPush    = null;
let usuarioLogado = null; // guarda o ID do usuário logado

// ─────────────────────────────────────────────────────────────
//  LOG NO BANCO
// ─────────────────────────────────────────────────────────────
function registrarLog(tipo, mensagem) {
  if (!dbPush || !dbRef || !db) return;
  const { push } = window._fbPush;
  push(dbRef(db, "logs"), {
    tipo,
    mensagem,
    usuario: usuarioLogado || "desconhecido",
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
//  LOG NA TELA
// ─────────────────────────────────────────────────────────────
function log(msg, tipo = "info") {
  const lista = document.getElementById("logLista");
  if (!lista) return;
  const hora = new Date().toLocaleTimeString("pt-BR");
  const el   = document.createElement("div");
  el.className = `log-item log-${tipo}`;
  el.textContent = `[${hora}] ${msg}`;
  lista.prepend(el);
  while (lista.children.length > 30) lista.removeChild(lista.lastChild);
}

// ─────────────────────────────────────────────────────────────
//  UI STATUS
// ─────────────────────────────────────────────────────────────
function setAtivo(ativo) {
  document.getElementById("btnIniciar").disabled = ativo;
  document.getElementById("btnParar").disabled   = !ativo;

  const circle = document.getElementById("statusCircle");
  const icon   = document.getElementById("statusIcon");
  const titulo = document.getElementById("statusTitulo");
  const sub    = document.getElementById("statusSub");

  if (ativo) {
    circle.classList.add("circle-ativo");
    icon.textContent   = "▶";
    titulo.textContent = "Rastreamento ativo";
    sub.textContent    = "Enviando localização em tempo real";
  } else {
    circle.classList.remove("circle-ativo");
    icon.textContent   = "⏸";
    titulo.textContent = "Rastreamento pausado";
    sub.textContent    = "Clique em iniciar para começar";
  }
}

function atualizarCoords(pos) {
  const c = pos.coords;
  document.getElementById("coordLat").textContent = c.latitude.toFixed(6);
  document.getElementById("coordLon").textContent = c.longitude.toFixed(6);
  document.getElementById("coordVel").textContent =
    c.speed != null ? `${Math.round(c.speed * 3.6)} km/h` : "–";
  document.getElementById("coordAcc").textContent =
    c.accuracy != null ? `±${Math.round(c.accuracy)}m` : "–";
}

// ─────────────────────────────────────────────────────────────
//  RASTREAMENTO
// ─────────────────────────────────────────────────────────────
function iniciarRastreamento() {
  if (!navigator.geolocation) {
    log("Geolocalização não suportada.", "erro");
    return;
  }
  log("Solicitando permissão de localização...");
  dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), { encerrou: false });

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      atualizarCoords(pos);
      const dados = {
        ativo: true, encerrou: false, rota: ROTA_NOME,
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        velocidade: pos.coords.speed || 0,
        ultimaAtualizacao: new Date().toISOString(),
      };
      dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), dados)
        .then(() => log(`📍 ${dados.latitude.toFixed(5)}, ${dados.longitude.toFixed(5)}`))
        .catch(e => log(`Erro: ${e.message}`, "erro"));
    },
    (err) => { log(`Erro GPS: ${err.message}`, "erro"); setAtivo(false); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  setAtivo(true);
  log("Rastreamento iniciado.", "ok");
  registrarLog("rastreamento_iniciado", `Motorista iniciou o rastreamento`);
}

function pararRastreamento() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }

  dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), {
    ativo: false, encerrou: true,
    ultimaAtualizacao: new Date().toISOString(),
  })
    .then(() => log("Corrida encerrada.", "ok"))
    .catch(e => log(`Erro: ${e.message}`, "erro"));

  setAtivo(false);
  log("Rastreamento parado.");
  registrarLog("rastreamento_encerrado", `Motorista encerrou o rastreamento`);
}

// ─────────────────────────────────────────────────────────────
//  LOGIN — busca usuários do Firebase
// ─────────────────────────────────────────────────────────────
async function tentarLogin() {
  const btnLogin = document.getElementById("btnLogin");
  const usuario  = document.getElementById("loginUsuario").value.trim();
  const senha    = document.getElementById("loginSenha").value;
  const erroEl   = document.getElementById("loginErro");

  if (!usuario || !senha) {
    erroEl.textContent   = "Preencha usuário e senha.";
    erroEl.style.display = "block";
    return;
  }

  btnLogin.textContent = "Verificando...";
  btnLogin.disabled    = true;

  try {
    const { get } = window._fbGet;
    const snap = await get(dbRef(db, "usuarios"));
    const usuarios = snap.val() || {};

    let encontrado = null;
    for (const [id, u] of Object.entries(usuarios)) {
      if (u.usuario === usuario && u.senha === senha && u.ativo !== false) {
        encontrado = { id, ...u };
        break;
      }
    }

    if (encontrado) {
      usuarioLogado = encontrado.usuario;
      document.getElementById("telaLogin").style.display  = "none";
      document.getElementById("telaPainel").style.display = "block";
      document.getElementById("nomeMotorista").textContent = encontrado.nome || usuario;
      log(`Bem-vindo, ${encontrado.nome || usuario}!`, "ok");

      // Registrar login no banco
      const { push } = window._fbPush;
      push(dbRef(db, "logs"), {
        tipo: "login",
        mensagem: `Motorista "${encontrado.nome || usuario}" fez login`,
        usuario: encontrado.usuario,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

    } else {
      erroEl.textContent   = "Usuário ou senha incorretos, ou conta desativada.";
      erroEl.style.display = "block";
      setTimeout(() => { erroEl.style.display = "none"; }, 4000);

      // Registrar tentativa falha
      const { push } = window._fbPush;
      push(dbRef(db, "logs"), {
        tipo: "login_falhou",
        mensagem: `Tentativa de login falhou para "${usuario}"`,
        usuario: usuario,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
  } catch (e) {
    erroEl.textContent   = "Erro ao conectar. Verifique sua conexão.";
    erroEl.style.display = "block";
    log(`Erro de conexão: ${e.message}`, "erro");
  } finally {
    btnLogin.textContent = "Entrar";
    btnLogin.disabled    = false;
    document.getElementById("loginSenha").value = "";
  }
}

// ─────────────────────────────────────────────────────────────
//  EXPORTAÇÃO
// ─────────────────────────────────────────────────────────────
export function iniciarPainelMotorista(database, refFn, updateFn, getFn, pushFn) {
  db        = database;
  dbRef     = refFn;
  dbUpdate  = updateFn;
  // Guardar get e push no window para uso nas funções async
  window._fbGet  = { get: getFn };
  window._fbPush = { push: pushFn };

  document.getElementById("nomeRota").textContent = ROTA_NOME;

  document.getElementById("btnLogin").addEventListener("click", tentarLogin);
  document.getElementById("loginSenha").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarLogin();
  });

  document.getElementById("btnIniciar").addEventListener("click", iniciarRastreamento);
  document.getElementById("btnParar").addEventListener("click",   pararRastreamento);

  window.addEventListener("beforeunload", () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      registrarLog("logout", "Motorista fechou a página durante rastreamento");
    }
  });
}
