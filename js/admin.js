// ============================================================
//  PAINEL ADMIN  –  admin.js
// ============================================================

let db, fbRef, fbGet, fbSet, fbPush, fbRemove, fbOnValue;
let usuarioExcluirId = null;
let editandoId       = null;

// ─────────────────────────────────────────────────────────────
//  UTILITÁRIO: GET COM TIMEOUT
//  Garante que o Firebase nunca trave indefinidamente
// ─────────────────────────────────────────────────────────────
function getComTimeout(referencia, ms = 8000) {
  return Promise.race([
    fbGet(referencia),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tempo esgotado. Verifique sua conexão.")), ms)
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function formatarData(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function badgeTipoLog(tipo) {
  const map = {
    login:                  { label: "Login",        cls: "badge-verde"    },
    login_admin:            { label: "Login admin",  cls: "badge-azul"     },
    login_falhou:           { label: "Falha login",  cls: "badge-vermelho" },
    rastreamento_iniciado:  { label: "Rastreamento", cls: "badge-azul"     },
    rastreamento_encerrado: { label: "Encerrado",    cls: "badge-cinza"    },
    logout:                 { label: "Logout",       cls: "badge-amarelo"  },
    usuario_criado:         { label: "Criado",       cls: "badge-verde"    },
    usuario_editado:        { label: "Editado",      cls: "badge-amarelo"  },
    usuario_excluido:       { label: "Excluído",     cls: "badge-vermelho" },
    sistema:                { label: "Sistema",      cls: "badge-cinza"    },
  };
  const b = map[tipo] || { label: tipo, cls: "badge-cinza" };
  return `<span class="badge ${b.cls}">${b.label}</span>`;
}

function mostrarErro(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = "block";
}

function ocultarErro(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = "none";
}

// ─────────────────────────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("nav-ativo"));
      document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
      btn.classList.add("nav-ativo");
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = "block";
      if (btn.dataset.tab === "logs") carregarLogs();
    });
  });
}

