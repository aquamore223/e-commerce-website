class HomeProductsLoader {

  constructor() {
    document.addEventListener("DOMContentLoaded", async () => {
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
      
      // Log product counts
      const flashCount = this.products.filter(p => p.flashSale).length;
      const bestCount = this.products.filter(p => p.bestSelling).length;
      console.log(`Flash sale products: ${flashCount}, Best selling products: ${bestCount}`);
      
      // EXPOSE GLOBALLY FOR SEARCH
      window.allProducts = this.products;
      window.homeProductsLoader = this;
      
      this.loadFlashSales();
      this.loadBestSelling();
      this.loadOurProducts();
      this.loadCategories();
      
      // Setup scroll arrows after products are loaded
      setTimeout(() => {
        this.setupScrollArrows();
      }, 200);
    } catch (err) {
      console.error("Error initializing HomeProductsLoader:", err);
    }

     try {
      this.products = await this.getProductsFromDB();
      console.log("Products loaded:", this.products.length);
      
      // Log product counts
      const flashCount = this.products.filter(p => p.flashSale).length;
      const bestCount = this.products.filter(p => p.bestSelling).length;
      console.log(`Flash sale products: ${flashCount}, Best selling products: ${bestCount}`);
      
      // EXPOSE GLOBALLY FOR SEARCH
      window.allProducts = this.products;
      window.homeProductsLoader = this;
      
      this.loadFlashSales();
      this.loadBestSelling();
      this.loadOurProducts();
      this.loadCategories();
      
      // 🔥 ADD THIS LINE - Load featured products
      await this.loadFeaturedProducts();
      
      // Setup scroll arrows after products are loaded
      setTimeout(() => {
        this.setupScrollArrows();
      }, 200);
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
    
    if (imageUrl && typeof imageUrl === 'string') {
      if (imageUrl.startsWith('/')) {
        imageUrl = window.pb.files.getURL(p, imageUrl);
      }
    } else if (imageUrl && Array.isArray(imageUrl) && imageUrl.length > 0) {
      imageUrl = window.pb.files.getURL(p, imageUrl[0]);
    }
    
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
      bestSelling: p.bestSelling === true || p.bestSelling === "true"
    };
  }

  /* ---------------- GET TAG ---------------- */
  getTag(product) {
    if (product.flashSale) return "-10%";
    if (product.bestSelling) return "NEW";
    return "";
  }

  /* ---------------- FLASH SALES ---------------- */
  loadFlashSales() {
    const container = document.querySelector(".first-product-scroll .scroller");
    if (!container) return;
    
    const flashProducts = this.products.filter(p => p.flashSale === true);
    console.log("Flash products count:", flashProducts.length);
    
    if (flashProducts.length === 0) {
      container.innerHTML = '<p class="no-products">No flash sale products available</p>';
      return;
    }
    
    container.innerHTML = flashProducts.map(p => this.productCard(p)).join("");
    this.renderIcons();
  }

  /* ---------------- BEST SELLING ---------------- */
  loadBestSelling() {
    let container = document.querySelector(".best-product-scroll .scroller");
    
    if (!container) {
      const bestScroll = document.querySelector(".best-product-scroll");
      if (bestScroll) {
        container = bestScroll.querySelector(".scroller");
      }
    }
    
    if (!container) return;
    
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
    
    containers[0].innerHTML = all.slice(0, 6).map(p => this.productCard(p)).join("");
    containers[1].innerHTML = all.slice(6, 12).map(p => this.productCard(p)).join("");
    
    this.renderIcons();
  }

  /* ---------------- SETUP SCROLL ARROWS ---------------- */
  setupScrollArrows() {
    // Flash Sales Arrows
    this.setupSectionArrows(
      ".first-product-scroll",
      ".first-product-scroll .scroller"
    );
    
    // Best Selling Arrows
    this.setupSectionArrows(
      ".best-product-scroll",
      ".best-product-scroll .scroller"
    );
    
    // Our Products - First container
    this.setupSectionArrows(
      ".our-products",
      ".our-products .scroller:first-child"
    );
  }
  
  setupSectionArrows(sectionSelector, scrollerSelector) {
    const section = document.querySelector(sectionSelector);
    if (!section) return;
    
    const scroller = document.querySelector(scrollerSelector);
    if (!scroller) return;
    
    // Find arrows in the same section or nearby
    let arrows = [];
    
    // Check if this is flash sales or best selling
    if (sectionSelector.includes('first-product')) {
      const flashSection = document.querySelector('#first-content');
      if (flashSection) {
        arrows = flashSection.querySelectorAll('.arrow .roundArrow');
      }
    } else if (sectionSelector.includes('best-product')) {
      // Find the category section's arrows (best selling is inside category div)
      const categorySection = document.querySelector('.category');
      if (categorySection) {
        const bestHeader = categorySection.querySelector('.grid-top-designs');
        if (bestHeader) {
          arrows = bestHeader.querySelectorAll('.arrow .roundArrow');
        }
      }
    } else if (sectionSelector.includes('our-products')) {
      // Find the our products section header
      const ourHeader = document.querySelector('#top-marg');
      if (ourHeader) {
        arrows = ourHeader.querySelectorAll('.arrow .roundArrow');
      }
    }
    
    if (!arrows || arrows.length < 2) {
      console.warn(`Arrows not found for ${sectionSelector}`);
      return;
    }
    
    const leftArrow = arrows[0];
    const rightArrow = arrows[1];
    
    // Scroll amount (3 products at a time)
    const firstProduct = scroller.querySelector('.scroll');
    if (!firstProduct) return;
    
    const productWidth = firstProduct.offsetWidth;
    const gap = 20;
    const scrollAmount = (productWidth + gap) * 3; // Scroll 3 products at a time
    
    // Remove existing listeners
    const newLeftArrow = leftArrow.cloneNode(true);
    const newRightArrow = rightArrow.cloneNode(true);
    leftArrow.parentNode.replaceChild(newLeftArrow, leftArrow);
    rightArrow.parentNode.replaceChild(newRightArrow, rightArrow);
    
    // Add click handlers
    newLeftArrow.onclick = (e) => {
      e.preventDefault();
      scroller.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    };
    
    newRightArrow.onclick = (e) => {
      e.preventDefault();
      scroller.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    };
    
    console.log(`✅ Scroll arrows set up for ${sectionSelector}`);
  }

    /* ---------------- FEATURED/NEW ARRIVAL SECTION ---------------- */
  async loadFeaturedProducts() {
    const container = document.querySelector(".hero3-grid");
    if (!container) return;

    // Get products sorted by created date (newest first)
    const sortedProducts = [...this.products].sort((a, b) => {
      // If products have created date, use it
      if (a.created && b.created) {
        return new Date(b.created) - new Date(a.created);
      }
      return 0;
    });

    // Take the 4 newest products
    const featuredProducts = sortedProducts.slice(0, 4);
    
    if (featuredProducts.length === 0) {
      console.warn("No products available for featured section");
      return;
    }
    
    this.renderFeaturedGrid(container, featuredProducts);
  }

  /* ---------------- RENDER FEATURED GRID ---------------- */
  renderFeaturedGrid(container, products) {
    // Ensure we have exactly 4 products (fill with placeholders if needed)
    const filledProducts = [...products];
    while (filledProducts.length < 4) {
      filledProducts.push({
        id: null,
        name: "Coming Soon",
        category: "New Arrival",
        img: "/images/placeholder.jpg",
        description: "New products arriving soon!",
        price: 0
      });
    }
    
    // Map products to grid positions
    const gridItems = [
      { position: "hero3-grid-pic1", size: "large", product: filledProducts[0] },
      { position: "hero3-grid-pic2", size: "medium", product: filledProducts[1] },
      { position: "hero3-grid-pic3", size: "small", product: filledProducts[2] },
      { position: "hero3-grid-pic4", size: "small", product: filledProducts[3] }
    ];
    
    container.innerHTML = gridItems.map(item => `
      <div class="${item.position}" id="hero3-grid-pic">
        <img src="${item.product.img}" alt="${item.product.name}" onerror="this.src='/images/placeholder.jpg'">
        <div class="hero3-layout">
          <h3>${this.escapeHtml(item.product.name)}</h3>
          <p>${item.product.description || this.getCategoryDescription(item.product.category)}</p>
          ${item.product.id ? `<a href="product-details.html?id=${item.product.id}"><span class="SN">Shop Now</span></a>` : '<span class="SN">Coming Soon</span>'}
        </div>
      </div>
    `).join("");
    
    this.renderIcons();
  }

  /* ---------------- GET CATEGORY DESCRIPTION ---------------- */
  getCategoryDescription(category) {
    const descriptions = {
      "Phones": "Latest smartphone with cutting-edge features",
      "Computers": "Powerful computing for work and play",
      "SmartWatch": "Track your fitness and stay connected",
      "Headphones": "Immersive audio experience",
      "Gaming": "Ultimate gaming gear for enthusiasts",
      "Cameras": "Capture every moment in stunning detail",
      "Fashion": "Trendy styles for every occasion",
      "Furniture": "Modern designs for your home",
      "Electronics": "Latest tech innovations",
      "default": "Discover our newest collection"
    };
    return descriptions[category] || descriptions.default;
  }

  /* ---------------- ESCAPE HTML ---------------- */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------- CATEGORIES ---------------- */
  loadCategories() {
    const container = document.querySelector(".category-tabs");
    if (!container) return;

    const categories = [
      { name: "Phones", icon: "smartphone" },
      { name: "Computers", icon: "monitor" },
      { name: "SmartWatch", icon: "watch" },
      { name: "Headphones", icon: "headphones" },
      { name: "Gaming", icon: "gamepad-2" },
      { name: "Cameras", icon: "camera" },
      { name: "Fashion", icon: "shirt" },
      { name: "Furniture", icon: "armchair" },
      { name: "Sports&Outdoors", icon: "dumbbell" },
      { name: "Home&Lifestyle", icon: "home" },
      { name: "Medicine", icon: "pill" },
      { name: "Baby's&Toys", icon: "baby" },
      { name: "Groceries&Pets", icon: "shopping-cart" },
      { name: "Health&Beauty", icon: "heart" },
      { name: "Electronics", icon: "cpu" }

    ];

    container.innerHTML = categories.map(cat => `
      <a href="product-category.html?category=${encodeURIComponent(cat.name)}" class="category-tab">
        <i data-lucide="${cat.icon}" class="cat-icon"></i>
        <p>${cat.name}</p>
      </a>
    `).join("");

    this.renderIcons();
    this.setupCategoryScroll();
  }
  
  /* ---------------- CATEGORY SCROLL ---------------- */
  setupCategoryScroll() {
    const categorySection = document.querySelector(".category");
    if (!categorySection) return;
    
    const arrows = categorySection.querySelectorAll(".arrow .roundArrow");
    const categoryTabs = document.querySelector(".category-tabs");
    
    if (!arrows.length || !categoryTabs) return;
    
    const scrollAmount = 200;
    
    // Remove existing listeners
    const newLeftArrow = arrows[0].cloneNode(true);
    const newRightArrow = arrows[1].cloneNode(true);
    arrows[0].parentNode.replaceChild(newLeftArrow, arrows[0]);
    arrows[1].parentNode.replaceChild(newRightArrow, arrows[1]);
    
    newLeftArrow.onclick = (e) => {
      e.preventDefault();
      categoryTabs.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    };
    
    newRightArrow.onclick = (e) => {
      e.preventDefault();
      categoryTabs.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };
  }

  /* ---------------- PRODUCT CARD ---------------- */
  productCard(product) {
    const oldPrice = product.oldPrice ? formatPrice(product.oldPrice) : "";
    const tag = this.getTag(product);
    
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
          ${tag ? `<span class="scroll-tag ${product.flashSale ? 'flash-tag' : 'best-tag'}">${tag}</span>` : ""}
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
  const checkPB = setInterval(() => {
    if (window.pb) {
      clearInterval(checkPB);
      new HomeProductsLoader();
    }
  }, 100);
  
  setTimeout(() => {
    clearInterval(checkPB);
    if (!window.pb) {
      console.warn("PocketBase not loaded");
      window.pb = { collection: () => ({ getFullList: async () => [] }) };
      new HomeProductsLoader();
    }
  }, 3000);
});

new HomeProductsLoader();