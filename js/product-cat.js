document.addEventListener("DOMContentLoaded", () => {
  loadCategoryProducts();
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

  // 🔥 re-render lucide icons
  if (window.lucide) lucide.createIcons();
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
          <i data-lucide="heart" class="${wishlistSystem?.isWishlisted?.(product.id) ? 'filled' : ''}"></i>
        </span>

        <span class="eye-icon" data-id="${product.id}">
          <i data-lucide="eye" class="${viewedSystem?.isViewed?.(product.id) ? 'viewed' : ''}"></i>
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

/* ---------------- GLOBAL CLICK LISTENER ---------------- */

document.addEventListener("click", (e) => {

  // ❤️ Wishlist
  const heart = e.target.closest(".heart-icon");
  if (heart) {
    const id = heart.dataset.id;

    if (window.wishlistSystem?.toggle) {
      wishlistSystem.toggle(id);
    }

    const icon = heart.querySelector("i");
    if (icon && window.wishlistSystem?.isWishlisted) {
      icon.classList.toggle("filled", wishlistSystem.isWishlisted(id));
    }
  }

  // 👁 Viewed
  const eye = e.target.closest(".eye-icon");
  if (eye) {
    const id = eye.dataset.id;

    if (window.viewedSystem?.markViewed) {
      viewedSystem.markViewed(id);
    }

    const icon = eye.querySelector("i");
    if (icon) icon.classList.add("viewed");
  }

  // 🛒 Cart
  const btn = e.target.closest(".add-to-cart-btn");
  if (btn) {
    const id = btn.dataset.id;

    if (typeof addToCart === "function") {
      addToCart(id);
    } else {
      console.warn("addToCart() not found");
    }
  }

});