// ─────────────────────────────────────────────────────────────
//  USUÁRIOS
// ─────────────────────────────────────────────────────────────
function carregarUsuarios() {
  const loading = document.getElementById("loadingUsuarios");
  const tabela  = document.getElementById("tabelaUsuarios");
  const vazio   = document.getElementById("vazioUsuarios");
  const tbody   = document.getElementById("tbodyUsuarios");

  fbOnValue(fbRef(db, "usuarios"), (snap) => {
    loading.style.display = "none";
    const dados = snap.val() || {};
    const lista = Object.entries(dados).filter(([, u]) => u && u.nome);

    if (lista.length === 0) {
      tabela.style.display = "none";
      vazio.style.display  = "block";
      return;
    }

    tabela.style.display = "table";
    vazio.style.display  = "none";
    tbody.innerHTML = "";

    lista.sort((a, b) => (a[1].criadoEm || "").localeCompare(b[1].criadoEm || ""));

    lista.forEach(([id, u]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="td-nome">${u.nome || "–"}</td>
        <td><code class="code-tag">${u.usuario || "–"}</code></td>
        <td>${u.ativo !== false
          ? '<span class="badge badge-verde">Ativo</span>'
          : '<span class="badge badge-vermelho">Desativado</span>'}</td>
        <td class="td-data">${formatarData(u.criadoEm)}</td>
        <td class="td-acoes">
          <button class="btn-icon btn-editar" data-id="${id}" title="Editar">✏️</button>
          <button class="btn-icon btn-excluir" data-id="${id}" data-nome="${u.nome}" title="Excluir">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-editar").forEach(btn =>
      btn.addEventListener("click", () => abrirFormEdicao(btn.dataset.id, dados[btn.dataset.id]))
    );
    tbody.querySelectorAll(".btn-excluir").forEach(btn =>
      btn.addEventListener("click", () => confirmarExclusao(btn.dataset.id, btn.dataset.nome))
    );
  });
}

function abrirFormNovo() {
  editandoId = null;
  document.getElementById("formTitulo").textContent   = "Novo motorista";
  document.getElementById("fNome").value    = "";
  document.getElementById("fUsuario").value = "";
  document.getElementById("fSenha").value   = "";
  document.getElementById("fAtivo").value   = "true";
  ocultarErro("formErro");
  document.getElementById("formCard").style.display = "block";
  document.getElementById("fNome").focus();
}

function abrirFormEdicao(id, dados) {
  editandoId = id;
  document.getElementById("formTitulo").textContent   = "Editar motorista";
  document.getElementById("fNome").value    = dados.nome    || "";
  document.getElementById("fUsuario").value = dados.usuario || "";
  document.getElementById("fSenha").value   = dados.senha   || "";
  document.getElementById("fAtivo").value   = dados.ativo !== false ? "true" : "false";
  ocultarErro("formErro");
  document.getElementById("formCard").style.display = "block";
  document.getElementById("fNome").focus();
}

async function salvarUsuario() {
  const nome    = document.getElementById("fNome").value.trim();
  const usuario = document.getElementById("fUsuario").value.trim().toLowerCase();
  const senha   = document.getElementById("fSenha").value.trim();
  const ativo   = document.getElementById("fAtivo").value === "true";

  ocultarErro("formErro");

  if (!nome || !usuario || !senha) {
    return mostrarErro("formErro", "Preencha todos os campos.");
  }
  if (senha.length < 4) {
    return mostrarErro("formErro", "A senha deve ter pelo menos 4 caracteres.");
  }

  const btn = document.getElementById("btnSalvarUsuario");
  btn.disabled = true; btn.textContent = "Salvando...";

  try {
    const snap  = await getComTimeout(fbRef(db, "usuarios"));
    const todos = snap.val() || {};

    for (const [id, u] of Object.entries(todos)) {
      if (u && u.usuario === usuario && id !== editandoId) {
        return mostrarErro("formErro", `O usuário "${usuario}" já existe.`);
      }
    }

    const dados = {
      nome, usuario, senha, ativo,
      criadoEm: editandoId
        ? (todos[editandoId]?.criadoEm || new Date().toISOString())
        : new Date().toISOString(),
    };

    if (editandoId) {
      await fbSet(fbRef(db, `usuarios/${editandoId}`), dados);
      registrarLogAdmin("usuario_editado", `Admin editou o motorista "${nome}"`);
    } else {
      await fbPush(fbRef(db, "usuarios"), dados);
      registrarLogAdmin("usuario_criado", `Admin criou o motorista "${nome}" (${usuario})`);
    }

    document.getElementById("formCard").style.display = "none";
  } catch (e) {
    mostrarErro("formErro", e.message || "Erro ao salvar.");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar";
  }
}

function confirmarExclusao(id, nome) {
  usuarioExcluirId = id;
  document.getElementById("modalSubTexto").textContent =
    `Excluir o motorista "${nome}"? Esta ação não pode ser desfeita.`;
  document.getElementById("modalExcluir").style.display = "flex";
}

async function excluirUsuario() {
  if (!usuarioExcluirId) return;
  const btn = document.getElementById("btnConfirmarExcluir");
  btn.disabled = true; btn.textContent = "Excluindo...";

  try {
    const snap = await getComTimeout(fbRef(db, `usuarios/${usuarioExcluirId}`));
    const nome = snap.val()?.nome || "desconhecido";
    await fbRemove(fbRef(db, `usuarios/${usuarioExcluirId}`));
    registrarLogAdmin("usuario_excluido", `Admin excluiu o motorista "${nome}"`);
  } catch (e) {
    alert("Erro ao excluir: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Sim, excluir";
    document.getElementById("modalExcluir").style.display = "none";
    usuarioExcluirId = null;
  }
}

// ─────────────────────────────────────────────────────────────
//  LOGS
// ─────────────────────────────────────────────────────────────
async function carregarLogs() {
  const loading = document.getElementById("loadingLogs");
  const tabela  = document.getElementById("tabelaLogs");
  const vazio   = document.getElementById("vazioLogs");
  const tbody   = document.getElementById("tbodyLogs");

  loading.style.display = "block";
  loading.textContent   = "Carregando logs...";
  tabela.style.display  = "none";
  vazio.style.display   = "none";

  try {
    const snap   = await getComTimeout(fbRef(db, "logs"));
    const filtro = document.getElementById("filtroTipoLog").value;
    const dados  = snap.val() || {};

    let lista = Object.values(dados)
      .filter(l => l && l.timestamp)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filtro) lista = lista.filter(l => l.tipo === filtro);
    lista = lista.filter(l => !(l.tipo === "sistema" && l.mensagem === "Banco inicializado"));

    loading.style.display = "none";

    if (lista.length === 0) {
      vazio.style.display = "block";
      return;
    }

    tabela.style.display = "table";
    tbody.innerHTML = "";

    lista.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="td-data">${formatarData(log.timestamp)}</td>
        <td>${badgeTipoLog(log.tipo)}</td>
        <td><code class="code-tag">${log.usuario || "–"}</code></td>
        <td class="td-mensagem">${log.mensagem || "–"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    loading.textContent = "Erro: " + e.message;
  }
}

function registrarLogAdmin(tipo, mensagem) {
  fbPush(fbRef(db, "logs"), {
    tipo, mensagem,
    usuario: "admin",
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
//  STATUS AO VIVO
// ─────────────────────────────────────────────────────────────
function iniciarStatusAoVivo() {
  fbOnValue(fbRef(db, "onibus/onibus1"), (snap) => {
    const o = snap.val();
    if (!o) return;

    const titulo  = document.getElementById("statusTituloOnibus");
    const detalhe = document.getElementById("statusDetalheOnibus");
    const badge   = document.getElementById("statusBadgeOnibus");

    if (o.ativo) {
      titulo.textContent  = "Ônibus em rota";
      detalhe.textContent = o.rota || "–";
      badge.textContent   = "AO VIVO";
      badge.className     = "scb-badge badge-verde";
    } else {
      titulo.textContent  = "Ônibus offline";
      detalhe.textContent = o.encerrou ? "Corrida encerrada" : "Aguardando início";
      badge.textContent   = "OFFLINE";
      badge.className     = "scb-badge badge-cinza";
    }

    document.getElementById("statVelocidade").textContent =
      o.velocidade != null ? `${Math.round(o.velocidade * 3.6)} km/h` : "–";
    document.getElementById("statLat").textContent =
      o.latitude  ? o.latitude.toFixed(5)  : "–";
    document.getElementById("statLon").textContent =
      o.longitude ? o.longitude.toFixed(5) : "–";

    if (o.ultimaAtualizacao) {
      const diff = Math.floor((Date.now() - new Date(o.ultimaAtualizacao)) / 1000);
      document.getElementById("statAtualizacao").textContent =
        diff < 5 ? "agora" : diff < 60 ? `${diff}s atrás` : `${Math.floor(diff / 60)}min atrás`;
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  LOGIN ADMIN
// ─────────────────────────────────────────────────────────────
async function tentarLoginAdmin() {
  const btn     = document.getElementById("btnLogin");
  const usuario = document.getElementById("loginUsuario").value.trim();
  const senha   = document.getElementById("loginSenha").value;

  ocultarErro("loginErro");

  if (!usuario || !senha) {
    return mostrarErro("loginErro", "Preencha usuário e senha.");
  }

  btn.disabled    = true;
  btn.textContent = "Verificando...";

  try {
    const snap  = await getComTimeout(fbRef(db, "admin"));
    const admin = snap.val();

    if (admin && admin.usuario === usuario && admin.senha === senha) {
      document.getElementById("telaLogin").style.display  = "none";
      document.getElementById("telaPainel").style.display = "flex";

      initTabs();
      carregarUsuarios();
      iniciarStatusAoVivo();

      registrarLogAdmin("login_admin", "Admin fez login");
    } else {
      mostrarErro("loginErro", "Usuário ou senha incorretos.");
      setTimeout(() => ocultarErro("loginErro"), 3000);

      fbPush(fbRef(db, "logs"), {
        tipo: "login_falhou",
        mensagem: `Tentativa de login admin falhou para "${usuario}"`,
        usuario,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
  } catch (e) {
    mostrarErro("loginErro", e.message || "Erro de conexão. Tente novamente.");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Entrar como Admin";
    document.getElementById("loginSenha").value = "";
  }
}

// ─────────────────────────────────────────────────────────────
//  EXPORTAÇÃO
// ─────────────────────────────────────────────────────────────
export function iniciarAdmin(database, fns) {
  db        = database;
  fbRef     = fns.ref;
  fbGet     = fns.get;
  fbSet     = fns.set;
  fbPush    = fns.push;
  fbRemove  = fns.remove;
  fbOnValue = fns.onValue;

  document.getElementById("btnLogin").addEventListener("click", tentarLoginAdmin);
  document.getElementById("loginSenha").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarLoginAdmin();
  });

  document.getElementById("btnNovoUsuario").addEventListener("click", abrirFormNovo);
  document.getElementById("btnSalvarUsuario").addEventListener("click", salvarUsuario);
  document.getElementById("btnCancelarForm").addEventListener("click", () => {
    document.getElementById("formCard").style.display = "none";
  });

  document.getElementById("btnConfirmarExcluir").addEventListener("click", excluirUsuario);
  document.getElementById("btnCancelarExcluir").addEventListener("click", () => {
    document.getElementById("modalExcluir").style.display = "none";
    usuarioExcluirId = null;
  });

  document.getElementById("btnAtualizarLogs").addEventListener("click", carregarLogs);
  document.getElementById("filtroTipoLog").addEventListener("change", carregarLogs);
}
