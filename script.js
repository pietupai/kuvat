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
const supabase = window.supabase.createClient(
  "https://bgesytumrojrmpdgfcyh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZXN5dHVtcm9qcm1wZGdmY3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTgxODUsImV4cCI6MjA2NjY5NDE4NX0.IurDSJe70u4yF_NeYIGlqIt7ablt7SNVhoiMazt77BE"
);
const commentInput = document.getElementById("comment");

console.log(Fuse.version);

document.addEventListener("DOMContentLoaded", () => {
  trackPageView();
  loadPageViewCount();
  loadTotalViews(); 
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
    
    function openViewer(imageSrc, imgData) {
          viewer.classList.remove("hidden");
          full.src = imageSrc;
          desc.textContent = imgData.description || "";

          // Exif-painikkeen toiminta
          document.getElementById("toggle-exif").onclick = () => {
            document.getElementById("exif-list").classList.toggle("hidden");
          };
            
         loadCommentsForImage(imgData.filename);
         trackImageView(imgData.filename);
         incrementAndShowViewCount(imgData.filename);
    }

    function render(list) {
      results.innerHTML = "";
      list.forEach((img) => {
        const li = document.createElement("li");
        li.innerHTML = `<img src="img/${img.filename}" alt="${img.title}" title="${img.title}" />`;
        li.onclick = () => {
          openViewer(`img/${img.filename}`, img);
          loadExifFromImage(`img/${img.filename}`);

          toggleBtn.onclick = () => {
            const visible = exifBox.classList.toggle("hidden");
            toggleBtn.textContent = visible ? "Näytä Exif" : "Piilota Exif";
          };
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

    close.onclick = () => viewer.classList.add("hidden");

    send.onclick = () => {
      const text = comment.value.trim();
      const filename = full.src.split("/img/")[1]; 

      if (!text) return;

      console.log("📤 Lähetetään Supabaseen...");
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
  }
}

// Kommenttien näyttö Supabasesta
async function loadCommentsForImage(filename) {
  console.log("loadCommentsForImage : ", filename);
  console.log("Haku käytettävällä nimellä:", encodePathOnly(filename));
  const { data: comments, error } = await supabase
    .from("comments")
    .select("message")
    .eq("image", encodePathOnly(filename))
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

function encodePathOnly(pathWithFilename) {
  const parts = pathWithFilename.split("/");
  if (parts.length < 2) return encodeURIComponent(pathWithFilename);
  return [encodeURIComponent(parts[0]), ...parts.slice(1)].join("/");
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

async function trackPageView() {
  const res = await fetch("https://ipapi.co/json/");
  const json = await res.json();

  const ip = json.ip;
  const userAgent = navigator.userAgent; // 👈 tämä riviltä saadaan userAgent

  console.log("IP:", ip);
  console.log("User-Agent:", userAgent);

  await supabase.from("page_views").insert([
    {
      ip_address: ip,
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
    const res = await fetch("https://ipapi.co/json/");
    const json = await res.json();
    const ip = json.ip;
    const userAgent = navigator.userAgent;

    await supabase.from("view_events").insert([
      {
        image_filename: filename,
        ip_address: ip,
        user_agent: userAgent
      }
    ]);

    console.log(`👁️ Kuvan katselu tallennettu: ${filename}`);
  } catch (error) {
    console.error("🚨 Kuvan katselun tallennus epäonnistui:", error.message);
  }
}
