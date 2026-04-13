// ==================== CART SYSTEM ====================

class CartSystem {
  constructor() {
    // Load cart from localStorage
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    // Initial update
    this.updateCartCount();
    this.renderCheckout();
    
    // Set up event listeners ONCE
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for cart changes from other tabs/pages
    window.addEventListener('storage', (e) => {
      if (e.key === 'cart') {
        this.cart = JSON.parse(e.newValue) || [];
        this.updateCartCount();
        this.renderCheckout();
      }
    });
    
    // Listen for custom cart update events
    document.addEventListener("cartUpdated", () => {
      this.updateCartCount();
      this.renderCheckout();
    });
    
    // ADD TO CART BUTTONS - Instant feedback
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;
      
      const id = btn.dataset.id;
      if (!id) return;
      
      // INSTANT VISUAL FEEDBACK
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      btn.classList.add("added");
      btn.disabled = true;
      
      const color = btn.dataset.color || null;
      const size = btn.dataset.size || null;
      const qty = parseInt(btn.dataset.qty) || 1;
      
      try {
        if (color || size) {
          await this.addToCartWithDetails({
            id: id,
            color: color,
            size: size,
            qty: qty
          });
        } else {
          await this.addToCart(id);
        }
      } catch (error) {
        console.error("Error adding to cart:", error);
        btn.innerHTML = originalText;
        btn.classList.remove("added");
      } finally {
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove("added");
          btn.disabled = false;
        }, 1000);
      }
    });
    
    // QUANTITY CHANGE
    document.addEventListener("change", (e) => {
      if (!e.target.classList.contains("qty-input")) return;
      
      const row = e.target.closest(".cart-flex");
      if (!row) return;
      
      const id = row.dataset.id;
      const qty = Number(e.target.value);
      
      const item = this.cart.find((p) => p.id == id);
      if (item) {
        item.qty = qty;
        this.saveCart();
        this.renderCheckout();
      }
    });
  }
  
  async addToCart(productId) {
    let product = null;
    
    if (window.pb) {
      try {
        const pbProduct = await window.pb.collection("exclusive_ecommerce").getOne(productId);
        if (pbProduct) {
          product = {
            id: pbProduct.id,
            name: pbProduct.name,
            price: typeof pbProduct.price === 'number' ? pbProduct.price : parseFloat(pbProduct.price) || 0,
            img: this.getProductImage(pbProduct),
            oldPrice: pbProduct.oldPrice
          };
        }
      } catch (error) {
        console.error("Error fetching from PocketBase:", error);
      }
    }
    
    if (!product && typeof products !== 'undefined' && products[productId]) {
      product = products[productId];
    }
    
    if (!product) return;
    
    const existing = this.cart.find((item) => item.id == productId);
    
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({
        id: productId,
        name: product.name,
        price: typeof product.price === 'number' ? product.price : parseFloat(product.price),
        img: product.img,
        qty: 1,
      });
    }
    
    this.saveCart();
    this.renderCheckout();
  }
  
  async addToCartWithDetails(item) {
    if (!item || !item.id) return;
    
    console.log("Adding to cart with details:", item);
    
    let product = item;
    
    if (!item.name || !item.price) {
      if (window.pb) {
        try {
          const pbProduct = await window.pb.collection("exclusive_ecommerce").getOne(item.id);
          if (pbProduct) {
            product = {
              id: pbProduct.id,
              name: pbProduct.name,
              price: typeof pbProduct.price === 'number' ? pbProduct.price : parseFloat(pbProduct.price) || 0,
              img: this.getProductImage(pbProduct),
              oldPrice: pbProduct.oldPrice,
              color: item.color,
              size: item.size,
              qty: item.qty || 1
            };
          }
        } catch (error) {
          console.error("Error fetching product for cart:", error);
          return;
        }
      } else {
        return;
      }
    }
    
    const existing = this.cart.find(cartItem => 
      cartItem.id === product.id && 
      cartItem.color === product.color && 
      cartItem.size === product.size
    );
    
    if (existing) {
      existing.qty += (product.qty || 1);
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.img,
        color: product.color || null,
        size: product.size || null,
        qty: product.qty || 1
      });
    }
    
    this.saveCart();
    this.renderCheckout();
    
    let details = [];
    if (product.color) details.push(product.color);
    if (product.size) details.push(product.size);
    if (product.qty > 1) details.push(`Qty: ${product.qty}`);
    
    const detailsText = details.length ? ` (${details.join(', ')})` : '';
    this.showCartNotification(`${product.name}${detailsText} added to cart!`);
  }
  
  getProductImage(product) {
    if (product.image) {
      if (typeof product.image === 'string') {
        if (product.image.startsWith('http')) {
          return product.image;
        }
        if (window.pb && window.pb.files) {
          return window.pb.files.getURL(product, product.image);
        }
        return product.image;
      } else if (Array.isArray(product.image) && product.image.length > 0) {
        if (window.pb && window.pb.files) {
          return window.pb.files.getURL(product, product.image[0]);
        }
        return product.image[0];
      }
    }
    return '/images/placeholder.jpg';
  }
  
  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    this.updateCartCount();
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
  }
  
  updateCartCount() {
    const count = document.querySelector(".cart-count");
    if (!count) return;
    
    const total = this.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    
    if (total > 0) {
      count.style.display = "flex";
      count.textContent = total > 99 ? "99+" : total;
    } else {
      count.style.display = "none";
    }
  }
  
  forceRefreshCartCount() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.updateCartCount();
    console.log("Cart count force refreshed:", this.cart.reduce((s, i) => s + i.qty, 0));
  }
  
  renderCheckout() {
    const container = document.getElementById("checkout-preview");
    if (!container) return;
    
    if (this.cart.length === 0) {
      container.innerHTML = "<p>Your cart is empty</p>";
      return;
    }
    
    let subtotal = 0;
    
    container.innerHTML = this.cart.map((item) => {
      const itemTotal = item.price * item.qty;
      subtotal += itemTotal;
      
      let details = '';
      if (item.color) details += `<span class="item-color">${item.color}</span>`;
      if (item.size) details += `<span class="item-size">${item.size}</span>`;
      if (details) details = `<span class="item-details"> (${details})</span>`;
      
      return `
        <div class="cart-flex cart-item" data-id="${item.id}" data-color="${item.color || ''}" data-size="${item.size || ''}">
          <div id="cart-pic-section">
            <img src="${item.img}" width="50" onerror="this.src='/images/placeholder.jpg'">
            <p>${item.name}${details} <span class="cart-qty">x${item.qty}</span></p>
          </div>
          <p>$${itemTotal.toFixed(2)}</p>
        </div>
      `;
    }).join("");
    
    container.innerHTML += `
      <div class="undl-fl">
        <p>Subtotal:</p>
        <p>$${subtotal.toFixed(2)}</p>
      </div>
      <div class="undl-fl">
        <p>Shipping:</p>
        <p>Free</p>
      </div>
      <div class="pg-flex-sb">
        <p>Total:</p>
        <p>$${subtotal.toFixed(2)}</p>
      </div>
    `;
  }
  
  showCartNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

