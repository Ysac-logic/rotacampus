// ============================================================
//  PAINEL ADMIN  –  admin.js
// ============================================================

let db, fbRef, fbGet, fbSet, fbPush, fbRemove, fbOnValue;
let usuarioExcluirId = null;
let editandoId       = null;

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
    login_falhou:           { label: "Falha login",  cls: "badge-vermelho" },
    rastreamento_iniciado:  { label: "Rastreamento", cls: "badge-azul"     },
    rastreamento_encerrado: { label: "Encerrado",    cls: "badge-cinza"    },
    logout:                 { label: "Logout",       cls: "badge-amarelo"  },
    sistema:                { label: "Sistema",      cls: "badge-cinza"    },
  };
  const b = map[tipo] || { label: tipo, cls: "badge-cinza" };
  return `<span class="badge ${b.cls}">${b.label}</span>`;
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
      const tab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (tab) tab.style.display = "block";

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
    const lista = Object.entries(dados).filter(([, u]) => u.nome); // ignora placeholder

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

    // Eventos da tabela
    tbody.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", () => abrirFormEdicao(btn.dataset.id, dados[btn.dataset.id]));
    });
    tbody.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", () => confirmarExclusao(btn.dataset.id, btn.dataset.nome));
    });
  });
}

function abrirFormNovo() {
  editandoId = null;
  document.getElementById("formTitulo").textContent = "Novo motorista";
  document.getElementById("fNome").value    = "";
  document.getElementById("fUsuario").value = "";
  document.getElementById("fSenha").value   = "";
  document.getElementById("fAtivo").value   = "true";
  document.getElementById("formErro").style.display = "none";
  document.getElementById("formCard").style.display = "block";
  document.getElementById("fNome").focus();
}

function abrirFormEdicao(id, dados) {
  editandoId = id;
  document.getElementById("formTitulo").textContent = "Editar motorista";
  document.getElementById("fNome").value    = dados.nome    || "";
  document.getElementById("fUsuario").value = dados.usuario || "";
  document.getElementById("fSenha").value   = dados.senha   || "";
  document.getElementById("fAtivo").value   = dados.ativo !== false ? "true" : "false";
  document.getElementById("formErro").style.display = "none";
  document.getElementById("formCard").style.display = "block";
  document.getElementById("fNome").focus();
}

