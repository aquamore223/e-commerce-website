// ==================== CART SYSTEM ====================
class CartSystem {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];

    document.addEventListener("DOMContentLoaded", () => {
      this.updateCartCount();
      this.renderCheckout();
    });

    /* ADD TO CART BUTTONS */
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      await this.addToCart(id);

      const originalText = btn.textContent;
      btn.textContent = "✔ Added";
      btn.classList.add("added");

      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove("added");
      }, 1000);
    });

    /* QUANTITY CHANGE */
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

  getProductImage(product) {
    if (product.image) {
      if (typeof product.image === 'string') {
        if (product.image.startsWith('http')) {
          return product.image;
        }
        return window.pb.files.getURL(product, product.image);
      } else if (Array.isArray(product.image) && product.image.length > 0) {
        return window.pb.files.getURL(product, product.image[0]);
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

    const total = this.cart.reduce((sum, item) => sum + item.qty, 0);

    if (total > 0) {
      count.style.display = "block";
      count.textContent = total > 99 ? "99+" : total;
    } else {
      count.style.display = "none";
    }
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

      return `
        <div class="cart-flex cart-item" data-id="${item.id}">
          <div id="cart-pic-section">
            <img src="${item.img}" width="50" onerror="this.src='/images/placeholder.jpg'">
            <p>${item.name} <span class="cart-qty">x${item.qty}</span></p>
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
}

/* ---------------- WISHLIST SYSTEM ---------------- */
class WishlistSystem {
  constructor() {
    this.items = JSON.parse(localStorage.getItem("wishlist")) || [];

    document.addEventListener("DOMContentLoaded", () => {
      this.updateCount();
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
    } else {
      this.items.push(product);
    }

    this.save();
    this.updateAllIcons();
    this.updateCount();
  }

  updateAllIcons() {
    document.querySelectorAll(".heart-icon, .prod-like").forEach(container => {
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
          return {
            id: pbProduct.id,
            name: pbProduct.name,
            price: typeof pbProduct.price === 'number' ? pbProduct.price : parseFloat(pbProduct.price) || 0,
            img: this.getProductImage(pbProduct),
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
        price: parseFloat(productCard.querySelector("p")?.textContent.replace("$", "")) || 0,
        img: productCard.querySelector("img")?.src || "",
      };
    }

    return null;
  }

  getProductImage(product) {
    if (product.image) {
      if (typeof product.image === 'string') {
        if (product.image.startsWith('http')) {
          return product.image;
        }
        return window.pb.files.getURL(product, product.image);
      } else if (Array.isArray(product.image) && product.image.length > 0) {
        return window.pb.files.getURL(product, product.image[0]);
      }
    }
    return '/images/placeholder.jpg';
  }

  save() {
    localStorage.setItem("wishlist", JSON.stringify(this.items));
    this.updateCount();
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
  }

  updateCount() {
    const countEl = document.querySelector(".wish-count");
    if (!countEl) return;

    const total = this.items.length;

    if (total > 0) {
      countEl.style.display = "block";
      countEl.textContent = total > 99 ? "99+" : total;
    } else {
      countEl.style.display = "none";
    }
  }

  isWishlisted(productId) {
    return this.items.some(item => item.id == String(productId));
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
window.cartSystem = new CartSystem();
window.wishlistSystem = new WishlistSystem();
window.viewedSystem = new ViewedSystem();

/* ---------------- GLOBAL CLICK EVENTS ---------------- */
document.addEventListener("click", (e) => {
  // Wishlist heart click
  const heart = e.target.closest(".heart-icon, .prod-like");
  if (heart) {
    e.preventDefault();
    const productId = heart.dataset.id;
    if (!productId) return;

    // Update icon immediately for visual feedback
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

/* ---------------- LOAD ICON STATES ON PAGE LOAD ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Update hearts
  document.querySelectorAll(".heart-icon, .prod-like").forEach((heart) => {
    const productId = heart.dataset.id;
    const icon = heart.querySelector("i");
    if (icon && window.wishlistSystem?.isWishlisted(productId)) {
      icon.classList.add("filled");
    }
  });

  // Update eyes
  document.querySelectorAll(".eye-icon").forEach((eye) => {
    const productId = eye.dataset.id;
    const icon = eye.querySelector("i");
    if (icon && window.viewedSystem?.isViewed(productId)) {
      icon.classList.add("viewed");
    }
  });
});

console.log("✅ Cart.js loaded successfully");