/* ---------------- WISHLIST SYSTEM ---------------- */
class WishlistSystem {
  constructor() {
    // Load wishlist from localStorage
    this.items = JSON.parse(localStorage.getItem("wishlist")) || [];
    
    console.log("Wishlist loaded:", this.items.length, "items");
    
    // Update count immediately (same as cart)
    this.updateWishlistCount();
    this.updateAllIcons();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for storage changes (when another tab updates wishlist)
    window.addEventListener('storage', (e) => {
      if (e.key === 'wishlist') {
        this.items = JSON.parse(e.newValue) || [];
        this.updateWishlistCount();
        this.updateAllIcons();
        console.log("Wishlist updated from another tab:", this.items.length);
      }
    });
  }
  
  async toggle(productId) {
    productId = String(productId);
    
    const product = await this.getProductDetails(productId);
    if (!product) return;
    
    const index = this.items.findIndex(item => item.id == productId);
    
    if (index > -1) {
      this.items.splice(index, 1);
      console.log("Removed from wishlist:", productId);
    } else {
      this.items.push(product);
      console.log("Added to wishlist:", productId);
    }
    
    // Save and update (same as cart)
    this.saveWishlist();
    this.updateAllIcons();
    this.updateWishlistCount();
  }
  
  updateAllIcons() {
    document.querySelectorAll(".heart-icon, .prod-like, .wishlist-icon").forEach(container => {
      const productId = container.dataset.id;
      if (!productId) return;
      
      const icon = container.querySelector("i");
      if (icon) {
        if (this.isWishlisted(productId)) {
          icon.classList.add("filled");
        } else {
          icon.classList.remove("filled");
        }
      }
    });
  }
  
