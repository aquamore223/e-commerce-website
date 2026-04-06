// cart-page.js - Cart page with authentication check

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
      if (this.checkoutBtn) {
        this.checkoutBtn.disabled = true;
        this.checkoutBtn.style.opacity = '0.5';
        this.checkoutBtn.style.cursor = 'not-allowed';
      }
    } else {
      this.container.innerHTML = this.cart.map(item => this.row(item)).join("");
      if (this.checkoutBtn) {
        this.checkoutBtn.disabled = false;
        this.checkoutBtn.style.opacity = '1';
        this.checkoutBtn.style.cursor = 'pointer';
      }
    }

    this.updateTotals();
  }

  row(item) {
    const subtotal = item.price * item.qty;
    
    // Display color and size if available
    let details = '';
    if (item.color) details += `<span class="item-color" style="display: inline-block; margin-left: 5px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; font-size: 11px;">${item.color}</span>`;
    if (item.size) details += `<span class="item-size" style="display: inline-block; margin-left: 5px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; font-size: 11px;">${item.size}</span>`;
    
    return `
      <div class="cart-flex cart-item" data-id="${item.id}" data-color="${item.color || ''}" data-size="${item.size || ''}">
        <div class="cart-product">
          <img src="${item.img}" width="50" onerror="this.src='/images/placeholder.jpg'">
          <div>
            <span>${item.name}</span>
            ${details}
          </div>
          <button class="remove-item" data-id="${item.id}" data-color="${item.color || ''}" data-size="${item.size || ''}">🗑</button>
        </div>
        <p>${this.formatPrice(item.price)}</p>
        <input type="number" class="qty-input" value="${item.qty}" min="1" data-id="${item.id}" data-color="${item.color || ''}" data-size="${item.size || ''}">
        <p class="item-total">${this.formatPrice(subtotal)}</p>
      </div>
    `;
  }

  updateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalEl = document.querySelector("#cart-subtotal");
    const totalEl = document.querySelector("#cart-total");
    
    if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
    if (totalEl) totalEl.textContent = this.formatPrice(subtotal);
  }

  formatPrice(price) {
    return `$${Number(price).toFixed(2)}`;
  }

  // Check authentication before proceeding to checkout
  checkAuthAndProceed() {
    // Check if user is logged in via authSystem
    if (window.authSystem && window.authSystem.isLoggedIn()) {
      // User is logged in, proceed to checkout
      window.location.href = "/order&payment/checkout.html";
    } else {
      // User is not logged in, redirect to signup page with return URL
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/user/signup.html?redirect=${returnUrl}&show=login`;
    }
  }

  events() {
    // Quantity change
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("qty-input")) {
        const id = e.target.dataset.id;
        const color = e.target.dataset.color;
        const size = e.target.dataset.size;
        const qty = Number(e.target.value);
        
        // Find item with matching id, color, and size
        const item = this.cart.find(p => 
          p.id == id && 
          (p.color || '') === (color || '') && 
          (p.size || '') === (size || '')
        );
        
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
        const color = e.target.dataset.color;
        const size = e.target.dataset.size;
        
        // Remove item with matching id, color, and size
        this.cart = this.cart.filter(p => 
          !(p.id == id && 
            (p.color || '') === (color || '') && 
            (p.size || '') === (size || ''))
        );
        this.save();
      }
    });
    
    // Checkout button with authentication
    if (this.checkoutBtn) {
      // Remove existing listeners to avoid duplicates
      const newCheckoutBtn = this.checkoutBtn.cloneNode(true);
      this.checkoutBtn.parentNode.replaceChild(newCheckoutBtn, this.checkoutBtn);
      this.checkoutBtn = newCheckoutBtn;
      
      this.checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if cart is empty
        if (this.cart.length === 0) {
          alert('Your cart is empty. Please add items before checkout.');
          return;
        }
        
        // Check authentication and proceed
        this.checkAuthAndProceed();
      });
    }
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
  window.cartPage = new CartPage();
});