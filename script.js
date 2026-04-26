const API_URL = "https://agile-cooperation-production.up.railway.app";
const CLOUD_NAME = "defxlhmma";
const UPLOAD_PRESET = "acervo_itamar";

let filtroAtualCat = "TODAS";
let filtroAtualAno = "TODOS";
let slideInterval;

// ===== INICIALIZAÇÃO =====
function init() {
  gerarAnos();
  atualizarGaleria();
  gerarCalendario();
  startSlide();
  carregarLogo();
}

// ===== NAVEGAÇÃO E INTERFACE =====
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const targetPage = document.getElementById(id);
  if (targetPage) targetPage.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  const targetBtn = document.getElementById("btn-" + id);
  if (targetBtn) targetBtn.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

const toggleLoader = (btnId, isLoading, text = "ENVIAR") => {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i> Processando...' : text;
  }
};

// ===== GERAÇÃO DE COMPONENTES =====
function gerarAnos() {
  const selectors = ["year-selector", "new-img-year"];
  selectors.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    let h = id === "year-selector" ? '<option value="TODOS">Todos os Anos</option>' : "";
    for (let i = 2026; i >= 1970; i--) h += `<option value="${i}">${i}</option>`;
    el.innerHTML = h;
  });
}

function gerarCalendario() {
  const evs = [
    { d: "10", m: "FEV", t: "Início das Aulas", i: "fa-school" },
    { d: "07", m: "SET", t: "Desfile Cívico", i: "fa-flag" },
    { d: "15", m: "DEZ", t: "Formatura", i: "fa-graduation-cap" },
  ];
  const c = document.getElementById("calendar-list");
  if (c) {
    c.innerHTML = evs.map(e => `
      <div class="custom-card" style="text-align: center;">
        <div class="card-badge-img"><img src="ano.png" style="width:30px;" alt="ícone"></div>
        <div class="card-icon-box"><i class="fas ${e.i}"></i></div>
        <h1 style="color: var(--primary); margin:0;">${e.d} ${e.m}</h1>
        <p>${e.t}</p>
      </div>
    `).join("");
  }
}

// ===== FILTROS E RENDERIZAÇÃO (CONEXÃO BACKEND) =====
function filtrarPorSeletor(ano) {
  filtroAtualAno = ano;
  atualizarGaleria();
}

function filtrarGaleria(cat, btn) {
  filtroAtualCat = cat;
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  atualizarGaleria();
}

async function atualizarGaleria() {
  const g = document.getElementById("main-grid");
  if (!g) return;

  try {
    const res = await fetch(`${API_URL}/items`);
    const data = await res.json();

    let f = data.filter(x => x.cat !== "SLIDE" && x.cat !== "LOGO");
    if (filtroAtualCat !== "TODAS") f = f.filter(x => x.cat === filtroAtualCat);
    if (filtroAtualAno !== "TODOS") f = f.filter(x => x.ano == filtroAtualAno);

    g.innerHTML = f.map(x => `
      <div class="custom-card photo-card">
        <img src="${x.url}" onclick="openFullscreen('${x.url}')" loading="lazy">
        <p style="font-size:0.7rem; margin-top:5px;">${x.cat} (${x.ano})</p>
      </div>
    `).join("");
  } catch (err) {
    console.error("Erro ao carregar galeria:", err);
  }
}

// ===== LOGIN =====
function efetuarLogin() {
  const email = document.getElementById("adm-email").value;
  const pass = document.getElementById("adm-pass").value;
  
  if (email === "valmirbezerra70@gmail.com" && pass === "Padreia2019") {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    carregarListaAdmin();
  } else {
    alert("Erro nas credenciais!");
  }
}

// ===== UPLOAD: CLOUDINARY + MONGODB (RAILWAY) =====
async function processarNovaImagem() {
  const fileInput = document.getElementById("new-img-file");
  const files = Array.from(fileInput.files);
  const cat = document.getElementById("new-img-cat").value;
  const ano = document.getElementById("new-img-year").value;

  if (files.length === 0) return alert("Selecione fotos primeiro.");

  toggleLoader("btn-upload-action", true);

  try {
    for (let f of files) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("upload_preset", UPLOAD_PRESET);

      const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: fd
      });
      const d = await resCloud.json();

      await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: d.secure_url,
          cat: cat,
          ano: ano,
          public_id: d.public_id
        })
      });
    }

    alert("Uploads concluídos com sucesso!");
    atualizarGaleria();
    carregarListaAdmin();
    fileInput.value = ""; 
  } catch (error) {
    console.error(error);
    alert("Erro ao processar upload.");
  } finally {
    toggleLoader("btn-upload-action", false);
  }
}

// ===== ADMINISTRAÇÃO =====
async function carregarListaAdmin() {
  const l = document.getElementById("lista-exclusao-admin");
  if (!l) return;
  try {
    const res = await fetch(`${API_URL}/items`);
    const data = await res.json();
    l.innerHTML = data.map(x => `
      <div class="admin-item-card">
        <img src="${x.url}" class="mini-thumb">
        <span>${x.cat} (${x.ano})</span>
        <button onclick="deletar('${x.id || x._id}')" class="btn-del-small">DELETAR</button>
      </div>
    `).join("");
  } catch (err) { console.log(err); }
}

async function deletar(id) {
  if (confirm("Deseja excluir permanentemente?")) {
    try {
      await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
      alert("Excluído!");
      atualizarGaleria();
      carregarListaAdmin();
    } catch (err) { alert("Erro ao deletar"); }
  }
}

// ===== SLIDE E LOGO =====
async function startSlide() {
  const t = document.getElementById("track-home");
  if (!t) return;
  if (slideInterval) clearInterval(slideInterval);

  try {
    const res = await fetch(`${API_URL}/items`);
    const data = await res.json();
    const s = data.filter(x => x.cat === "SLIDE");
    
    if (s.length > 0) {
      t.innerHTML = s.map(x => `<img src="${x.url}">`).join("");
      if (s.length > 1) {
        let i = 0;
        slideInterval = setInterval(() => {
          i = (i + 1) % s.length;
          t.style.transform = `translateX(-${i * 100}%)`;
        }, 4000);
      }
    }
  } catch (err) { console.log(err); }
}

async function carregarLogo() {
  try {
    const res = await fetch(`${API_URL}/items`);
    const data = await res.json();
    const l = data.filter(x => x.cat === "LOGO").pop();
    if (l) document.getElementById("main-logo-img").src = l.url;
  } catch (err) { console.log(err); }
}

// ===== FULLSCREEN =====
function openFullscreen(s) {
  const overlay = document.getElementById("fullscreen-overlay");
  const img = document.getElementById("fullscreen-img");
  if (overlay && img) {
    img.src = s;
    overlay.style.display = "flex";
  }
}

function closeFullscreen() {
  document.getElementById("fullscreen-overlay").style.display = "none";
}

init();