  async getProductDetails(productId) {
    if (typeof products !== "undefined" && products[productId]) {
      return products[productId];
    }
    
    if (window.pb) {
      try {
        const pbProduct = await window.pb.collection("exclusive_ecommerce").getOne(productId);
        if (pbProduct) {
          let imageUrl = pbProduct.image;
          if (imageUrl && typeof imageUrl === 'string') {
            if (imageUrl.startsWith('/')) {
              if (window.pb && window.pb.files) {
                imageUrl = window.pb.files.getURL(pbProduct, imageUrl);
              }
            }
          } else if (imageUrl && Array.isArray(imageUrl) && imageUrl.length > 0) {
            if (window.pb && window.pb.files) {
              imageUrl = window.pb.files.getURL(pbProduct, imageUrl[0]);
            }
          }
          
          return {
            id: pbProduct.id,
            name: pbProduct.name,
            price: typeof pbProduct.price === 'number' ? pbProduct.price : parseFloat(pbProduct.price) || 0,
            img: imageUrl || '/images/placeholder.jpg',
          };
        }
      } catch (error) {
        console.error("Error fetching from PocketBase:", error);
      }
    }
    
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (productCard) {
      return {
        id: productId,
        name: productCard.querySelector("h5")?.textContent || "Product",
        price: parseFloat(productCard.querySelector(".price")?.textContent?.replace("$", "") || "0"),
        img: productCard.querySelector("img")?.src || "/images/placeholder.jpg",
      };
    }
    
    return null;
  }
  
  saveWishlist() {
    localStorage.setItem("wishlist", JSON.stringify(this.items));
    this.updateWishlistCount();
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
  }
  
  // NEW: Same pattern as cart count
  updateWishlistCount() {
    // Try to find the wishlist count element
    let count = document.querySelector(".wish-count");
    
    // If not found, try alternative selectors
    if (!count) {
      count = document.querySelector(".wishlist-count");
    }
    if (!count) {
      count = document.querySelector("[data-wishlist-count]");
    }
    
    if (!count) {
      console.log("⚠️ Wishlist count element (.wish-count) not found in DOM");
      return;
    }
    
    const total = this.items.length;
    
    if (total > 0) {
      count.style.display = "flex";
      count.textContent = total > 99 ? "99+" : total;
       
    } else {
      count.style.display = "none";
      console.log("✅ Wishlist is empty, count hidden");
    }
  }
  
  // NEW: Same as cart force refresh
  forceRefreshWishlistCount() {
    this.items = JSON.parse(localStorage.getItem("wishlist")) || [];
    this.updateWishlistCount();
    console.log("🔄 Wishlist count force refreshed:", this.items.length);
  }
  
  isWishlisted(productId) {
    return this.items.some(item => item.id == String(productId));
  }
  
  getCount() {
    return this.items.length;
  }
}

/* ---------------- VIEWED SYSTEM ---------------- */
class ViewedSystem {
  constructor() {
    this.items = JSON.parse(localStorage.getItem("viewed")) || [];
  }
  
  markViewed(productId) {
    productId = String(productId);
    
    if (!this.items.includes(productId)) {
      this.items.push(productId);
      this.save();
      this.updateAllEyeIcons();
    }
  }
  
  updateAllEyeIcons() {
    document.querySelectorAll(".eye-icon").forEach(container => {
      const productId = container.dataset.id;
      if (!productId) return;
      
      const icon = container.querySelector("i");
      if (icon) {
        if (this.isViewed(productId)) {
          icon.classList.add("viewed");
        } else {
          icon.classList.remove("viewed");
        }
      }
    });
  }
  
