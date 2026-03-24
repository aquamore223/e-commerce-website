document.addEventListener("DOMContentLoaded", () => {
  loadCategoryProducts();

  // ensure wishlist count shows correctly on load
  if (window.wishlistSystem?.updateCount) {
    wishlistSystem.updateCount();
  }
});

/* ---------------- LOAD CATEGORY PRODUCTS ---------------- */
async function loadCategoryProducts() {

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

  try {
    // 🔥 USE GLOBAL PB + CORRECT COLLECTION
    const result = await window.pb
      .collection("exclusive_ecommerce")
      .getFullList();

    // 🔥 FORMAT + FILTER
    const filtered = result
      .map(p => formatPBProduct(p))
      .filter(p => p.category?.toLowerCase() === category.toLowerCase())

    if (filtered.length === 0) {
      container.innerHTML = "<p>No products found</p>";
      return;
    }

    // 🔥 RENDER
    container.innerHTML = filtered
      .map(p => productCard(p))
      .join("");

    if (window.lucide) lucide.createIcons();
    applyIconStates();

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading products</p>";
  }
}

/* ---------------- PRODUCT CARD ---------------- */

function formatPBProduct(p){

  let imageUrl = p.image;

  // handle array
  if (Array.isArray(imageUrl)) {
    imageUrl = imageUrl[0];
  }

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice,
    category: p.category,
    img: imageUrl, // 👈 IMPORTANT
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    tag: p.flashSale ? "-SALE" : ""
  };
}

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