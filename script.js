const CONFIG = {
  db: "AcervoPadreItamar_v12",
  store: "arquivos",
  cloud: "defxlhmma",
  preset: "acervo_itamar",
};

let db,
  currentSlide = 0,
  filtroCatAtual = "TODAS",
  filtroAnoAtual = "TODOS";

const EVENTOS_ESCOLARES = [
  { data: "2026-02-09", titulo: "Início do Ano Letivo", cat: "ACADÊMICO" },
  { data: "2026-03-27", titulo: "Reunião Pedagógica", cat: "PEDAGÓGICO" },
  { data: "2026-05-10", titulo: "Homenagem Dia das Mães", cat: "SOCIAL" },
  { data: "2026-06-20", titulo: "Festa Junina", cat: "EVENTO" },
  { data: "2026-09-07", titulo: "Desfile de Independência", cat: "CÍVICO" },
  { data: "2026-11-20", titulo: "Mostra Cultural 50 Anos", cat: "CULTURAL" },
  { data: "2026-12-16", titulo: "Encerramento e Formatura", cat: "SOLENIDADE" },
];

// Inicialização do Banco de Dados
const req = indexedDB.open(CONFIG.db, 1);
req.onupgradeneeded = (e) =>
  e.target.result.createObjectStore(CONFIG.store, { keyPath: "id" });

req.onsuccess = (e) => {
  db = e.target.result;
  init();
};

function init() {
  setupYears();
  renderAll();
  setInterval(() => moveSlide(1), 5000);
  setInterval(updateClock, 1000);

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      document.getElementById("login-box").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";
      renderAll();
    }
  });
}

// --- FUNÇÕES DE AUTENTICAÇÃO ---

async function alterarMinhaSenha() {
  const novaSenha = prompt("Digite a nova senha (mínimo 6 caracteres):");
  if (!novaSenha || novaSenha.length < 6) return alert("Senha inválida.");
  const user = firebase.auth().currentUser;
  try {
    await user.updatePassword(novaSenha);
    alert("Senha alterada com sucesso!");
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      alert(
        "Por segurança, saia e entre novamente no sistema antes de mudar a senha.",
      );
      logout();
    } else {
      alert("Erro: " + error.message);
    }
  }
}

async function cadastrarNovoAdmin() {
  const email = prompt("E-mail do novo administrador:");
  const senha = prompt("Senha (mínimo 6 caracteres):");
  if (!email || !senha) return;
  try {
    await firebase.auth().createUserWithEmailAndPassword(email, senha);
    alert("Novo usuário cadastrado com sucesso!");
  } catch (error) {
    alert("Erro ao cadastrar: " + error.message);
  }
}

async function efetuarLogin() {
  const email = document.getElementById("adm-email").value;
  const pass = document.getElementById("adm-pass").value;
  const btn = document.getElementById("btn-login-action");
  btn.innerText = "VERIFICANDO...";
  btn.disabled = true;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
  } catch (error) {
    alert("Acesso Negado: E-mail ou senha incorretos.");
  } finally {
    btn.innerText = "ENTRAR";
    btn.disabled = false;
  }
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => location.reload());
}

// --- FUNÇÕES DE ARQUIVOS E UPLOAD ---