  save() {
    localStorage.setItem("viewed", JSON.stringify(this.items));
    document.dispatchEvent(new CustomEvent("viewedUpdated", { detail: this.items }));
  }
  
  isViewed(productId) {
    return this.items.includes(String(productId));
  }
}

/* ---------------- INITIALIZE ---------------- */
// Initialize all systems
window.cartSystem = new CartSystem();
window.wishlistSystem = new WishlistSystem();
window.viewedSystem = new ViewedSystem();

/* ---------------- FORCE REFRESH ON PAGE LOAD (SAME AS CART) ---------------- */
(function ensureCountsOnAllPages() {
  // This function runs immediately and on every page load
  const refreshAllCounts = () => {
    if (window.cartSystem) {
      window.cartSystem.forceRefreshCartCount();
    }
    if (window.wishlistSystem) {
      window.wishlistSystem.forceRefreshWishlistCount();
    }
  };
  
  // Run immediately
  refreshAllCounts();
  
  // Also run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAllCounts);
  }
  
  // Also run when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshAllCounts();
    }
  });
  
  // For back/forward navigation
  window.addEventListener('pageshow', () => {
    refreshAllCounts();
  });
})();

/* ---------------- GLOBAL CLICK EVENTS ---------------- */
document.addEventListener("click", (e) => {
  // Wishlist heart click
  const heart = e.target.closest(".heart-icon, .prod-like");
  if (heart) {
    e.preventDefault();
    const productId = heart.dataset.id;
    if (!productId) return;
    
    const icon = heart.querySelector("i");
    if (icon) {
      const willBeWishlisted = !window.wishlistSystem?.isWishlisted(productId);
      if (willBeWishlisted) {
        icon.classList.add("filled");
      } else {
        icon.classList.remove("filled");
      }
    }
    
    window.wishlistSystem?.toggle(productId);
    return;
  }
  
  // Viewed eye click
  const eye = e.target.closest(".eye-icon");
  if (eye) {
    e.preventDefault();
    const productId = eye.dataset.id;
    if (!productId) return;
    
    const icon = eye.querySelector("i");
    if (icon) {
      icon.classList.add("viewed");
    }
    
    window.viewedSystem?.markViewed(productId);
    return;
  }
});

/* ---------------- MUTATION OBSERVER ---------------- */
let observerTimeout = null;

const observer = new MutationObserver(() => {
  if (observerTimeout) clearTimeout(observerTimeout);
  
  observerTimeout = setTimeout(() => {
    if (window.wishlistSystem) {
      window.wishlistSystem.updateAllIcons();
      window.wishlistSystem.updateWishlistCount();
    }
    if (window.viewedSystem) {
      window.viewedSystem.updateAllEyeIcons();
    }
    if (window.cartSystem) {
      window.cartSystem.updateCartCount();
    }
  }, 100);
});

observer.observe(document.body, { childList: true, subtree: true });

/* ---------------- EVENT LISTENERS ---------------- */
document.addEventListener("cartUpdated", () => {
  window.cartSystem?.updateCartCount();
});

document.addEventListener("wishlistUpdated", () => {
  window.wishlistSystem?.updateAllIcons();
  window.wishlistSystem?.updateWishlistCount();
});

document.addEventListener("viewedUpdated", () => {
  window.viewedSystem?.updateAllEyeIcons();
});

/* ---------------- CHECKOUT AUTHENTICATION CHECK ---------------- */
function checkAuthBeforeCheckout() {
  if (window.authSystem && window.authSystem.isLoggedIn()) {
    window.location.href = "/order&payment/checkout.html";
    return true;
  } else {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/user/signup.html?redirect=${returnUrl}&show=login`;
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.querySelector('.checkout-btn, .gen-btn:has(a[href*="checkout"])');
  if (checkoutBtn) {
    const newCheckoutBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
    
    newCheckoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      checkAuthBeforeCheckout();
    });
  }
  
  const checkoutLinks = document.querySelectorAll('a[href*="checkout"]');
  checkoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      checkAuthBeforeCheckout();
    });
  });
});

window.checkAuthBeforeCheckout = checkAuthBeforeCheckout;

 