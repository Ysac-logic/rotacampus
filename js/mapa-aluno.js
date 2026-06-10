// ============================================================
//  MAPA DOS ALUNOS  –  mapa-aluno.js
//  Monte Santo – BA
// ============================================================

// ── Pontos de parada reais (Monte Santo – BA) ─────────────────
const PARADAS = [
  {
    id: "ponto1",
    nome: "Av. Pedra Vermelha, 2751",
    latitude:  -10.439971,
    longitude: -39.327771,
  },
  {
    id: "ponto2",
    nome: "Posto Altar do Sertão",
    latitude:  -10.439915,
    longitude: -39.329013,
  },
  {
    id: "ponto3",
    nome: "Praça Professor Salgado",
    latitude:  -10.440289,
    longitude: -39.333558,
  },
];

// ── Raio de detecção de chegada (metros) ─────────────────────
const RAIO_CHEGADA_M = 60;

// ── Centro e zoom inicial do mapa ────────────────────────────
const CENTRO_MAPA  = [-10.440059, -39.330114];
const ZOOM_INICIAL = 16;

// ── Timeout offline: 2 minutos sem atualização ───────────────
const TIMEOUT_OFFLINE_MS = 2 * 60 * 1000;

// ── Trajeto (ordem das paradas) ──────────────────────────────
const TRAJETO = PARADAS.map(p => [p.latitude, p.longitude]);

// ─────────────────────────────────────────────────────────────
//  ÍCONES
// ─────────────────────────────────────────────────────────────
const iconeOnibus = L.divIcon({
  className: "",
  html: `<div class="marker-onibus">🚌</div>`,
  iconSize:   [40, 40],
  iconAnchor: [20, 20],
  popupAnchor:[0, -26],
});

const iconeParada = L.divIcon({
  className: "",
  html: `<div class="marker-parada"></div>`,
  iconSize:   [16, 16],
  iconAnchor: [8, 8],
  popupAnchor:[0, -12],
});

// ─────────────────────────────────────────────────────────────
//  ESTADO
// ─────────────────────────────────────────────────────────────
let marcadorOnibus   = null;
let timerOffline     = null;
const pontosPassados = new Set();   // IDs dos pontos já notificados nesta corrida
let historicoEl      = null;        // referência ao DOM do histórico

// ─────────────────────────────────────────────────────────────
//  DISTÂNCIA (Haversine, metros)
// ─────────────────────────────────────────────────────────────
function distanciaM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────
//  HISTÓRICO
// ─────────────────────────────────────────────────────────────
function adicionarHistorico(nomePonto, hora) {
  if (!historicoEl) return;

  const vazio = historicoEl.querySelector(".historico-vazio");
  if (vazio) vazio.remove();

  const item = document.createElement("div");
  item.className = "historico-item";
  item.innerHTML = `
    <span class="hist-icon">📍</span>
    <div class="hist-info">
      <span class="hist-nome">${nomePonto}</span>
      <span class="hist-hora">${hora}</span>
    </div>
  `;
  historicoEl.prepend(item);
}

function limparHistorico() {
  if (!historicoEl) return;
  historicoEl.innerHTML = `<div class="historico-vazio">Nenhuma parada registrada ainda.</div>`;
  pontosPassados.clear();
}

// ─────────────────────────────────────────────────────────────
//  ALERTA DE CHEGADA
// ─────────────────────────────────────────────────────────────
function mostrarAlerta(nomePonto, hora) {
  const el = document.getElementById("chegadaAlerta");
  const nomEl = document.getElementById("chegadaNome");
  const horaEl = document.getElementById("chegadaHora");
  if (!el) return;

  nomEl.textContent = nomePonto;
  horaEl.textContent = hora;
  el.classList.add("alerta-visivel");

  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("alerta-visivel"), 6000);
}

