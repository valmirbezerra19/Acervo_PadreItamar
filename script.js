const API_URL = "https://SEU-LINK-RAILWAY";

// ===== LOGIN =====
async function efetuarLogin() {
  const email = document.getElementById("adm-email").value;
  const pass = document.getElementById("adm-pass").value;

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    renderAll();
  } else {
    alert("Login inválido");
  }
}

// ===== UPLOAD =====
async function uploadCloudinary() {
  const files = document.getElementById("new-img-file").files;
  const cat = document.getElementById("new-img-cat").value;
  const ano = document.getElementById("new-img-year").value;

  for (let file of files) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("categoria", cat);
    fd.append("ano", ano);

    await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: fd,
    });
  }

  alert("Upload feito!");
  renderAll();
}

// ===== RENDER =====
async function renderAll() {
  const res = await fetch(`${API_URL}/images`);
  const data = await res.json();

  // GALERIA
  const grid = document.getElementById("main-grid");
  if (grid) {
    grid.innerHTML = data
      .map(
        (img) => `
      <div class="gallery-item">
        <img src="${img.url}">
        <p>${img.categoria}</p>
      </div>
    `,
      )
      .join("");
  }

  // SLIDE
  const track = document.getElementById("track-home");
  if (track) {
    track.innerHTML = data
      .filter((i) => i.categoria === "SLIDE")
      .map((i) => `<img src="${i.url}">`)
      .join("");
  }
}

// ===== PÁGINAS =====
function showPage(id) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===== ANOS =====
function setupYears() {
  let html = "";
  for (let i = 2026; i >= 2000; i--) {
    html += `<option>${i}</option>`;
  }
  document.getElementById("new-img-year").innerHTML = html;
}

setupYears();
renderAll();
