
class HomeProductsLoader {

  constructor(){
    document.addEventListener("DOMContentLoaded", async () => {
      // Wait for pocketbase to be available
      if (!window.pb) {
        console.log("Waiting for PocketBase...");
        setTimeout(() => this.init(), 500);
      } else {
        this.init();
      }
    });
  }

  async init() {
    try {
      this.products = await this.getProductsFromDB();
      console.log("Products loaded:", this.products.length);
      console.log("Best selling products:", this.products.filter(p => p.bestSelling));
      console.log("Flash sale products:", this.products.filter(p => p.flashSale));
      
      this.loadFlashSales();
      this.loadBestSelling();
      this.loadOurProducts();
      this.loadCategories();
    } catch (err) {
      console.error("Error initializing HomeProductsLoader:", err);
    }
  }

  /* ---------------- FETCH FROM POCKETBASE ---------------- */
  async getProductsFromDB() {
    try {
      const result = await window.pb.collection("exclusive_ecommerce").getFullList({
        sort: '-created',
        $autoCancel: false
      });
      
      console.log("Fetched products from DB:", result.length);
      return result.map(p => this.formatPBProduct(p));
    } catch (err) {
      console.error("Error fetching products:", err);
      return [];
    }
  }

  /* ---------------- FORMAT DATA ---------------- */
  formatPBProduct(p) {
    let imageUrl = p.image;
    
    // Handle PocketBase file URLs
    if (imageUrl && typeof imageUrl === 'string') {
      if (imageUrl.startsWith('/')) {
        imageUrl = window.pb.files.getURL(p, imageUrl);
      }
    } else if (imageUrl && Array.isArray(imageUrl) && imageUrl.length > 0) {
      imageUrl = window.pb.files.getURL(p, imageUrl[0]);
    }
    
    // Fallback to placeholder
    if (!imageUrl || imageUrl === '') {
      imageUrl = '/images/placeholder.jpg';
    }

    return {
      id: p.id,
      name: p.name || "Product",
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
      oldPrice: p.oldPrice ? (typeof p.oldPrice === 'number' ? p.oldPrice : parseFloat(p.oldPrice)) : null,
      category: p.category || "Uncategorized",
      img: imageUrl,
      rating: p.rating || 4,
      reviews: p.reviews || 0,
      flashSale: p.flashSale === true || p.flashSale === "true",
      bestSelling: p.bestSelling === true || p.bestSelling === "true",
      tag: p.flashSale ? "-SALE" : (p.newArrival ? "NEW" : "")
    };
  }

  /* ---------------- FLASH SALES ---------------- */
  loadFlashSales() {
    const container = document.querySelector(".first-product-scroll .scroller");
    if (!container) {
      console.warn("Flash sales container not found");
      return;
    }
    
    const flashProducts = this.products.filter(p => p.flashSale === true);
    console.log("Flash products count:", flashProducts.length);
    
    if (flashProducts.length === 0) {
      container.innerHTML = '<p class="no-products">No flash sale products available</p>';
      return;
    }
    
    container.innerHTML = flashProducts.map(p => this.productCard(p)).join("");
    this.renderIcons();
  }

  /* ---------------- BEST SELLING - FIXED ---------------- */
  loadBestSelling() {
    // Try multiple possible selectors
    let container = document.querySelector(".best-product-scroll .scroller");
    
    // If not found, try the specific class
    if (!container) {
      container = document.querySelector(".best-selling-container");
    }
    
    // If still not found, try the general scroller inside best-product-scroll
    if (!container) {
      const bestScroll = document.querySelector(".best-product-scroll");
      if (bestScroll) {
        container = bestScroll.querySelector(".scroller");
      }
    }
    
    if (!container) {
      console.warn("Best selling container not found. Selector tried: .best-product-scroll .scroller, .best-selling-container");
      return;
    }
    
    const bestProducts = this.products.filter(p => p.bestSelling === true);
    console.log("Best selling products count:", bestProducts.length);
    
    if (bestProducts.length === 0) {
      container.innerHTML = '<p class="no-products">No best selling products available</p>';
      return;
    }
    
    container.innerHTML = bestProducts.map(p => this.productCard(p)).join("");
    this.renderIcons();
  }

