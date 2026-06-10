// ============================================================
//  PAINEL DO MOTORISTA  –  motorista.js
//  Com login simples e controle de corrida
// ============================================================

import { CREDENCIAIS_MOTORISTA } from "./firebase-config.js";

const ROTA_NOME = "Monte Santo – Rota Principal";
const ONIBUS_ID = "onibus1";

let watchId  = null;
let db       = null;
let dbRef    = null;
let dbUpdate = null;

// ─────────────────────────────────────────────────────────────
//  LOG
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
    log("Geolocalização não suportada neste navegador.", "erro");
    return;
  }
  log("Solicitando permissão de localização...");

  // Limpar flag de encerramento ao iniciar nova corrida
  dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), { encerrou: false });

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      atualizarCoords(pos);
      const dados = {
        ativo:             true,
        encerrou:          false,
        rota:              ROTA_NOME,
        latitude:          pos.coords.latitude,
        longitude:         pos.coords.longitude,
        velocidade:        pos.coords.speed || 0,
        ultimaAtualizacao: new Date().toISOString(),
      };
      dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), dados)
        .then(() => log(`📍 ${dados.latitude.toFixed(5)}, ${dados.longitude.toFixed(5)}`))
        .catch(e => log(`Erro ao salvar: ${e.message}`, "erro"));
    },
    (err) => {
      log(`Erro de localização: ${err.message}`, "erro");
      setAtivo(false);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  setAtivo(true);
  log("Rastreamento iniciado.", "ok");
}

function pararRastreamento() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  // encerrou: true → sinaliza para os alunos limparem histórico
  dbUpdate(dbRef(db, `onibus/${ONIBUS_ID}`), {
    ativo:             false,
    encerrou:          true,
    ultimaAtualizacao: new Date().toISOString(),
  })
    .then(() => log("Corrida encerrada. Histórico dos alunos será limpo.", "ok"))
    .catch(e => log(`Erro ao encerrar: ${e.message}`, "erro"));

  setAtivo(false);
  log("Rastreamento parado.");
}

// ─────────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────────
function tentarLogin() {
  const usuario = document.getElementById("loginUsuario").value.trim();
  const senha   = document.getElementById("loginSenha").value;
  const erroEl  = document.getElementById("loginErro");

  if (
    usuario === CREDENCIAIS_MOTORISTA.usuario &&
    senha   === CREDENCIAIS_MOTORISTA.senha
  ) {
    document.getElementById("telaLogin").style.display  = "none";
    document.getElementById("telaPainel").style.display = "block";
    log("Login realizado com sucesso.", "ok");
  } else {
    erroEl.textContent = "Usuário ou senha incorretos.";
    erroEl.style.display = "block";
    document.getElementById("loginSenha").value = "";
  }
}

// ─────────────────────────────────────────────────────────────
//  EXPORTAÇÃO
// ─────────────────────────────────────────────────────────────
export function iniciarPainelMotorista(database, refFn, updateFn) {
  db       = database;
  dbRef    = refFn;
  dbUpdate = updateFn;

  // Botão de login
  document.getElementById("btnLogin").addEventListener("click", tentarLogin);
  document.getElementById("loginSenha").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarLogin();
  });

  // Botões de rastreamento
  document.getElementById("nomeRota").textContent = ROTA_NOME;
  document.getElementById("btnIniciar").addEventListener("click", iniciarRastreamento);
  document.getElementById("btnParar").addEventListener("click",   pararRastreamento);

  // Garantir offline ao fechar
  window.addEventListener("beforeunload", () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  });
}
