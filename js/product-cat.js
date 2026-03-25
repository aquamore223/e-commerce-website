document.addEventListener("DOMContentLoaded", () => {
  loadCategoryProducts();
  
  // ensure wishlist count shows correctly on load
  if (window.wishlistSystem?.updateCount) {
    wishlistSystem.updateCount();
  }
});

// Pagination variables
let currentPage = 1;
let itemsPerPage = 12;
let allFilteredProducts = [];

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
    // Fetch products from PocketBase
    const result = await window.pb
      .collection("exclusive_ecommerce")
      .getFullList({
        sort: '-created',
        $autoCancel: false
      });

    // Format and filter products
    allFilteredProducts = result
      .map(p => formatPBProduct(p))
      .filter(p => p.category?.toLowerCase() === category.toLowerCase());

    if (allFilteredProducts.length === 0) {
      container.innerHTML = "<p>No products found</p>";
      document.getElementById("pagination").style.display = "none";
      return;
    }

    // Render first page
    renderProductsPage();
    setupPagination();

    if (window.lucide) lucide.createIcons();
    applyIconStates();

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading products</p>";
  }
}

/* ---------------- RENDER PRODUCTS FOR CURRENT PAGE ---------------- */
function renderProductsPage() {
  const container = document.querySelector(".products-container");
  if (!container) return;

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageProducts = allFilteredProducts.slice(start, end);

  if (pageProducts.length === 0) {
    container.innerHTML = "<p>No products found</p>";
    return;
  }

  container.innerHTML = pageProducts
    .map(p => productCard(p))
    .join("");

  if (window.lucide) lucide.createIcons();
  applyIconStates();
}

/* ---------------- SETUP PAGINATION CONTROLS ---------------- */
function setupPagination() {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) return;

  const totalPages = Math.ceil(allFilteredProducts.length / itemsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.style.display = "flex";
  paginationContainer.style.justifyContent = "center";
  paginationContainer.style.alignItems = "center";
  paginationContainer.style.gap = "10px";
  paginationContainer.style.marginTop = "40px";
  paginationContainer.style.marginBottom = "40px";

  let paginationHTML = `
    <button class="page-btn prev-page" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i> Previous
    </button>
  `;

  // Page numbers
  paginationHTML += '<div class="page-numbers">';
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
        <button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
  } else {
    // First page
    paginationHTML += `
      <button class="page-number ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>
    `;
    
    if (currentPage > 3) {
      paginationHTML += '<span class="page-ellipsis">...</span>';
    }
    
    // Pages around current
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      paginationHTML += `
        <button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
    
    if (currentPage < totalPages - 2) {
      paginationHTML += '<span class="page-ellipsis">...</span>';
    }
    
    // Last page
    paginationHTML += `
      <button class="page-number ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">
        ${totalPages}
      </button>
    `;
  }
  
  paginationHTML += '</div>';
  
  paginationHTML += `
    <button class="page-btn next-page" ${currentPage === totalPages ? 'disabled' : ''}>
      Next <i class="fas fa-chevron-right"></i>
    </button>
    
    <div class="per-page-selector">
      <label>Show:</label>
      <select class="per-page-select">
        <option value="12" ${itemsPerPage === 12 ? 'selected' : ''}>12</option>
        <option value="24" ${itemsPerPage === 24 ? 'selected' : ''}>24</option>
        <option value="48" ${itemsPerPage === 48 ? 'selected' : ''}>48</option>
        <option value="96" ${itemsPerPage === 96 ? 'selected' : ''}>96</option>
      </select>
      <span>per page</span>
    </div>
    
    <div class="pagination-info">
      Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, allFilteredProducts.length)} of ${allFilteredProducts.length} items
    </div>
  `;
  
  paginationContainer.innerHTML = paginationHTML;
  
  // Add event listeners
  attachPaginationEvents(totalPages);
}

/* ---------------- ATTACH PAGINATION EVENT LISTENERS ---------------- */
function attachPaginationEvents(totalPages) {
  // Previous button
  const prevBtn = document.querySelector(".prev-page");
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProductsPage();
        setupPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  }
  
  // Next button
  const nextBtn = document.querySelector(".next-page");
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProductsPage();
        setupPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  }
  
  // Page number buttons
  const pageNumbers = document.querySelectorAll(".page-number");
  pageNumbers.forEach(btn => {
    btn.onclick = () => {
      const page = parseInt(btn.dataset.page);
      if (page && page !== currentPage) {
        currentPage = page;
        renderProductsPage();
        setupPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  });
  
  // Per page selector
  const perPageSelect = document.querySelector(".per-page-select");
  if (perPageSelect) {
    perPageSelect.onchange = (e) => {
      itemsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderProductsPage();
      setupPagination();
    };
  }
}

/* ---------------- PRODUCT CARD ---------------- */
function formatPBProduct(p) {
  let imageUrl = p.image;

  // handle array
  if (Array.isArray(imageUrl)) {
    imageUrl = imageUrl[0];
  }
  
  // Handle PocketBase file URLs
  if (imageUrl && typeof imageUrl === 'string') {
    if (imageUrl.startsWith('/')) {
      imageUrl = window.pb.files.getURL(p, imageUrl);
    }
  }
  
  // Fallback to placeholder
  if (!imageUrl || imageUrl === '') {
    imageUrl = '/images/placeholder.jpg';
  }

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice,
    category: p.category,
    img: imageUrl,
    rating: p.rating || 4,
    reviews: p.reviews || 0,
    flashSale: p.flashSale === true || p.flashSale === "true",
    bestSelling: p.bestSelling === true || p.bestSelling === "true"
  };
}

function getTag(product) {
  if (product.flashSale) return "-10%";
  if (product.bestSelling) return "NEW";
  return "";
}

function productCard(product) {
  const oldPrice = product.oldPrice ? formatPrice(product.oldPrice) : "";
  const tag = getTag(product);

  return `
  <div class="scroll" data-product-id="${product.id}">
    <div class="scroll-img-section">
      <a href="product-details.html?id=${product.id}">
        <img src="${product.img}" alt="${product.name}" onerror="this.src='/images/placeholder.jpg'">
      </a>
      ${tag ? `<span class="scroll-tag ${product.flashSale ? 'flash-tag' : 'best-tag'}">${tag}</span>` : ""}
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
          ${oldPrice ? `<span>${oldPrice}</span>` : ''}
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
  const starRating = rating || 4;

  for (let i = 1; i <= 5; i++) {
    if (i <= starRating) {
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

// Export for debugging
window.productCategory = {
  reload: loadCategoryProducts,
  goToPage: (page) => {
    currentPage = page;
    renderProductsPage();
    setupPagination();
  }
};