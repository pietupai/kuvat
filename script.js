const search = document.getElementById("search");
const results = document.getElementById("results");
const viewer = document.getElementById("viewer");
const full = document.getElementById("full");
const desc = document.getElementById("desc");
const close = document.getElementById("close");
const comment = document.getElementById("comment");
const send = document.getElementById("send");

fetch("images.json")
  .then((res) => res.json())
  .then((data) => {
    const sorted = data.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
    const fuse = new Fuse(sorted, {
      keys: ["title", "description"],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2
    });

    function render(list) {
      results.innerHTML = "";
      list.forEach((img) => {
        const li = document.createElement("li");
        console.log("🧠 Kuvadata:", img);
        console.log("🔗 Kuvapolku:", `img/${img.filename}`);
        li.innerHTML = `<img src="img/${img.filename}" alt="${img.title}" title="${img.title}" />`;
        li.onclick = () => {
          full.src = `img/${img.filename}`;
          desc.textContent = img.description || " ";
          viewer.classList.remove("hidden");

          console.log("Klikattu kuva:", img.filename);

          // Näytä kommentit tälle kuvalle
          fetch("comments.json")
            .then(res => res.json())
            .then(comments => {
              const filtered = comments.filter(c => c.image === img.filename);
              const commentBox = document.getElementById("comment-list");
              commentBox.innerHTML = "";

              if (filtered.length === 0) {
                commentBox.textContent = "Ei vielä kommentteja tälle kuvalle.";
              } else {
                console.log("Kommentit löytyivät:", filtered);
                filtered.forEach(comment => {
                  console.log("Lisätään kommentti:", comment.message);
                  const p = document.createElement("p");
                  p.textContent = comment.message;
                  commentBox.appendChild(p);
                });
              }
            });
        };
        results.appendChild(li);
      });
    }

    render(sorted);

    search.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      if (!q) return render(sorted);
      const result = fuse.search(q).map(r => r.item);
      render(result);
    });

    close.onclick = () => viewer.classList.add("hidden");

    send.onclick = () => {
      const text = comment.value.trim();
      const filename = full.src.split("/").pop();

      if (!text) return;

      console.log("📤 Lähetetään Formspreen kautta...");

      fetch("https://formspree.io/f/xyzjbkjw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          image: filename,
          timestamp: new Date().toISOString()
        })
      })
        .then(res => {
          if (!res.ok) throw new Error("Lähetys epäonnistui");
          return res.json();
        })
        .then(() => {
          console.log("✅ Kommentti lähetetty sähköpostilla");
          alert("Kommentti lähetetty!");
          comment.value = "";

          // Näytä kommentti heti DOMissa
          const commentBox = document.getElementById("comment-list");
          const p = document.createElement("p");
          p.textContent = text;
          commentBox.appendChild(p);
        })
        .catch(err => {
          console.error("❌ Virhe:", err);
          alert("Lähetys ei onnistunut");
        });
    };
  });