// ─────────────────────────────────────────────────────────────
//  VERIFICAR CHEGADA EM PARADAS
// ─────────────────────────────────────────────────────────────
function verificarChegada(lat, lon) {
  const agora = new Date();
  const hora  = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  PARADAS.forEach(p => {
    if (pontosPassados.has(p.id)) return;
    const dist = distanciaM(lat, lon, p.latitude, p.longitude);
    if (dist <= RAIO_CHEGADA_M) {
      pontosPassados.add(p.id);
      mostrarAlerta(p.nome, hora);
      adicionarHistorico(p.nome, hora);
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  STATUS
// ─────────────────────────────────────────────────────────────
function setOffline(msg) {
  document.getElementById("statusDot").className     = "status-dot dot-offline";
  document.getElementById("statusTexto").textContent = msg || "Ônibus offline";
  document.getElementById("offlineOverlay").style.display = "flex";
}

function setOnline() {
  document.getElementById("statusDot").className     = "status-dot dot-online";
  document.getElementById("statusTexto").textContent = "Ônibus em rota";
  document.getElementById("offlineOverlay").style.display = "none";
}

function formatarTempo(isoString) {
  if (!isoString) return "–";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 5)  return "agora";
  if (diff < 60) return `há ${diff}s`;
  const m = Math.floor(diff / 60);
  return `há ${m}min`;
}

function reiniciarTimerOffline() {
  clearTimeout(timerOffline);
  timerOffline = setTimeout(() => setOffline("Localização pausada"), TIMEOUT_OFFLINE_MS);
}

// ─────────────────────────────────────────────────────────────
//  FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function iniciarMapaAluno(db, ref, onValue) {

  historicoEl = document.getElementById("historicoLista");

  // 1. Criar mapa
  const map = L.map("map", { zoomControl: true }).setView(CENTRO_MAPA, ZOOM_INICIAL);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    maxZoom: 19,
  }).addTo(map);

  // 2. Desenhar trajeto
  L.polyline(TRAJETO, {
    color:     "#2563eb",
    weight:    5,
    opacity:   0.5,
    dashArray: "10 7",
  }).addTo(map);

  // 3. Adicionar paradas com número
  PARADAS.forEach((p, i) => {
    const iconeNum = L.divIcon({
      className: "",
      html: `<div class="marker-parada-num">${i + 1}</div>`,
      iconSize:   [26, 26],
      iconAnchor: [13, 13],
      popupAnchor:[0, -16],
    });

    L.marker([p.latitude, p.longitude], { icon: iconeNum })
      .addTo(map)
      .bindPopup(`<strong>Ponto ${i + 1}</strong><br>${p.nome}`);
  });

  // 4. Escutar Firebase em tempo real
  const refOnibus = ref(db, "onibus/onibus1");

  onValue(refOnibus, (snapshot) => {
    const onibus = snapshot.val();

    if (!onibus) { setOffline("Sem dados no servidor"); return; }

    document.getElementById("nomeRota").textContent = onibus.rota || "–";
    document.getElementById("ultimaAtualizacao").textContent = formatarTempo(onibus.ultimaAtualizacao);

    const vel = onibus.velocidade;
    document.getElementById("velocidade").textContent =
      (vel != null) ? `${Math.round(vel * 3.6)} km/h` : "– km/h";

    // Encerrou a corrida → limpar histórico
    if (onibus.encerrou === true) {
      setOffline("Corrida encerrada");
      limparHistorico();
      if (marcadorOnibus) { marcadorOnibus.remove(); marcadorOnibus = null; }
      return;
    }

    if (!onibus.ativo || !onibus.latitude || !onibus.longitude) {
      setOffline("Ônibus offline");
      if (marcadorOnibus) { marcadorOnibus.remove(); marcadorOnibus = null; }
      return;
    }

    setOnline();
    reiniciarTimerOffline();

    const { latitude: lat, longitude: lon } = onibus;
    const pos = [lat, lon];

    verificarChegada(lat, lon);

    if (!marcadorOnibus) {
      marcadorOnibus = L.marker(pos, { icon: iconeOnibus }).addTo(map);
      marcadorOnibus.bindPopup(`<strong>${onibus.rota || "Ônibus"}</strong><br>Em rota`);
      map.setView(pos, ZOOM_INICIAL);
    } else {
      marcadorOnibus.setLatLng(pos);
    }
  });

  // 5. Atualizar contador de tempo a cada 10s
  setInterval(() => {
    const r = ref(db, "onibus/onibus1/ultimaAtualizacao");
    onValue(r, snap => {
      document.getElementById("ultimaAtualizacao").textContent = formatarTempo(snap.val());
    }, { onlyOnce: true });
  }, 10_000);
}
