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
      keys: ["title", "description"],   // Hakee sekä otsikosta että kuvauksesta
      threshold: 0.4,                   // Hyvä epätarkkuusraja (0 = tarkka, 1 = kaikki kelpaa)
      ignoreLocation: true,            // Ei väliä missä kohtaa sana on
      minMatchCharLength: 2            // Vähintään 2 kirjainta osumaan
    });


    function render(list) {
      results.innerHTML = "";
      list.forEach((img) => {
        const li = document.createElement("li");
        li.innerHTML = `<img src="img/${img.filename}" alt="${img.title}" title="${img.title}" />`;
        li.onclick = () => {
          full.src = `img/${img.filename}`;
          desc.textContent = img.description || " ";
          viewer.classList.remove("hidden");
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
          if (text) {
            // Lähetetään kommentti palvelimelle
            fetch("/api/comments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                filename: full.src.split("/").pop(), // kuva johon kommentti liittyy
                comment: text
              })
            })
            .then(res => {
              if (!res.ok) throw new Error("Virhe palvelimella");
              return res.json();
            })
            .then(data => {
              alert("Kommentti lähetetty!");
              comment.value = "";
              console.log("Tallennettu:", data);
            })
            .catch(err => {
              console.error(err);
              alert("Tallennus epäonnistui ??");
            });
          }
        };

  });
