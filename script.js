const search = document.getElementById("search");
const results = document.getElementById("results");
const viewer = document.getElementById("viewer");
const full = document.getElementById("full");
const desc = document.getElementById("desc");
const close = document.getElementById("close");
const comment = document.getElementById("comment");
const send = document.getElementById("send");
const toggleBtn = document.getElementById("toggle-exif");
const exifBox = document.getElementById("exif-box");
var supabase = window.supabase.createClient(
  "https://stazwtpdolwizkhqoaxx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YXp3dHBkb2x3aXpraHFvYXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDQ4OTYsImV4cCI6MjA5MDQyMDg5Nn0.ZNptS0Dc2GVatO3B1EgB4FQVoKh2VuC6ONly6KiZe9E"
);
const commentInput = document.getElementById("comment");
const prev = document.getElementById("prev");
const next = document.getElementById("next");
let currentList = [];      // aktiivinen kuvajoukko (esim. hakutulokset, kansio...)
let currentIndex = 0;      // aktiivinen kuvan indeksi listassa
let isExifVisible = false;

console.log(Fuse.version);

const params = new URLSearchParams(window.location.search);
console.log("Url params:", Object.fromEntries(params.entries()));
const commentOption = params.get('co') ?? '3'; // Kommentointi (co)
const commentsEnabled = ["2", "3"].includes(commentOption);
const showExistingComments = ["1", "3"].includes(commentOption);
const showVisitorCounter = (params.get('vc') ?? '1') === '1'; // Kävijälaskurit (vc)
const showExifData = (params.get('ex') ?? '1') === '1'; // Exif-tiedot (ex)
if (!commentsEnabled) {
    comment.style.display = 'none';
    send.style.display = 'none';
}
if (!showExistingComments) {
    document.getElementById('comment-section').style.display = 'none';
}
if (!showVisitorCounter) {
  document.getElementById('image-view-counter').style.display = 'none';
  document.getElementById('overall-page-counter').style.display = 'none';
  document.getElementById('overall-view-counter').style.display = 'none';
}
if (!showExifData) {
   document.getElementById('exif-panel').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", () => {
  trackPageView();
  loadPageViewCount();
  loadTotalViews(); 
  console.log(`Näkymän leveys on ${window.innerWidth}px`);
  document.getElementById("resotieto").textContent = `Näkymän leveys on ${window.innerWidth}px`;
  
  const textarea = document.getElementById('comment');
  textarea.addEventListener('input', () => {
          textarea.style.height = 'auto'; // Nollaa ensin korkeus
          textarea.style.height = textarea.scrollHeight + 'px'; // Kasvata sisällön mukaan
  });
 });

fetch("images.json")
  .then((res) => res.json())
  .then((data) => {
    const sorted = data.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
    const fuse = new Fuse(sorted, {
      keys: ["title", "description", "filename", "tags"],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true
    });
    
    const params = new URLSearchParams(window.location.search);
    const imageParam = params.get("image");

    if (imageParam) {
      const img = sorted.find(i => i.filename === imageParam);
      if (img) {
        currentList = sorted;
        currentIndex = sorted.indexOf(img);
        openViewer(`img/${img.filename}`, img);
        loadExifFromImage(`img/${img.filename}`);
      } else {
        console.warn("⚠️ Kuvaa ei löytynyt:", imageParam);
      }
    }
    
    function render(list) {
      results.innerHTML = "";
      list.forEach((img) => {
        const li = document.createElement("li");
        li.innerHTML = `<img src="img/${img.filename}" alt="${img.title}" title="${img.title}" />`;
        li.onclick = () => {
          currentList = list;              // tallennetaan tällä hetkellä näytetty kuvajoukko
          currentIndex = list.indexOf(img); // tallennetaan mikä kuva valittiin
          openViewer(`img/${img.filename}`, img);
          loadExifFromImage(`img/${img.filename}`);
        };
        results.appendChild(li);
      });
    }

    window.loadFolder = function loadFolder(folderName) {
      const filtered = sorted.filter(img => img.filename.startsWith(folderName + "/"));
      render(filtered);
    }
    window.showAll = function() {
      render(sorted);
    };

    render(sorted);
  
    search.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      if (!q) return render(sorted);
      //const result = fuse.search(q).map(r => r.item);
      const searchResult = fuse.search(q);
      console.log(`🔍 Haku: "${q}"`);
      searchResult.forEach(r => console.log(`📷 ${r.item.filename} | osuma-arvo: ${r.score.toFixed(4)}`) );
      const result = searchResult.map(r => r.item);
      const result_ = sorted.filter(img =>
          img.filename.includes(q) ||
          img.title.includes(q) ||
          img.tags.includes(q) ||
          img.description.includes(q)
        );
      render(result);
    });

    close.onclick = () => {
      viewer.classList.add("hidden");
      document.body.style.overflow = ""; // 🔓 Palautetaan taustasivun scrollaus
    };

    
    send.onclick = () => {
      const text = comment.value.trim();
      const filename = decodeURIComponent(full.src.split("/img/")[1]); 

      if (!text) return;

      console.log("📤 Lähetetään Supabaseen...filename:", filename);
      sendComment(filename, text);

     };
  });
  