async function uploadCloudinary() {
  const files = document.getElementById("new-img-file").files;
  const cat = document.getElementById("new-img-cat").value;
  const ano = document.getElementById("new-img-year").value;
  const btn = document.getElementById("btn-upload");

  if (!files.length) return alert("Selecione fotos");

  btn.innerText = "ENVIANDO...";
  btn.disabled = true;

  for (let f of files) {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("upload_preset", CONFIG.preset);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CONFIG.cloud}/image/upload`,
        { method: "POST", body: fd },
      );
      const d = await res.json();
      const tx = db.transaction(CONFIG.store, "readwrite");
      tx.objectStore(CONFIG.store).add({
        id: Date.now() + Math.random(),
        url: d.secure_url.replace("/upload/", "/upload/q_auto,f_auto/"),
        cat,
        ano,
      });
    } catch (e) {
      console.error("Erro no upload:", e);
    }
  }
  btn.innerText = "ENVIAR";
  btn.disabled = false;
  renderAll();
}

async function excluirSelecionados() {
  const checkboxes = document.querySelectorAll(".delete-checkbox:checked");
  if (checkboxes.length === 0) return alert("Selecione itens para excluir.");
  if (!confirm("Excluir selecionados?")) return;

  const tx = db.transaction(CONFIG.store, "readwrite");
  const store = tx.objectStore(CONFIG.store);
  checkboxes.forEach((cb) =>
    store.delete(parseFloat(cb.getAttribute("data-id"))),
  );
  tx.oncomplete = () => renderAll();
}

// --- FUNÇÕES DE INTERFACE E RENDERIZAÇÃO ---

function renderAll() {
  if (!db) return;

  const tx = db.transaction(CONFIG.store, "readonly");
  tx.objectStore(CONFIG.store).getAll().onsuccess = (e) => {
    const data = e.target.result;

    // 1. Identidade Visual (Logo e Favicon)
    const logo = data.filter((x) => x.cat === "LOGO").pop();
    if (logo) document.getElementById("main-logo-img").src = logo.url;

    const favicon = data.filter((x) => x.cat === "FAVICON").pop();
    if (favicon) {
      const faviconLink = document.querySelector("link[rel*='icon']");
      if (faviconLink) faviconLink.href = favicon.url;
    }

    const sobre = data.filter((x) => x.cat === "SOBRE").pop();
    if (sobre) document.getElementById("img-sobre-display").src = sobre.url;

    // 2. Galeria de Fotos
    const grid = document.getElementById("main-grid");
    if (grid) {
      const catsGaleria = [
        "ATIVIDADES",
        "DESFILE",
        "EVENTOS",
        "INFRAESTRUTURA",
        "HOMENAGEM",
      ];
      grid.innerHTML = data
        .filter((x) => catsGaleria.includes(x.cat))
        .filter((x) => filtroCatAtual === "TODAS" || x.cat === filtroCatAtual)
        .filter((x) => filtroAnoAtual === "TODOS" || x.ano === filtroAnoAtual)
        .reverse()
        .map(
          (item) => `
          <div class="gallery-item">
            <img src="${item.url}" loading="lazy" onclick="window.open('${item.url}')">
            <div style="padding:15px">
              <span class="badge-accent">${item.ano}</span>
              <p style="font-size:0.75rem; font-weight:600; color:#7f8c8d">${item.cat}</p>
            </div>
          </div>`,
        )
        .join("");
    }

    // 3. Carrossel da Home
    const track = document.getElementById("track-home");
    if (track) {
      const slides = data.filter((x) => x.cat === "SLIDE");
      track.innerHTML =
        slides.length > 0
          ? slides.map((s) => `<img src="${s.url}">`).join("")
          : `<img src="escola.jpg">`;
    }

    // 4. Calendário Escolar
    const calList = document.getElementById("calendar-list");
    if (calList) {
      calList.innerHTML = EVENTOS_ESCOLARES.map((ev) => {
        const d = new Date(ev.data + "T00:00:00");
        return `
          <div class="event-row">
            <div class="event-date">${d.getDate()}<br><small>${d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</small></div>
            <div>
              <h4 style="margin:0">${ev.titulo}</h4>
              <small style="color:var(--accent)">${ev.cat}</small>
            </div>
          </div>`;
      }).join("");
    }

    // 5. Painel Admin (Gerenciamento)
    const adminList = document.getElementById("lista-admin");
    if (adminList) {
      adminList.innerHTML = data
        .map(
          (item) => `
          <div class="admin-item">
            <input type="checkbox" class="delete-checkbox" data-id="${item.id}">
            <img src="${item.url}">
            <div style="font-size:9px; text-align:center; background:#fff; padding: 2px;">
                ${item.cat} | ${item.ano}
            </div>
          </div>`,
        )
        .join("");
    }
  };
}

// --- UTILITÁRIOS ---

function updateClock() {
  const clock = document.getElementById("cal-clock");
  if (clock) clock.innerText = new Date().toLocaleTimeString("pt-BR");
}

function showPage(id) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("btn-" + id)?.classList.add("active");
  window.scrollTo(0, 0);
  renderAll();
}

function setupYears() {
  let opts = "";
  for (let i = 2026; i >= 1970; i--)
    opts += `<option value="${i}">${i}</option>`;
  const selector = document.getElementById("year-selector");
  const uploadSelector = document.getElementById("new-img-year");
  if (selector)
    selector.innerHTML = '<option value="TODOS">Todos os Anos</option>' + opts;
  if (uploadSelector) uploadSelector.innerHTML = opts;
}

function filtrarCat(cat, btn) {
  filtroCatAtual = cat;
  document
    .querySelectorAll(".pill")
    .forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  renderAll();
}

function filtrarAno(ano) {
  filtroAnoAtual = ano;
  renderAll();
}

function moveSlide(step) {
  const track = document.getElementById("track-home");
  const slides = track?.querySelectorAll("img");
  if (!slides || slides.length <= 1) return;
  currentSlide = (currentSlide + step + slides.length) % slides.length;
  track.style.transform = `translateX(-${currentSlide * 100}%)`;
}
