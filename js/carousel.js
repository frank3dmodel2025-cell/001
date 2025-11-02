export class Carousel {
  constructor(rootEl, prevBtn, nextBtn, onSelect) {
    this.root = rootEl;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.onSelect = onSelect;
    this.items = [];
    this.activeIndex = 0;

    this.prevBtn.addEventListener("click", () => this.scrollBy(-1));
    this.nextBtn.addEventListener("click", () => this.scrollBy(1));
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") this.scrollBy(1);
      if (e.key === "ArrowLeft") this.scrollBy(-1);
    });
  }

  setItems(items) {
    this.items = items.slice();
    this.root.innerHTML = "";
    this.items.forEach((item, idx) => {
      const card = document.createElement("button");
      card.className = "card";
      card.setAttribute("aria-label", item.name);
      card.innerHTML = `
        <div class="thumb">${item.thumb ? `<img alt="" src="${item.thumb}" style="max-width:100%;max-height:100%;object-fit:contain" />` : `${item.ext.toUpperCase()}`}</div>
        <h3>${item.name}</h3>
        <p>${item.ext.toUpperCase()} • ${item.size || ""}</p>
      `;
      card.addEventListener("click", () => this.select(idx));
      this.root.appendChild(card);
    });
    this.select(0);
  }

  select(index) {
    this.activeIndex = index;
    [...this.root.children].forEach((el, i) => el.classList.toggle("active", i === index));
    const it = this.items[index];
    this.onSelect?.(it, index);
    const child = this.root.children[index];
    child?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }

  scrollBy(dir) {
    const next = Math.max(0, Math.min(this.items.length - 1, this.activeIndex + dir));
    this.select(next);
  }
}