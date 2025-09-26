// Utility: fallback for images/downloads
function fallbackSrc(primary, mirror) {
  return function(e) {
    if (e.target.src !== mirror && mirror && mirror !== "None" && mirror !== "") {
      e.target.src = mirror;
    } else {
      e.target.onerror = null;
      e.target.src = "https://via.placeholder.com/112x112?text=No+Icon";
    }
  };
}

// Utility: get CSV and cache in sessionStorage
function fetchCSV(callback) {
  if (window._CSV_CACHE) { callback(window._CSV_CACHE); return; }
  fetch('db/sobsdataboss.csv?'+Date.now()).then(r => r.text()).then(csv => {
    Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        window._CSV_CACHE = res.data;
        callback(res.data);
      }
    });
  });
}

// Main list loader
function loadEntries(type) {
  fetchCSV(entries => {
    // Filter by type and visible (visible!=0 or !=false or blank)
    let filtered = entries.filter(e =>
      e.type === type &&
      (e.visible === undefined || e.visible === "" || e.visible === "1" || e.visible.toLowerCase() === "true")
    );
    // For DATA dependency lookup
    let dataMap = {};
    entries.forEach(e=>{ if(e.type==="DATA" && (!e.visible || e.visible==="1"||e.visible==="")) dataMap[e.id]=e; });

    // Render cards
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = "";
    filtered.forEach(e => {
      let card = document.createElement('div');
      card.className = "card";
      card.tabIndex = 0;
      card.title = e.id;
      card.onclick = () => { window.location.href = `entry.html?id=${encodeURIComponent(e.id)}`; };

      // Icon
      let icon = document.createElement('img');
      icon.className = "card-icon";
      icon.src = e.download_icon0;
      icon.loading = "lazy";
      icon.onerror = fallbackSrc(e.download_icon0, e.download_icon0_mirror);
      card.appendChild(icon);

      // Title
      let title = document.createElement('div');
      title.className = "card-title";
      title.innerText = e.title || e.id;
      card.appendChild(title);

      // Author
      let author = document.createElement('div');
      author.className = "card-author";
      author.innerText = e.credits || "";
      card.appendChild(author);

      // Install Button
      let btnArea = document.createElement('div');
      btnArea.className = "card-buttons";
      let installBtn = document.createElement('a');
      installBtn.className = "button";
      installBtn.href = e.download_url || "#";
      installBtn.target = "_blank";
      installBtn.rel = "noopener noreferrer";
      installBtn.innerText = (e.type === "VPK" ? "Install APP" : (e.type === "PLUGIN" ? "Install PLUGIN" : "Install DATA"));
      installBtn.onclick = ev => ev.stopPropagation();
      btnArea.appendChild(installBtn);

      // DATA dependencies as buttons
      if (e.depends && dataMap[e.depends]) {
        let dataBtn = document.createElement('a');
        dataBtn.className = "button";
        dataBtn.href = dataMap[e.depends].download_url || "#";
        dataBtn.target = "_blank";
        dataBtn.rel = "noopener noreferrer";
        dataBtn.innerText = "Install DATA";
        dataBtn.onclick = ev => ev.stopPropagation();
        btnArea.appendChild(dataBtn);
      }
      card.appendChild(btnArea);

      // Source
      let src = document.createElement('div');
      src.className = "card-src" + ((e.download_src==="None"||!e.download_src)?" closed":"");
      if (e.download_src && e.download_src !== "None" && e.download_src.trim() !== "") {
        src.innerHTML = `<a href="${e.download_src}" target="_blank" rel="noopener noreferrer">${e.download_src}</a>`;
      } else {
        src.innerText = "CLOSED SRC";
      }
      card.appendChild(src);

      grid.appendChild(card);
    });
    // Item count
    let c = filtered.length;
    document.getElementById('itemCount').innerText = `Indexed ${c} entr${c===1?'y':'ies'}`;
  });
}

// Entry page loader
function loadEntryPage() {
  let params = new URLSearchParams(window.location.search);
  let entryID = params.get('id');
  if (!entryID) return;

  fetchCSV(entries => {
    let entry = entries.find(e => e.id === entryID);
    if (!entry) {
      document.getElementById('entryPage').innerHTML = `<h2>Entry not found.</h2>`;
      return;
    }
    // Find DATA dependency if any
    let dataDep = entries.find(e2 => e2.type==="DATA" && (e2.depends===entryID || entry.depends===e2.id) && (!e2.visible || e2.visible==="1"||e2.visible===""));

    let html = `<div class="entry-header">
      <img class="entry-icon" src="${entry.download_icon0}" loading="lazy" onerror="this.onerror=null;this.src='${entry.download_icon0_mirror||'https://via.placeholder.com/128x128?text=No+Icon'}';">
      <div>
        <div class="entry-title">${entry.title||entry.id} <span class="entry-id">(${entry.id})</span></div>
        <div class="entry-author">${entry.credits||""}</div>
      </div>
    </div>
    <div class="entry-readme" id="entryReadme">Loading README...</div>
    <div class="entry-buttons">
      <a class="button" href="${entry.download_url}" target="_blank" rel="noopener noreferrer">${entry.type==="VPK"?"Install APP":(entry.type==="PLUGIN"?"Install PLUGIN":"Install DATA")}</a>
      ${dataDep?`<a class="button" href="${dataDep.download_url}" target="_blank" rel="noopener noreferrer">Install DATA</a>`:""}
    </div>
    <div class="entry-src${(!entry.download_src||entry.download_src==="None")?" closed":""}">`
    if (entry.download_src && entry.download_src !== "None" && entry.download_src.trim() !== "") {
      html += `<a href="${entry.download_src}" target="_blank" rel="noopener noreferrer">${entry.download_src}</a>`;
    } else {
      html += "CLOSED SRC";
    }
    html += "</div>";

    document.getElementById('entryPage').innerHTML = html;

    // Fetch README (main or mirror)
    function setReadme(text) {
      document.getElementById('entryReadme').innerText = text || "No README available.";
    }
    fetch(entry.download_readme)
      .then(r => r.ok?r.text():Promise.reject())
      .then(setReadme)
      .catch(()=>{
        if(entry.download_readme_mirror) {
          fetch(entry.download_readme_mirror).then(r=>r.ok?r.text():Promise.reject()).then(setReadme).catch(()=>setReadme("No README available."));
        } else setReadme("No README available.");
      });
  });
}
