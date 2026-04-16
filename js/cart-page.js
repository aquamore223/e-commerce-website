// cart-page.js - Cart page with working clear cart

class CartPage {
  constructor() {
    this.container = document.querySelector("#cart-items");
    this.checkoutBtn = document.querySelector(".checkout-btn, #checkout-btn");
    this.isUpdating = false;
    
    this.init();
  }
  
  async init() {
    await this.waitForCartSystem();
    this.render();
    this.setupEventListeners();
    this.setupClearCartButton();
  }
  
  waitForCartSystem() {
    return new Promise((resolve) => {
      if (window.cartSystem && window.cartSystem.cart) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (window.cartSystem && window.cartSystem.cart) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => resolve(), 3000);
      }
    });
  }
  
  render() {
    if (!this.container || this.isUpdating) return;
    
    // Force get fresh cart data
    const cart = window.cartSystem?.cart || [];
    console.log('🎨 Rendering cart page, items:', cart.length);
    
    if (cart.length === 0) {
      this.container.innerHTML = '<p class="empty-cart" style="text-align: center; padding: 40px;">Your cart is empty</p>';
      if (this.checkoutBtn) {
        this.checkoutBtn.disabled = true;
        this.checkoutBtn.style.opacity = '0.5';
        this.checkoutBtn.style.cursor = 'not-allowed';
      }
    } else {
      this.container.innerHTML = cart.map(item => this.row(item)).join("");
      if (this.checkoutBtn) {
        this.checkoutBtn.disabled = false;
        this.checkoutBtn.style.opacity = '1';
        this.checkoutBtn.style.cursor = 'pointer';
      }
    }
    
    this.updateTotals();
  }
  
  forceRender() {
    // Force re-render even if isUpdating is true
    this.isUpdating = false;
    this.render();
  }
  
  row(item) {
    const subtotal = (item.price || 0) * (item.qty || 1);
    
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
    const cart = window.cartSystem?.cart || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
    
    const subtotalEl = document.querySelector("#cart-subtotal");
    const totalEl = document.querySelector("#cart-total");
    
    if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
    if (totalEl) totalEl.textContent = this.formatPrice(subtotal);
  }
  
  formatPrice(price) {
    return `$${Number(price || 0).toFixed(2)}`;
  }
  
  setupClearCartButton() {
    let clearCartBtn = document.querySelector("#clear-cart-btn");
    
    if (!clearCartBtn) {
      const buttonContainer = document.querySelector(".pg-flex-sb");
      if (buttonContainer) {
        const newButton = document.createElement('button');
        newButton.id = 'clear-cart-btn';
        newButton.textContent = 'Clear Cart';
        newButton.style.cssText = 'background: #db4444; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; margin-left: 10px;';
        buttonContainer.appendChild(newButton);
        clearCartBtn = newButton;
      }
    }
    
    if (clearCartBtn) {
      // Remove existing listeners
      const newClearBtn = clearCartBtn.cloneNode(true);
      clearCartBtn.parentNode.replaceChild(newClearBtn, clearCartBtn);
      clearCartBtn = newClearBtn;
      
      clearCartBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Clear cart button clicked');
        
        const confirmed = confirm('⚠️ Are you sure you want to clear your entire cart? This action cannot be undone.');
        
        if (confirmed && window.cartSystem) {
          this.isUpdating = true;
          
          // Show loading state
          const originalText = clearCartBtn.textContent;
          clearCartBtn.textContent = 'Clearing...';
          clearCartBtn.disabled = true;
          
          try {
            // Clear the cart
            await window.cartSystem.clearCart();
            console.log('Cart cleared, updating UI...');
            
            // Force immediate UI update
            this.forceRender();
            
            // Also force update the cart count in header
            if (window.cartSystem.updateCartCount) {
              window.cartSystem.updateCartCount();
            }
            
            // Manually update the cart count badge
            const cartCount = document.querySelector(".cart-count");
            if (cartCount) {
              cartCount.style.display = "none";
              cartCount.textContent = "0";
            }
            
            this.showNotification('Cart cleared successfully!');
          } catch (error) {
            console.error('Error clearing cart:', error);
            this.showNotification('Failed to clear cart. Please try again.', 'error');
          } finally {
            this.isUpdating = false;
            clearCartBtn.textContent = originalText;
            clearCartBtn.disabled = false;
          }
        }
      });
      
      console.log('Clear cart button setup complete');
    }
  }
  
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#4CAF50'};
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
  
  setupEventListeners() {
    // Quantity change
    document.addEventListener("change", async (e) => {
      if (e.target.classList.contains("qty-input") && !this.isUpdating) {
        const id = e.target.dataset.id;
        const color = e.target.dataset.color;
        const size = e.target.dataset.size;
        const qty = Number(e.target.value);
        
        if (window.cartSystem && qty >= 1) {
          this.isUpdating = true;
          try {
            const item = window.cartSystem.cart.find(p => 
              p.id == id && 
              (p.color || '') === (color || '') && 
              (p.size || '') === (size || '')
            );
            
            if (item) {
              item.qty = qty;
              await window.cartSystem.saveCart();
              this.render();
            }
          } finally {
            this.isUpdating = false;
          }
        }
      }
    });
    
    // Remove single item
    document.addEventListener("click", async (e) => {
      if (e.target.classList.contains("remove-item") && !this.isUpdating) {
        const id = e.target.dataset.id;
        const color = e.target.dataset.color;
        const size = e.target.dataset.size;
        
        if (window.cartSystem) {
          this.isUpdating = true;
          try {
            const index = window.cartSystem.cart.findIndex(p => 
              p.id == id && 
              (p.color || '') === (color || '') && 
              (p.size || '') === (size || '')
            );
            
            if (index !== -1) {
              const itemName = window.cartSystem.cart[index].name;
              window.cartSystem.cart.splice(index, 1);
              await window.cartSystem.saveCart();
              this.render();
              this.showNotification(`${itemName} removed from cart`, 'info');
            }
          } finally {
            this.isUpdating = false;
          }
        }
      }
    });
    
    // Listen for cart updates - force re-render
    document.addEventListener("cartUpdated", () => {
      console.log('cartUpdated event received');
      // Force reset updating flag and re-render
      this.isUpdating = false;
      this.render();
    });
    
    // Checkout button
    if (this.checkoutBtn) {
      const newCheckoutBtn = this.checkoutBtn.cloneNode(true);
      this.checkoutBtn.parentNode.replaceChild(newCheckoutBtn, this.checkoutBtn);
      this.checkoutBtn = newCheckoutBtn;
      
      this.checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const cart = window.cartSystem?.cart || [];
        if (cart.length === 0) {
          alert('Your cart is empty. Please add items before checkout.');
          return;
        }
        
        if (window.checkAuthBeforeCheckout) {
          window.checkAuthBeforeCheckout();
        } else {
          window.location.href = "/order&payment/checkout.html";
        }
      });
    }
  }
}

// Initialize cart page when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.cartPage = new CartPage();
});