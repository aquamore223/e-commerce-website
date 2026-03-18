class CartPage {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem("cart")) || [];
        this.container = document.querySelector("#cart-items");
        this.checkoutBtn = document.querySelector("#checkout-btn"); // cache it once

        this.render();
        this.events();

        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".add-to-cart-btn");
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.dataset.id;
                addToCart(id);

                const originalText = btn.textContent;
                btn.textContent = "✔ Added";
                btn.classList.add("added");
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove("added");
                }, 1000);
            }
        });
    }

    render() {
        if (!this.container) return;

        if (this.cart.length === 0) {
            this.container.innerHTML = "<p>Your cart is empty</p>";
        } else {
            this.container.innerHTML = this.cart.map(item => this.row(item)).join("");
        }

        // Always update totals and checkout button even if cart is empty
        this.updateTotals();
        if (this.checkoutBtn) this.checkoutBtn.disabled = this.cart.length === 0;
    }

    row(item) {
        const subtotal = item.price * item.qty;
        return `
        <div class="cart-flex cart-item" data-id="${item.id}">
            <div class="cart-product">
                <img src="${item.img}" width="50">
                <span>${item.name}</span>
                <button class="remove-item">🗑</button>
            </div>
           <p class="subtotal">${formatPrice(item.price)}</p>
            <input type="number" class="qty-input" value="${item.qty}" min="1">
            <p class="subtotal"><p>${formatPrice(subtotal)}</p></p>
        </div>
        `;
    }

    updateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const subtotalEl = document.querySelector("#cart-subtotal");
        const totalEl = document.querySelector("#cart-total");
        if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
        if (totalEl) totalEl.textContent =  formatPrice(subtotal);
    }

    events() {
        document.addEventListener("change", (e) => {
            if (e.target.classList.contains("qty-input")) {
                const row = e.target.closest(".cart-item");
                const id = row.dataset.id;
                const qty = Number(e.target.value);
                const item = this.cart.find(p => p.id == id);
                if (item) {
                    item.qty = qty;
                    this.save();
                }
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-item")) {
                const row = e.target.closest(".cart-item");
                const id = row.dataset.id;
                this.cart = this.cart.filter(p => p.id != id);
                this.save();
            }
        });
    }

    save() {
        localStorage.setItem("cart", JSON.stringify(this.cart));
        this.render();

        // Update cart count in nav
        const totalCount = this.cart.reduce((sum, item) => sum + item.qty, 0);
        const countEl = document.querySelector(".cart-count");
        if (countEl) countEl.textContent = totalCount;

        // Dispatch event for other scripts if needed
        document.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }
}

new CartPage();