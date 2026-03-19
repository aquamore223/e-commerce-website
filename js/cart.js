class CartSystem {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];

    document.addEventListener("DOMContentLoaded", () => {
      this.updateCartCount();
      this.renderCheckout();
    });

    /* ADD TO CART BUTTONS */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      this.addToCart(id);

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

  addToCart(productId) {
    const product = Object.values(products).find((p) => p.id == productId);
    if (!product) return;

    const existing = this.cart.find((item) => item.id == productId);

    if (existing) existing.qty += 1;
    else {
      this.cart.push({
        id: productId,
        name: product.name,
        price: Number(product.price.replace("$", "")),
        img: product.img,
        qty: 1,
      });
    }

    this.saveCart();
    this.renderCheckout();
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
            <img src="${item.img}" width="50">
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
    });
  }

  toggle(productId) {
    productId = String(productId);

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
    if (typeof products !== "undefined" && products[productId]) {
      return products[productId];
    }

    const productCard = document.querySelector(`[data-id="${productId}"]`);
    if (productCard) {
      return {
        id: productId,
        name: productCard.querySelector("h5")?.textContent || "Product",
        price: productCard.querySelector("p")?.textContent.replace("$", "").split(" ")[0] || "0",
        img: productCard.querySelector("img")?.src || "",
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
    }
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

  /* WISHLIST */
  const heart = e.target.closest(".heart-icon");
  if (heart) {
    const productId = heart.dataset.id;
    if (!productId) return;

    wishlistSystem.toggle(productId);

    const icon = heart.querySelector("i");
    if (icon) {
      icon.classList.toggle("filled", wishlistSystem.isWishlisted(productId));
    }
  }

  /* VIEWED */
  const container = e.target.closest(".scroll-img-section");
  if (container) {
    const productId = container.dataset.id;
    if (!productId) return;

    viewedSystem.markViewed(productId);

    const eyeIcon = container.querySelector(".eye-icon i");
    if (eyeIcon) {
      eyeIcon.classList.add("viewed");
    }
  }

});

/* ---------------- LOAD ICON STATES ---------------- */
document.addEventListener("DOMContentLoaded", () => {

  /* HEART STATE */
  document.querySelectorAll(".heart-icon").forEach((heart) => {
    const productId = heart.dataset.id;
    const icon = heart.querySelector("i");

    if (icon && wishlistSystem.isWishlisted(productId)) {
      icon.classList.add("filled");
    }
  });

  /* VIEWED STATE */
  document.querySelectorAll(".scroll-img-section").forEach((container) => {
    const productId = container.dataset.id;
    const eyeIcon = container.querySelector(".eye-icon i");

    if (eyeIcon && viewedSystem.isViewed(productId)) {
      eyeIcon.classList.add("viewed");
    }
  });

});