function loadExifFromImage(url) {
  fetch(url)
    .then(res => res.blob())
    .then(blob => blob.arrayBuffer())
    .then(buffer => {
      const tags = ExifReader.load(buffer);
      console.log("📸 EXIF:", tags);

      const exifList = document.getElementById("exif-list");
      exifList.innerHTML = "";

      const fieldsToShow = ["Model", "FNumber", "ExposureTime", "ISO", "DateTimeOriginal"];
      fieldsToShow.forEach(key => {
        if (tags[key]) {
          const li = document.createElement("li");
          li.textContent = `${key}: ${tags[key].description || tags[key].value}`;
          exifList.appendChild(li);
        }
      });

      if (exifList.innerHTML === "") {
        exifList.innerHTML = "<li>Ei EXIF-tietoja saatavilla.</li>";
      }
    })
    .catch(err => {
      console.warn("❌ EXIF-luku epäonnistui:", err);
      document.getElementById("exif-list").innerHTML = "<li>Exif-tietoja ei voitu lukea.</li>";
    });
}

async function sendComment(filename, text) {
  console.log("sendComment : ", filename);
  const { error } = await supabase
    .from("comments")
    .insert([
      {
        image: filename,
        message: text,
        timestamp: new Date().toISOString()
      }
    ]);

  if (error) {
    console.error("💥 Kommentin tallennus epäonnistui:", error.message);
    alert("Kommenttia ei voitu tallentaa. Yritä hetken kuluttua uudelleen.");
  } else {
    console.log("✅ Kommentti tallennettu Supabaseen!");
    commentInput.value = ""; // tyhjennä kenttä jos käytössä
    await loadCommentsForImage(filename);
  }
}

// Kommenttien näyttö Supabasesta
async function loadCommentsForImage(filename) {
  //const haku_fn = encodeURIComponent(filename);
  console.log("loadCommentsForImage : ", filename);
  const { data: comments, error } = await supabase
    .from("comments")
    .select("message")
    .eq("image", filename)
    .order("timestamp", { ascending: true });
    
  console.log("🔍 Supabasen vastaus:", comments);

  const commentBox = document.getElementById("comment-list");
  commentBox.innerHTML = "";

  if (error) {
    console.error("💥 Kommenttien haku epäonnistui:", error.message);
    commentBox.textContent = "Kommenttien lataus epäonnistui.";
    return;
  }

  if (!comments || comments.length === 0) {
    commentBox.textContent = "Ei vielä kommentteja tälle kuvalle.";
  } else {
    comments.forEach(comment => {
      const p = document.createElement("p");
      p.textContent = comment.message;
      commentBox.appendChild(p);
    });
  }
}

async function loadTotalViews() {
  const { data, error } = await supabase
    .from("images")
    .select("views", { count: "exact" });

  const total = data?.reduce((sum, item) => sum + (item.views || 0), 0) || 0;
  document.getElementById("overall-view-counter").textContent = `🔍 Kuvia katsottu yhteensä ${total} kertaa`;
}

async function incrementAndShowViewCount(filename) {
  // 1. Hae nykyinen määrä
  const { data, error } = await supabase
    .from("images")
    .select("views")
    .eq("filename", filename)
    .maybeSingle();

  let updatedCount;

  if (data) {
    // Jos rivi löytyy → kasvatetaan
    const current = data.views ?? 0;
    updatedCount = current + 1;

    await supabase
      .from("images")
      .update({ views: updatedCount })
      .eq("filename", filename);
  } else {
    // Jos ei löydy → luodaan rivi ja asetetaan views = 1
    updatedCount = 1;

    await supabase
      .from("images")
      .insert([{ filename, views: updatedCount }]);
  }

  // 3. Näytä lukema isossa näkymässä
  const viewCounter = document.getElementById("image-view-counter");
  if (viewCounter) {
    viewCounter.textContent = `🔍 Tällä kuvalla ${updatedCount} katselukertaa`;
  }
}

