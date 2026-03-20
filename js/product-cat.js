document.addEventListener("DOMContentLoaded", () => {
  loadCategoryProducts();

  // ensure wishlist count shows correctly on load
  if (window.wishlistSystem?.updateCount) {
    wishlistSystem.updateCount();
  }
});

/* ---------------- LOAD CATEGORY PRODUCTS ---------------- */

function loadCategoryProducts() {
  const container = document.querySelector(".products-container");
  const title = document.querySelector(".category-title");

  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");

  if (!category) {
    container.innerHTML = "<p>No category selected</p>";
    return;
  }

  if (title) {
    title.textContent = category.toUpperCase();
  }

  const allProducts = Object.values(products);

  const filtered = allProducts.filter(
    (p) => p.category === category
  );

  if (filtered.length === 0) {
    container.innerHTML = "<p>No products found</p>";
    return;
  }

  container.innerHTML = filtered.map(p => productCard(p)).join("");

  // render lucide icons
  if (window.lucide) lucide.createIcons();

  // apply active states after render
  applyIconStates();
}

/* ---------------- PRODUCT CARD ---------------- */

function productCard(product) {
  const oldPrice = product.oldPrice ? formatPrice(product.oldPrice) : "";

  const tag = product.tag
    ? `<span class="scroll-tag">${product.tag}</span>`
    : "";

  return `
  <div class="scroll" data-product-id="${product.id}">

    <div class="scroll-img-section">

      <a href="product-details.html?id=${product.id}">
        <img src="${product.img}" alt="${product.name}">
      </a>

      ${tag}

      <div class="scroll-icon">

        <span class="heart-icon" data-id="${product.id}">
          <i data-lucide="heart"></i>
        </span>

        <span class="eye-icon" data-id="${product.id}">
          <i data-lucide="eye"></i>
        </span>

      </div>

      <button class="add-to-cart-btn" data-id="${product.id}">
        Add To Cart
      </button>

    </div>

    <a href="product-details.html?id=${product.id}">
      <div class="scroll-text">

        <h5>${product.name}</h5>

        <p class="price">
          ${formatPrice(product.price)}
          <span>${oldPrice}</span>
        </p>

        <div class="rating">
          ${stars(product.rating)}
          <span>(${product.reviews || 0})</span>
        </div>

      </div>
    </a>

  </div>
  `;
}

/* ---------------- STAR RATING ---------------- */

function stars(rating = 0) {
  let starHTML = "";

  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      starHTML += `<i data-lucide="star" class="full"></i>`;
    } else {
      starHTML += `<i data-lucide="star" class="empty"></i>`;
    }
  }

  return starHTML;
}

/* ---------------- APPLY ICON STATES ---------------- */

function applyIconStates() {

  // ❤️ wishlist state
  document.querySelectorAll(".heart-icon").forEach((heart) => {
    const id = heart.dataset.id;
    const icon = heart.querySelector("i");

    if (icon && window.wishlistSystem?.isWishlisted(id)) {
      icon.classList.add("filled");
    }
  });

  // 👁 viewed state
  document.querySelectorAll(".scroll").forEach((card) => {
    const id = card.dataset.productId;
    const eyeIcon = card.querySelector(".eye-icon i");

    if (eyeIcon && window.viewedSystem?.isViewed(id)) {
      eyeIcon.classList.add("viewed");
    }
  });
}