async function salvarUsuario() {
  const erroEl  = document.getElementById("formErro");
  const nome    = document.getElementById("fNome").value.trim();
  const usuario = document.getElementById("fUsuario").value.trim().toLowerCase();
  const senha   = document.getElementById("fSenha").value.trim();
  const ativo   = document.getElementById("fAtivo").value === "true";

  if (!nome || !usuario || !senha) {
    erroEl.textContent   = "Preencha todos os campos.";
    erroEl.style.display = "block";
    return;
  }
  if (senha.length < 6) {
    erroEl.textContent   = "A senha deve ter pelo menos 6 caracteres.";
    erroEl.style.display = "block";
    return;
  }

  const btnSalvar = document.getElementById("btnSalvarUsuario");
  btnSalvar.disabled    = true;
  btnSalvar.textContent = "Salvando...";

  try {
    // Verificar duplicidade de usuário
    const snap = await fbGet(fbRef(db, "usuarios"));
    const todos = snap.val() || {};

    for (const [id, u] of Object.entries(todos)) {
      if (u.usuario === usuario && id !== editandoId) {
        erroEl.textContent   = `O usuário "${usuario}" já existe.`;
        erroEl.style.display = "block";
        return;
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
      const novoRef = await fbPush(fbRef(db, "usuarios"), dados);
      registrarLogAdmin("usuario_criado", `Admin criou o motorista "${nome}" (${usuario})`);
    }

    document.getElementById("formCard").style.display = "none";
    erroEl.style.display = "none";
  } catch (e) {
    erroEl.textContent   = `Erro ao salvar: ${e.message}`;
    erroEl.style.display = "block";
  } finally {
    btnSalvar.disabled    = false;
    btnSalvar.textContent = "Salvar";
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
  try {
    const snap = await fbGet(fbRef(db, `usuarios/${usuarioExcluirId}`));
    const nome = snap.val()?.nome || "desconhecido";
    await fbRemove(fbRef(db, `usuarios/${usuarioExcluirId}`));
    registrarLogAdmin("usuario_excluido", `Admin excluiu o motorista "${nome}"`);
  } catch (e) {
    alert("Erro ao excluir: " + e.message);
  } finally {
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
  tabela.style.display  = "none";
  vazio.style.display   = "none";

  try {
    const snap  = await fbGet(fbRef(db, "logs"));
    const filtro = document.getElementById("filtroTipoLog").value;
    const dados  = snap.val() || {};

    let lista = Object.values(dados)
      .filter(l => l.timestamp)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // mais recente primeiro

    if (filtro) lista = lista.filter(l => l.tipo === filtro);

    // Ignorar placeholder de inicialização
    lista = lista.filter(l => l.tipo !== "sistema" || l.mensagem !== "Banco inicializado");

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
    loading.textContent = "Erro ao carregar logs: " + e.message;
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

    const vel = o.velocidade;
    document.getElementById("statVelocidade").textContent =
      vel != null ? `${Math.round(vel * 3.6)} km/h` : "–";
    document.getElementById("statLat").textContent =
      o.latitude  ? o.latitude.toFixed(5)  : "–";
    document.getElementById("statLon").textContent =
      o.longitude ? o.longitude.toFixed(5) : "–";

    if (o.ultimaAtualizacao) {
      const diff = Math.floor((Date.now() - new Date(o.ultimaAtualizacao)) / 1000);
      document.getElementById("statAtualizacao").textContent =
        diff < 5 ? "agora" : diff < 60 ? `${diff}s atrás` : `${Math.floor(diff/60)}min atrás`;
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
  const erroEl  = document.getElementById("loginErro");

  btn.disabled    = true;
  btn.textContent = "Verificando...";

  try {
    const snap  = await fbGet(fbRef(db, "admin"));
    const admin = snap.val();

    if (admin && admin.usuario === usuario && admin.senha === senha) {
      document.getElementById("telaLogin").style.display = "none";
      document.getElementById("telaPainel").style.display = "flex";

      initTabs();
      carregarUsuarios();
      iniciarStatusAoVivo();

      registrarLogAdmin("login_admin", `Admin fez login`);
    } else {
      erroEl.textContent   = "Usuário ou senha incorretos.";
      erroEl.style.display = "block";
      setTimeout(() => { erroEl.style.display = "none"; }, 3000);

      fbPush(fbRef(db, "logs"), {
        tipo: "login_falhou",
        mensagem: `Tentativa de login admin falhou para "${usuario}"`,
        usuario,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
  } catch (e) {
    erroEl.textContent   = "Erro de conexão: " + e.message;
    erroEl.style.display = "block";
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

  // Login
  document.getElementById("btnLogin").addEventListener("click", tentarLoginAdmin);
  document.getElementById("loginSenha").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarLoginAdmin();
  });

  // Formulário de usuário
  document.getElementById("btnNovoUsuario").addEventListener("click", abrirFormNovo);
  document.getElementById("btnSalvarUsuario").addEventListener("click", salvarUsuario);
  document.getElementById("btnCancelarForm").addEventListener("click", () => {
    document.getElementById("formCard").style.display = "none";
  });

  // Modal de exclusão
  document.getElementById("btnConfirmarExcluir").addEventListener("click", excluirUsuario);
  document.getElementById("btnCancelarExcluir").addEventListener("click", () => {
    document.getElementById("modalExcluir").style.display = "none";
    usuarioExcluirId = null;
  });

  // Filtro de logs
  document.getElementById("btnAtualizarLogs").addEventListener("click", carregarLogs);
  document.getElementById("filtroTipoLog").addEventListener("change", carregarLogs);
}