async function getIP() {
  try {
    //const res = await fetch("https://ipapi.co/json/");
    //const res = await fetch("https://ipwho.is/");
    const res = await fetch("https://api.ipify.org?format=json");
    const json = await res.json();
    return json.ip;
  } catch (err) {
    console.warn("IP-haku epäonnistui:", err);
    return "0.0.0.0"; // Varajärjestely, jotta koodi ei kaadu
  }
}


async function trackPageView() {
  const ip = await getIP(); 
  console.log(`Tallennetaan katselu sivulle: (IP: ${ip})`);
  const userAgent = navigator.userAgent; // 👈 tämä riviltä saadaan userAgent

  console.log("IP:", ip);
  console.log("User-Agent:", userAgent);

  await supabase.from("page_views").insert([
    {
      ip: ip,
      user_agent: userAgent
    }
  ]);
}

async function loadPageViewCount() {
  const { count, error } = await supabase
    .from("page_views")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Sivulaskurin lataus epäonnistui:", error.message);
    return;
  }

  document.getElementById("overall-page-counter").textContent =
    `🧭 Sivua ladattu yhteensä ${count} kertaa`;
}

async function trackImageView(filename) {
  try {
    const ip = await getIP(); 
    console.log(`Tallennetaan katselu kuvalle: ${filename} (IP: ${ip})`);
    const userAgent = navigator.userAgent;
    await supabase.from("view_events").insert([
      {
        image_filename: filename,
        ip: ip,
        user_agent: userAgent
      }
    ]);

    console.log(`👁️ Kuvan katselu tallennettu: ${filename}`);
  } catch (error) {
    console.error("🚨 Kuvan katselun tallennus epäonnistui:", error.message);
  }
}

document.addEventListener('keydown', (e) => {
      //console.log(`keydown: ${e}`);  
      const active = document.activeElement;
      const isTyping = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA';

      if (viewer.classList.contains('hidden') || isTyping) return;

      //console.log(`keydown2`);  
      if (e.key === 'ArrowRight') next.click();
      if (e.key === 'ArrowLeft') prev.click();
      if (e.key === 'Escape') {
        console.log(`keydown3`);
        close.click();
      }
});

toggleBtn.onclick = () => {
  isExifVisible = !isExifVisible;
  if (isExifVisible) {
    exifBox.classList.remove("hidden");
    toggleBtn.textContent = "Piilota Exif";
  } else {
    exifBox.classList.add("hidden");
    toggleBtn.textContent = "Näytä Exif";
  }
};

function openViewer(imageSrc, imgData) {
    document.body.style.overflow = "hidden";
    viewer.classList.remove("hidden");
    full.src = imageSrc;
    desc.textContent = imgData.description || "";
    //console.log("openViewer imgData sisältö:", imgData);
    document.getElementById("image-title").textContent = imgData.title;

    if (isExifVisible) {
      exifBox.classList.remove("hidden");
      toggleBtn.textContent = "Piilota Exif";
    } else {
      exifBox.classList.add("hidden");
      toggleBtn.textContent = "Näytä Exif";
    }
    
    //console.log("Exif-listan sisältö:", document.getElementById("exif-list").innerHTML);
       
    //const haku_fn = encodeURIComponent(imgData.filename);
    //const haku_fn = decodeURIComponent(imgData.filename);
    const haku_fn = imgData.filename;
    console.log("openViewer loadCommentsForImage : ", imgData.filename);
    console.log("loadCommentsForImage haku nimellä:", haku_fn);
    loadCommentsForImage(haku_fn);
    trackImageView(imgData.filename);
    incrementAndShowViewCount(imgData.filename);
     
    const textarea = document.getElementById("comment");
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    
}


next.onclick = () => {
  // tänne koodi seuraavan kuvan näyttämiseen
  console.log(`next.onclick`);
  if (currentIndex < currentList.length - 1) {
    currentIndex++;
    const nextImg = currentList[currentIndex];
    openViewer(`img/${nextImg.filename}`, nextImg);
    loadExifFromImage(`img/${nextImg.filename}`);
  }
};

prev.onclick = () => {
  // tänne koodi edellisen kuvan näyttämiseen
  console.log(`prev.onclick`);
  if (currentIndex > 0) {
    currentIndex--;
    const prevImg = currentList[currentIndex];
    openViewer(`img/${prevImg.filename}`, prevImg);
    loadExifFromImage(`img/${prevImg.filename}`);
  }
};