  /* ---------------- OUR PRODUCTS ---------------- */
  loadOurProducts() {
    const containers = document.querySelectorAll(".our-products .scroller");
    
    if (containers.length < 2) {
      console.warn("Our products containers not found, found:", containers.length);
      return;
    }
    
    const all = this.products;
    
    // Display first 3 products in first container
    containers[0].innerHTML = all.slice(0, 3).map(p => this.productCard(p)).join("");
    
    // Display next 3 products in second container
    containers[1].innerHTML = all.slice(3, 6).map(p => this.productCard(p)).join("");
    
    this.renderIcons();
  }

  /* ---------------- CATEGORIES ---------------- */
  loadCategories() {
    const container = document.querySelector(".category-tabs");
    if (!container) {
      console.warn("Categories container not found");
      return;
    }

    const categories = [
      { name: "Phones", icon: "smartphone" },
      { name: "Computers", icon: "monitor" },
      { name: "SmartWatch", icon: "watch" },
      { name: "Headphones", icon: "headphones" },
      { name: "Gaming", icon: "gamepad-2" },
      { name: "Cameras", icon: "camera" },
      { name: "Fashion", icon: "shirt" },
      { name: "Furniture", icon: "armchair" }
    ];

    container.innerHTML = categories.map(cat => `
      <a href="product-category.html?category=${encodeURIComponent(cat.name)}" class="category-tab">
        <i data-lucide="${cat.icon}" class="cat-icon"></i>
        <p>${cat.name}</p>
      </a>
    `).join("");

    this.renderIcons();
  }

  /* ---------------- PRODUCT CARD ---------------- */
  productCard(product) {
    const oldPrice = product.oldPrice ? formatPrice(product.oldPrice) : "";
    const tag = product.tag ? `<span class="scroll-tag">${product.tag}</span>` : "";
    
    // Safely check wishlist status
    const isWishlisted = window.wishlistSystem ? 
      window.wishlistSystem.isWishlisted(product.id) : false;
    
    const isViewed = window.viewedSystem ? 
      window.viewedSystem.isViewed(product.id) : false;

    return `
      <div class="scroll" data-product-id="${product.id}">
        <div class="scroll-img-section">
          <a href="product-details.html?id=${product.id}">
            <img src="${product.img}" alt="${product.name}" onerror="this.src='/images/placeholder.jpg'">
          </a>
          ${tag}
          <div class="scroll-icon">
            <span class="heart-icon" data-id="${product.id}">
              <i data-lucide="heart" class="${isWishlisted ? 'filled' : ''}"></i>
            </span>
            <span class="eye-icon" data-id="${product.id}">
              <i data-lucide="eye" class="${isViewed ? 'viewed' : ''}"></i>
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
              ${this.stars(product.rating)}
              <span>(${product.reviews})</span>
            </div>
          </div>
        </a>
      </div>
    `;
  }

  /* ---------------- STAR RATING ---------------- */
  stars(rating) {
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

  /* ---------------- ICON RENDER ---------------- */
  renderIcons() {
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Wait for pocketbase
  const checkPB = setInterval(() => {
    if (window.pb) {
      clearInterval(checkPB);
      new HomeProductsLoader();
    }
  }, 100);
  
  // Timeout after 3 seconds
  setTimeout(() => {
    clearInterval(checkPB);
    if (!window.pb) {
      console.warn("PocketBase not loaded, using local products");
      window.pb = { collection: () => ({ getFullList: async () => [] }) };
      new HomeProductsLoader();
    }
  }, 3000);
});

new HomeProductsLoader();