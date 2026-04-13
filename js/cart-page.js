// cart-page.js - Cart page with authentication check

class CartPage {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.container = document.querySelector("#cart-items");
    this.checkoutBtn = document.querySelector("#checkout-btn");

    this.render();
    this.events();

    // Listen for cart updates from other components
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

    // Remove item - FIXED: Immediate removal and count update
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-item")) {
        const id = e.target.dataset.id;
        const color = e.target.dataset.color;
        const size = e.target.dataset.size;
        
        // Remove item with matching id, color, and size
        const index = this.cart.findIndex(p => 
          p.id == id && 
          (p.color || '') === (color || '') && 
          (p.size || '') === (size || '')
        );
        
        if (index !== -1) {
          // Store the item name for notification
          const itemName = this.cart[index].name;
          
          // Remove the item
          this.cart.splice(index, 1);
          
          // Save and update everything
          this.save();
          
          // Show feedback (optional)
          this.showDeleteNotification(`${itemName} removed from cart`);
        }
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

  showDeleteNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ff4444;
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

  save() {
    // Save to localStorage
    localStorage.setItem("cart", JSON.stringify(this.cart));
    
    // IMPORTANT: Update cart count in header using the global cartSystem if available
    this.updateHeaderCartCount();
    
    // Re-render the cart page
    this.render();
    
    // Dispatch event for other components (like header, other pages)
    document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    
    // Also trigger storage event for cross-tab sync
    window.dispatchEvent(new Event('storage'));
  }
  
  updateHeaderCartCount() {
    // Calculate total items
    const totalCount = this.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    
    // Try to update using the global cartSystem first (most reliable)
    if (window.cartSystem && typeof window.cartSystem.updateCartCount === 'function') {
      window.cartSystem.cart = this.cart;
      window.cartSystem.updateCartCount();
      console.log("Cart count updated via cartSystem:", totalCount);
      return;
    }
    
    // Fallback: Directly update the DOM element
    const countEl = document.querySelector(".cart-count");
    if (countEl) {
      if (totalCount > 0) {
        countEl.style.display = "flex";
        countEl.style.visibility = "visible";
        countEl.textContent = totalCount > 99 ? "99+" : totalCount;
        console.log("Cart count updated directly:", totalCount);
      } else {
        countEl.style.display = "none";
        console.log("Cart count hidden - cart is empty");
      }
    } else {
      console.warn("Cart count element (.cart-count) not found in DOM");
    }
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