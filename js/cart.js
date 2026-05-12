// ==================== CART SYSTEM WITH POCKETBASE SYNC ====================

function getCurrentUserId() {
  if (window.authSystem?.currentUser?.id) {
    return window.authSystem.currentUser.id;
  }
  if (window.pb?.authStore?.model?.id) {
    return window.pb.authStore.model.id;
  }
  return null;
}

class CartSystem {
  constructor() {
    // Load cart from localStorage
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.userId = getCurrentUserId();
    this.isLoading = false;
    this.isSyncing = false;
    this.syncQueue = Promise.resolve(); // Queue to handle sync operations in order
    this.lastSyncVersion = 0; // Track sync version to prevent stale updates
    this.currentSyncVersion = 0;
    
    // Initial update
    this.updateCartCount();
    this.renderCheckout();
    
    // Initialize auth and database sync
    this.initAuth();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  async initAuth() {
    await this.waitForAuth();
    this.userId = getCurrentUserId();
    
    if (this.userId) {
      console.log('🔐 Cart - User logged in, loading from PocketBase...');
      await this.loadCartFromDB();
    }
    
    this.setupAuthListener();
  }
  
  waitForAuth() {
    return new Promise((resolve) => {
      if (window.authSystem) {
        resolve();
      } else {
        const checkAuth = setInterval(() => {
          if (window.authSystem) {
            clearInterval(checkAuth);
            resolve();
          }
        }, 100);
        setTimeout(() => resolve(), 3000);
      }
    });
  }
  
  setupAuthListener() {
    document.addEventListener('authChanged', async () => {
      const newUserId = getCurrentUserId();
      
      if (newUserId && !this.userId) {
        this.userId = newUserId;
        await this.loadCartFromDB();
        this.updateCartCount();
        this.renderCheckout();
      } else if (!newUserId && this.userId) {
        this.userId = null;
        this.saveCart();
        this.updateCartCount();
        this.renderCheckout();
      }
    });
  }
  
  async loadCartFromDB() {
    if (!this.userId || !window.pb || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const result = await window.pb.collection("user_cart").getFullList({
        filter: `userId = "${this.userId}"`,
        $autoCancel: false
      });

      if (result && result.length > 0) {
        const dbCart = result[0].items || [];
        console.log('📦 Loaded from DB:', dbCart.length, 'items');
        
        // Replace local cart with DB cart
        this.cart = dbCart;
        localStorage.setItem("cart", JSON.stringify(this.cart));
      }
      
      this.updateCartCount();
      this.renderCheckout();
      
    } catch (err) {
      console.error("Error loading cart:", err);
    } finally {
      this.isLoading = false;
    }
  }
  
  async syncCartToDB() {

  if (!this.userId || !window.pb) {
    console.log('⚠️ Cannot sync: no user or PB');
    return;
  }

  // Increment version
  this.currentSyncVersion++;
  const myVersion = this.currentSyncVersion;

  console.log(`🔄 Sync started (version ${myVersion}), items:`, this.cart.length);

  // Wait for previous sync
  await this.syncQueue;

  this.syncQueue = this.syncQueue.then(async () => {

    // Skip stale syncs
    if (myVersion !== this.currentSyncVersion) {
      console.log(`⏭️ Skipping stale sync (${myVersion})`);
      return;
    }

    try {

      // Get existing cart record
      const result = await window.pb.collection("user_cart").getFullList({
        filter: `userId = "${this.userId}"`,
        $autoCancel: false
      });

      // Skip stale sync again
      if (myVersion !== this.currentSyncVersion) {
        console.log(`⏭️ Skipping stale sync after fetch (${myVersion})`);
        return;
      }

      // =========================
      // EMPTY CART → DELETE RECORD
      // =========================

      if (this.cart.length === 0) {

        console.log('🗑️ Empty cart detected');

        if (result && result.length > 0) {

          await window.pb
            .collection("user_cart")
            .delete(result[0].id);

          console.log('✅ Empty cart record deleted from PocketBase');

        } else {

          console.log('ℹ️ No cart record found to delete');

        }

        return;
      }

      // =========================
      // UPDATE EXISTING CART
      // =========================

      if (result && result.length > 0) {

        await window.pb.collection("user_cart").update(result[0].id, {
          userId: this.userId,
          items: this.cart,
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Cart updated in PocketBase (version ${myVersion})`);

      }

      // =========================
      // CREATE NEW CART
      // =========================

      else {

        await window.pb.collection("user_cart").create({
          userId: this.userId,
          items: this.cart,
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Cart created in PocketBase (version ${myVersion})`);

      }

    } catch (err) {

      console.error("❌ Sync failed:", err);

    }

  });

  await this.syncQueue;
}
  
  setupEventListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'cart') {
        this.cart = JSON.parse(e.newValue) || [];
        this.updateCartCount();
        this.renderCheckout();
      }
    });
    
    document.addEventListener("cartUpdated", () => {
      this.updateCartCount();
      this.renderCheckout();
    });
    
    // ADD TO CART BUTTONS
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;
      
      const id = btn.dataset.id;
      if (!id) return;
      
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
    document.addEventListener("change", async (e) => {
      if (!e.target.classList.contains("qty-input")) return;
      
      const row = e.target.closest(".cart-flex");
      if (!row) return;
      
      const id = row.dataset.id;
      const qty = Number(e.target.value);
      
      const item = this.cart.find((p) => p.id == id);
      if (item) {
        item.qty = qty;
        await this.saveCart();
        this.renderCheckout();
      }
    });
    
    // REMOVE ITEM
    document.addEventListener("click", async (e) => {
      if (!e.target.classList.contains("remove-item")) return;
      
      const id = e.target.dataset.id;
      const color = e.target.dataset.color;
      const size = e.target.dataset.size;
      
      const index = this.cart.findIndex(p => 
        p.id == id && 
        (p.color || '') === (color || '') && 
        (p.size || '') === (size || '')
      );
      
      if (index !== -1) {
        this.cart.splice(index, 1);
        console.log('🗑️ Item removed, saving cart...');
        await this.saveCart();
        this.renderCheckout();
      }
    });

        // In setupEventListeners method, update the delivery-state listener:
    document.addEventListener("change", (e) => {
        if (e.target.id === "delivery-state") {
            // Save selected state to localStorage
            const selectedState = e.target.value;
            localStorage.setItem("selected_delivery_state", selectedState);
            console.log('📍 Delivery state saved:', selectedState);
            
            // Update the preview if it exists
            this.renderCheckout();
            
            // Also trigger cart page update if cart-page.js exists
            if (window.cartPage && window.cartPage.updateTotals) {
                window.cartPage.updateTotals();
            }
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
    
    await this.saveCart();
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
    
    await this.saveCart();
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

      calculateShipping(subtotal) {
      // Get selected state - try multiple methods
      let state = "Lagos"; // Default
      
      // Method 1: From the cart page select
      const stateSelect = document.getElementById("delivery-state");
      if (stateSelect && stateSelect.value) {
          state = stateSelect.value.trim();
      }
      
      // Method 2: From localStorage (save state when selected)
      const savedState = localStorage.getItem("selected_delivery_state");
      if (savedState) {
          state = savedState;
      }
      
      // Method 3: If stateSelect exists but no saved state, use its value
      if (stateSelect && stateSelect.value) {
          state = stateSelect.value.trim();
          // Save to localStorage for use in preview
          localStorage.setItem("selected_delivery_state", state);
      }
      
      // Free shipping for orders over $100,000
      if (subtotal >= 100000) {
          return 0;
      }

      const shippingRates = {
          Lagos: 20,
          Abuja: 40,
          Ibadan: 30,
          Kano: 50,
          PortHarcourt: 45,
          benin: 75,
      };

      // Ensure number is returned
      return Number(shippingRates[state] || 3500);
  }
  
  async saveCart() {
    console.log('💾 Saving cart, items:', this.cart.length);
    
    // Save to localStorage first (immediate UI feedback)
    localStorage.setItem("cart", JSON.stringify(this.cart));
    this.updateCartCount();
    
    // Sync to PocketBase if logged in (with version tracking)
    if (this.userId && window.pb) {
      await this.syncCartToDB();
    }
    
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
    
    const shipping = Number(this.calculateShipping(subtotal));
    const total = subtotal + shipping;

    container.innerHTML += `
      <div class="undl-fl">
        <p>Subtotal:</p>
        <p>$${subtotal.toFixed(2)}</p>
      </div>

      <div class="undl-fl">
        <p>Shipping:</p>
        <p>
          ${shipping === 0 
            ? 'Free' 
            : '$' + shipping.toFixed(2)}
        </p>
      </div>

      <div class="pg-flex-sb">
        <p>Total:</p>
        <p>$${total.toFixed(2)}</p>
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
  
  async clearCart() {
    console.log('🗑️ Clearing entire cart...');
    
    // Increment version to invalidate any pending syncs
    this.currentSyncVersion++;
    
    // Empty the cart array
    this.cart = [];
    
    // Save to localStorage and sync to PocketBase
    await this.saveCart();
    
    // Update UI
    this.updateCartCount();
    this.renderCheckout();
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    this.showCartNotification('Cart cleared successfully!');
    
     
  }
}



// ==================== WISHLIST SYSTEM WITH POCKETBASE SYNC ====================
 

class WishlistSystem {
  constructor() {
    // Load wishlist from localStorage
    this.items = JSON.parse(localStorage.getItem("wishlist")) || [];
    this.userId = getCurrentUserId();
    
    console.log("Wishlist loaded:", this.items.length, "items");
    
    // Initial update
    this.updateWishlistCount();
    this.updateAllIcons();
    
    // Initialize auth and database sync
    this.initAuth();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  async initAuth() {
    await this.waitForAuth();
    this.userId = getCurrentUserId();
    
    if (this.userId) {
      console.log('🔐 Wishlist - User logged in, loading from PocketBase...');
      await this.loadWishlistFromDB();
    }
    
    this.setupAuthListener();
  }
  
  waitForAuth() {
    return new Promise((resolve) => {
      if (window.authSystem) {
        resolve();
      } else {
        const checkAuth = setInterval(() => {
          if (window.authSystem) {
            clearInterval(checkAuth);
            resolve();
          }
        }, 100);
        setTimeout(() => resolve(), 3000);
      }
    });
  }
  
  setupAuthListener() {
    document.addEventListener('authChanged', async () => {
      const newUserId = getCurrentUserId();
      
      if (newUserId && !this.userId) {
        this.userId = newUserId;
        await this.loadWishlistFromDB();
        this.updateWishlistCount();
        this.updateAllIcons();
      } else if (!newUserId && this.userId) {
        this.userId = null;
        this.saveWishlist();
        this.updateWishlistCount();
        this.updateAllIcons();
      }
    });
  }
  
  async loadWishlistFromDB() {
    if (!this.userId || !window.pb) return;
    
    try {
      console.log('🔄 Loading wishlist from PocketBase for user:', this.userId);
      
      const result = await window.pb.collection("user_wishlist").getFullList({
        filter: `userId = "${this.userId}"`,
        $autoCancel: false
      });

      if (result && result.length > 0) {
        const dbItems = result[0].productIds || [];
        console.log('📦 Wishlist loaded from PocketBase:', dbItems.length, 'items');
        
        if (this.items.length > 0 && dbItems.length === 0) {
          await this.syncWishlistToDB();
        } else if (dbItems.length > 0) {
          this.items = dbItems;
          this.saveWishlist();
        }
      } else if (this.items.length > 0) {
        await this.syncWishlistToDB();
      }
      
      this.updateWishlistCount();
      this.updateAllIcons();
      
    } catch (err) {
      console.error("Error loading wishlist:", err);
    }
    const localItems = JSON.parse(localStorage.getItem("wishlist")) || [];

    if (localItems.length === 0) {
      console.log("🧹 Local wishlist empty → overriding DB");
      this.items = [];
      await this.syncWishlistToDB();
    } 
    else if (dbItems.length > 0) {
      this.items = dbItems;
      this.saveWishlist();
    }
  }
  
  async syncWishlistToDB() {
    if (!this.userId || !window.pb) return;
    
    try {
      const result = await window.pb.collection("user_wishlist").getFullList({
        filter: `userId = "${this.userId}"`,
        $autoCancel: false
      });

      if (result && result.length > 0) {
        await window.pb.collection("user_wishlist").update(result[0].id, {
          userId: this.userId,
          productIds: this.items,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Wishlist updated in PocketBase');
      } else {
        await window.pb.collection("user_wishlist").create({
          userId: this.userId,
          productIds: this.items,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Wishlist created in PocketBase');
      }
    } catch (err) {
      console.error("Sync failed:", err);
    }
  }
  
  setupEventListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'wishlist') {
        this.items = JSON.parse(e.newValue) || [];
        this.updateWishlistCount();
        this.updateAllIcons();
      }
    });
    
    // Listen for custom wishlist update events
    document.addEventListener("wishlistUpdated", () => {
      this.updateWishlistCount();
      this.updateAllIcons();
    });
  }
  
  async toggle(productId) {
    productId = String(productId);
    
    const product = await this.getProductDetails(productId);
    if (!product) return;
    
    const index = this.items.findIndex(item => item.id == productId);
    
    if (index > -1) {
      this.items.splice(index, 1);
      console.log("❌ Removed from wishlist:", productId);
    } else {
      this.items.push(product);
      console.log("❤️ Added to wishlist:", productId);
    }
    
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
          icon.style.fill = "#ff4444";
          icon.style.color = "#ff4444";
        } else {
          icon.classList.remove("filled");
          icon.style.fill = "";
          icon.style.color = "";
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
    
    return null;
  }
  
  saveWishlist() {
    localStorage.setItem("wishlist", JSON.stringify(this.items));
    this.updateWishlistCount();
    
    if (this.userId && window.pb) {
      this.syncWishlistToDB();
    }
    
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
  }
  
  updateWishlistCount() {
    let count = document.querySelector(".wish-count");
    if (!count) {
      count = document.querySelector(".wishlist-count");
    }
    if (!count) {
      count = document.querySelector("[data-wishlist-count]");
    }
    
    if (!count) return;
    
    const total = this.items.length;
    
    if (total > 0) {
      count.style.display = "flex";
      count.textContent = total > 99 ? "99+" : total;
    } else {
      count.style.display = "none";
    }
  }
  
  // Alias for compatibility
  updateCount() {
    this.updateWishlistCount();
  }
  
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
  
  getItems() {
    return this.items;
  }
  
  async clearWishlist() {
    console.log('🗑️ Clearing entire wishlist...');
    
    this.items = [];
    this.saveWishlist();
    
    if (this.userId && window.pb) {
      await this.syncWishlistToDB();
    }
    
    this.updateWishlistCount();
    this.updateAllIcons();
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
    console.log('✅ Wishlist cleared, items:', this.items.length);
  }
}


// ==================== VIEWED SYSTEM ====================

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


// ==================== INITIALIZE ====================

window.cartSystem = new CartSystem();
window.wishlistSystem = new WishlistSystem();
window.viewedSystem = new ViewedSystem();


// ==================== FORCE REFRESH ON PAGE LOAD ====================

(function ensureCountsOnAllPages() {
  const refreshAllCounts = () => {
    if (window.cartSystem) {
      window.cartSystem.forceRefreshCartCount();
    }
    if (window.wishlistSystem) {
      window.wishlistSystem.forceRefreshWishlistCount();
    }
  };
  
  refreshAllCounts();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAllCounts);
  }
  
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshAllCounts();
    }
  });
  
  window.addEventListener('pageshow', () => {
    refreshAllCounts();
  });
})();


// ==================== GLOBAL CLICK EVENTS ====================

document.addEventListener("click", (e) => {
  // Wishlist heart click
  const heart = e.target.closest(".heart-icon, .prod-like");
  if (heart) {
    e.preventDefault();
    e.stopPropagation();
    const productId = heart.dataset.id;
    if (!productId) return;
    
    const icon = heart.querySelector("i");
    if (icon) {
      const willBeWishlisted = !window.wishlistSystem?.isWishlisted(productId);
      if (willBeWishlisted) {
        icon.classList.add("filled");
        icon.style.fill = "#ff4444";
        icon.style.color = "#ff4444";
      } else {
        icon.classList.remove("filled");
        icon.style.fill = "";
        icon.style.color = "";
      }
    }
    
    window.wishlistSystem?.toggle(productId);
    
    return;
  }
  
  // Viewed eye click
  const eye = e.target.closest(".eye-icon");
  if (eye) {
    e.preventDefault();
    e.stopPropagation();
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


// ==================== MUTATION OBSERVER ====================

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


// ==================== EVENT LISTENERS ====================

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


// ==================== CHECKOUT AUTHENTICATION CHECK ====================

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

console.log("✅ Cart.js loaded - Cart and Wishlist with PocketBase sync!");