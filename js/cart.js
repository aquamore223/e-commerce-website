class CartSystem {
    constructor() {
        // Load existing cart
        this.cart = JSON.parse(localStorage.getItem("cart")) || [];
        
        // Initialize cart count with retry
        this.initializeCartCount();
        
        // Rest of your constructor...
        document.addEventListener("click", e => {
            const btn = e.target.closest(".add-to-cart-btn");
            if (!btn) return;

            const id = btn.dataset.id;
            this.addToCart(id);

            const originalText = btn.textContent;
            btn.textContent = "✔ Added";
            btn.classList.add("added");
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove("added");
            }, 1000);
        });

        document.addEventListener("change", e => {
            if (!e.target.classList.contains("qty-input")) return;

            const row = e.target.closest(".cart-flex");
            const id = row.dataset.id;
            const qty = Number(e.target.value);
            const item = this.cart.find(p => p.id == id);
            if (item) {
                item.qty = qty;
                this.saveCart();
                this.updateCartCount();
            }
        });
    }
    
    initializeCartCount() {
        // Try immediately
        if (document.querySelector(".cart-count")) {
            this.updateCartCount();
            return;
        }
        
        // Try when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateCartCount();
            });
        }
        
        // Fallback: keep trying every 100ms for 2 seconds
        let attempts = 0;
        const interval = setInterval(() => {
            if (document.querySelector(".cart-count")) {
                this.updateCartCount();
                clearInterval(interval);
            }
            attempts++;
            if (attempts > 20) clearInterval(interval); // Stop after 2 seconds
        }, 100);
    }

    addToCart(productId) {
        const product = Object.values(products).find(p => p.id == productId);
        if (!product) return;

        const existing = this.cart.find(item => item.id == productId);
        if (existing) existing.qty += 1;
        else this.cart.push({ id: productId, name: product.name, price: product.price, img: product.img, qty: 1 });

        this.saveCart();
        this.updateCartCount();
    }

    saveCart() {
        localStorage.setItem("cart", JSON.stringify(this.cart));
        document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }

    updateCartCount() {
        const countEl = document.querySelector(".cart-count");
        if (!countEl) return;
        const total = this.cart.reduce((sum, item) => sum + item.qty, 0);
        countEl.textContent = total;
    }
}

window.cartSystem = new CartSystem();
function addToCart(id) {
    cartSystem.addToCart(id);
}