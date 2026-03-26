// checkout.js
window.addEventListener("DOMContentLoaded", () => {

    const checkoutContainer = document.querySelector(".check-out-prev");

    if (!checkoutContainer) return;

    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Function to render checkout
    function renderCheckout() {
        if (cart.length === 0) {
            checkoutContainer.innerHTML = `<p>Your cart is empty</p>`;
            return;
        }

        // Build product HTML with scrollable container
        const productHTML = `
            <div class="cart-products-scroll">
                ${cart.map(item => {
                    const subtotal = item.price * item.qty;
                    return `
                        <div class="cart-flex cart-item" data-id="${item.id}">
                            <div id="cart-pic-section">
                                <img src="${item.img}" alt="${item.name}" onerror="this.src='/images/placeholder.jpg'">
                                <p>${item.name} <span class="qty-display">x${item.qty}</span></p>
                            </div>
                            <p>$${subtotal.toFixed(2)}</p>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const shipping = 0;
        const total = subtotal + shipping;

        // Full HTML with separate sections
        checkoutContainer.innerHTML = `
            ${productHTML}
            
            <div class="cart-summary">
                <div class="undl-fl">
                    <p>Subtotal:</p>
                    <p>$${subtotal.toFixed(2)}</p>
                </div>
                <div class="undl-fl">
                    <p>Shipping:</p>
                    <p>${shipping === 0 ? "Free" : "$" + shipping}</p>
                </div>
                <div class="pg-flex-sb">
                    <p>Total:</p>
                    <p>$${total.toFixed(2)}</p>
                </div>
                
                <div class="payment-methods">
                    <div>
                        <input type="radio" name="payment-meth" id="bank">
                        <label for="bank">Bank Transfer</label>
                    </div>
                    <div>
                        <input type="radio" name="payment-meth" id="cash">
                        <label for="cash">Cash on Delivery</label>
                    </div>
                </div>
                
                <div class="coupon-section" id="coup-container">
                    <input type="text" placeholder="Coupon Code">
                    <button class="colored-btn">Apply Coupon</button>
                </div>
                
                <button class="colored-btn" id="place-order-btn">Place Order</button>
            </div>
        `;
    }

    renderCheckout();
    
    // Optional: Add event listener for place order
    document.addEventListener('click', (e) => {
        if (e.target.id === 'place-order-btn') {
            const selectedPayment = document.querySelector('input[name="payment-meth"]:checked');
            if (!selectedPayment) {
                alert('Please select a payment method');
                return;
            }
            alert(`Order placed with ${selectedPayment.id === 'bank' ? 'Bank Transfer' : 'Cash on Delivery'}`);
        }
    });
});