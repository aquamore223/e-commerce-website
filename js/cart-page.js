class CartPage {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.container = document.querySelector("#cart-items");
    this.checkoutBtn = document.querySelector("#checkout-btn");

    this.render();
    this.events();

    // Listen for cart updates
    document.addEventListener("cartUpdated", () => {
      this.cart = JSON.parse(localStorage.getItem("cart")) || [];
      this.render();
    });
  }

  render() {
    if (!this.container) return;

    if (this.cart.length === 0) {
      this.container.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
      this.container.innerHTML = this.cart.map(item => this.row(item)).join("");
    }

    this.updateTotals();
    if (this.checkoutBtn) this.checkoutBtn.disabled = this.cart.length === 0;
  }

  row(item) {
    const subtotal = item.price * item.qty;
    return `
      <div class="cart-flex cart-item" data-id="${item.id}">
        <div class="cart-product">
          <img src="${item.img}" width="50" onerror="this.src='/images/placeholder.jpg'">
          <span>${item.name}</span>
          <button class="remove-item" data-id="${item.id}">🗑</button>
        </div>
        <p>${formatPrice(item.price)}</p>
        <input type="number" class="qty-input" value="${item.qty}" min="1" data-id="${item.id}">
        <p class="item-total">${formatPrice(subtotal)}</p>
      </div>
    `;
  }

  updateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalEl = document.querySelector("#cart-subtotal");
    const totalEl = document.querySelector("#cart-total");
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) totalEl.textContent = formatPrice(subtotal);
  }

  events() {
    // Quantity change
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("qty-input")) {
        const id = e.target.dataset.id;
        const qty = Number(e.target.value);
        const item = this.cart.find(p => p.id == id);
        
        if (item && qty >= 1) {
          item.qty = qty;
          this.save();
        }
      }
    });

    // Remove item
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-item")) {
        const id = e.target.dataset.id;
        this.cart = this.cart.filter(p => p.id != id);
        this.save();
      }
    });
  }

  save() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    
    // Update cart count in header
    const totalCount = this.cart.reduce((sum, item) => sum + item.qty, 0);
    const countEl = document.querySelector(".cart-count");
    if (countEl) {
      if (totalCount > 0) {
        countEl.style.display = "block";
        countEl.textContent = totalCount > 99 ? "99+" : totalCount;
      } else {
        countEl.style.display = "none";
      }
    }
    
    // Re-render
    this.render();
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
  }
}

// Helper function for price formatting
function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

// Initialize cart page when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new CartPage();
});