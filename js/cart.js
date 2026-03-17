


class CartSystem {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];

    document.addEventListener("DOMContentLoaded", () => {
      this.updateCartCount();
      this.renderCheckout();
    });

    /* ADD TO CART BUTTONS - ONLY THIS ONE SHOULD EXIST */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      this.addToCart(id);

      /* BUTTON ANIMATION */
      const originalText = btn.textContent;
      btn.textContent = "✔ Added";
      btn.classList.add("added");
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove("added");
      }, 1000);
    });

    /* QUANTITY CHANGE IN CART PAGE */
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

  /* ---------------- ADD PRODUCT ---------------- */
  addToCart(productId) {
    const product = Object.values(products).find((p) => p.id == productId);
    if (!product) return;

    const existing = this.cart.find((item) => item.id == productId);
    if (existing) existing.qty += 1;
    else
      this.cart.push({
        id: productId,
        name: product.name,
        price: Number(product.price.replace("$", "")),
        img: product.img,
        qty: 1,
      });

    this.saveCart();
    this.renderCheckout();
  }

  /* ---------------- SAVE CART ---------------- */
  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    this.updateCartCount();
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
  }

  /* ---------------- CART COUNT ---------------- */
  updateCartCount() {
    const count = document.querySelector(".cart-count");
    if (!count) return;

    const total = this.cart.reduce((sum, item) => sum + item.qty, 0);
    count.textContent = total;
  }

  /* ---------------- RENDER CHECKOUT ---------------- */
  renderCheckout() {
    const container = document.getElementById("checkout-preview");
    if (!container) return;

    const cart = this.cart;
    if (cart.length === 0) {
      container.innerHTML = "<p>Your cart is empty</p>";
      return;
    }

    let subtotal = 0;
    container.innerHTML = cart
      .map((item) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        return `
          <div class="cart-flex cart-item" data-id="${item.id}">
              <div id="cart-pic-section">
                  <img src="${item.img}" alt="${item.name}" width="50">
                  <p>${item.name} <span class="cart-qty">x${item.qty}</span></p>
              </div>
              <p>$${itemTotal.toFixed(2)}</p>
          </div>
        `;
      })
      .join("");

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
  });
  }

  toggle(productId) {
    const product = this.getProductDetails(productId);
    if (!product) return;
    
    const index = this.items.findIndex(item => item.id == productId);
    if (index > -1) {
      this.items.splice(index, 1);
    } else {
      this.items.push(product);
    }
    this.save();
  }

  getProductDetails(productId) {
    // Try to get from products object
    if (typeof products !== 'undefined' && products[productId]) {
      return products[productId];
    }
    
    // Try to get from DOM if on product page
    const productCard = document.querySelector(`[data-id="${productId}"]`);
    if (productCard) {
      return {
        id: productId,
        name: productCard.querySelector('h5')?.textContent || 'Product',
        price: productCard.querySelector('p')?.textContent.replace('$', '').split(' ')[0] || '0',
        img: productCard.querySelector('img')?.src || '',
        discount: 0
      };
    }
    
    return null;
  }

  save() {
    localStorage.setItem("wishlist", JSON.stringify(this.items));
    this.updateCount();
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
  }

  updateCount() {
    const countEl = document.querySelector(".wish-count");
    if (countEl) countEl.textContent = this.items.length;
  }

  isWishlisted(productId) {
    return this.items.some(item => item.id == productId);
  }
}

/* ---------------- RECENTLY VIEWED SYSTEM ---------------- */
class ViewedSystem {
  constructor() {
    this.items = JSON.parse(localStorage.getItem("viewed")) || [];
  }

  markViewed(productId) {
    if (!this.items.includes(productId)) {
      this.items.push(productId);
      this.save();
    }
  }

  save() {
    localStorage.setItem("viewed", JSON.stringify(this.items));
    document.dispatchEvent(new CustomEvent("viewedUpdated", { detail: this.items }));
  }

  isViewed(productId) {
    return this.items.includes(productId);
  }
}

/* ---------------- INITIALIZE SYSTEMS ---------------- */
window.cartSystem = new CartSystem();
window.wishlistSystem = new WishlistSystem();
window.viewedSystem = new ViewedSystem();

/* ---------------- GLOBAL CLICK EVENTS ---------------- */
document.addEventListener("click", (e) => {
  // Wishlist heart
  const heart = e.target.closest(".heart-icon, .heart-icon i");
  if (heart) {
    const productId = heart.dataset.id;
    if (!productId) return;
    wishlistSystem.toggle(productId);
    const icon = heart.querySelector("i");
    if (icon) icon.classList.toggle("filled", wishlistSystem.isWishlisted(productId));
  }

  // Viewed eye
  const eyeImg = e.target.closest(".scroll-img-section img");
  if (eyeImg) {
    const productId = eyeImg.dataset.id;
    if (!productId) return;
    viewedSystem.markViewed(productId);

    const eyeIcon = eyeImg.closest(".scroll-img-section").querySelector(".eye-icon i");
    if (eyeIcon) eyeIcon.classList.add("viewed");
  }

  /* ---------------- INITIALIZE ICON STATES ---------------- */

document.addEventListener("DOMContentLoaded", () => {

  /* HEART ICON STATE */
  document.querySelectorAll(".heart-icon").forEach((heart) => {
    const productId = heart.dataset.id;
    if (!productId) return;

    const icon = heart.querySelector("i");
    if (!icon) return;

    if (wishlistSystem.isWishlisted(productId)) {
      icon.classList.add("filled");
    } else {
      icon.classList.remove("filled");
    }
  });

  /* VIEWED ICON STATE */
  document.querySelectorAll(".eye-icon").forEach((eye) => {
    const productId = eye.dataset.id;
    if (!productId) return;

    const icon = eye.querySelector("i");
    if (!icon) return;

    if (viewedSystem.isViewed(productId)) {
      icon.classList.add("viewed");
    } else {
      icon.classList.remove("viewed");
    }
  });

});

  
});