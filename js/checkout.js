// checkout.js
window.addEventListener("DOMContentLoaded", () => {

    const checkoutContainer = document.querySelector(".check-out-prev");

    if (!checkoutContainer) return;

    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Payment method logos
    const paymentLogos = {
        visa: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png",
        mastercard: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/2560px-Mastercard-logo.svg.png",
        paypal: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/2560px-PayPal.svg.png",
        applepay: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/2560px-Apple_Pay_logo.svg.png",
        googlepay: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Google_Pay_Logo.svg/2560px-Google_Pay_Logo.svg.png",
        bank_transfer: "/images/bank-transfer.png" // You can add your own bank icon
    };

    // Helper function to format item details (color, size)
    function getItemDetails(item) {
        const details = [];
        
        // Add color if exists and not empty
        if (item.color && item.color !== 'null' && item.color !== 'undefined' && item.color.trim() !== '') {
            details.push(`${item.color}`);
        }
        
        // Add size if exists and not empty
        if (item.size && item.size !== 'null' && item.size !== 'undefined' && item.size.trim() !== '') {
            details.push(`${item.size}`);
        }
        
        // Format the details string
        if (details.length === 0) return '';
        if (details.length === 1) return `(${details[0]})`;
        return `(${details.join(', ')})`;
    }

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
                    const itemDetails = getItemDetails(item);
                    const displayName = itemDetails ? `${item.name} ${itemDetails}` : item.name;
                    
                    return `
                        <div class="cart-flex cart-item" data-id="${item.id}" data-color="${item.color || ''}" data-size="${item.size || ''}" data-qty="${item.qty}">
                            <div id="cart-pic-section">
                                <img src="${item.img}" alt="${item.name}" onerror="this.src='/images/placeholder.jpg'">
                                <div class="cart-item-info">
                                    <p class="item-name">${displayName}</p>
                                    <span class="qty-display">Qty: ${item.qty}</span>
                                </div>
                            </div>
                            <p class="item-subtotal">$${subtotal.toFixed(2)}</p>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const shipping = 0;
        const total = subtotal + shipping;

        // Full HTML with separate sections and payment logos
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
                    <h4>Select Payment Method</h4>
                    
                    <div class="all-payment-options">
                       <div class="payment-option">
                        <input type="radio" name="payment-meth" id="visa" value="visa">
                        <label for="visa" class="payment-label">
                            <img src="${paymentLogos.visa}" alt="Visa" class="payment-logo">
                            <span>Visa Card</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="mastercard" value="mastercard">
                        <label for="mastercard" class="payment-label">
                            <img src="${paymentLogos.mastercard}" alt="Mastercard" class="payment-logo">
                            <span>Mastercard</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="paypal" value="paypal">
                        <label for="paypal" class="payment-label">
                            <img src="${paymentLogos.paypal}" alt="PayPal" class="payment-logo">
                            <span>PayPal</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="applepay" value="applepay">
                        <label for="applepay" class="payment-label">
                            <img src="${paymentLogos.applepay}" alt="Apple Pay" class="payment-logo">
                            <span>Apple Pay</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="googlepay" value="googlepay">
                        <label for="googlepay" class="payment-label">
                            <img src="${paymentLogos.googlepay}" alt="Google Pay" class="payment-logo">
                            <span>Google Pay</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="bank" value="bank">
                        <label for="bank" class="payment-label">
                            <i class="fas fa-university"></i>
                            <span>Bank Transfer</span>
                        </label>
                    </div>
                    
                    <div class="payment-option">
                        <input type="radio" name="payment-meth" id="cash" value="cash">
                        <label for="cash" class="payment-label">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Cash on Delivery</span>
                        </label>
                    </div>
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
    
    // Add event listener for place order
    document.addEventListener('click', (e) => {
        if (e.target.id === 'place-order-btn') {
            const selectedPayment = document.querySelector('input[name="payment-meth"]:checked');
            if (!selectedPayment) {
                alert('Please select a payment method');
                return;
            }
            
            // Get payment method display name
            const paymentNames = {
                visa: 'Visa Card',
                mastercard: 'Mastercard',
                paypal: 'PayPal',
                applepay: 'Apple Pay',
                googlepay: 'Google Pay',
                bank: 'Bank Transfer',
                cash: 'Cash on Delivery'
            };
            
            // Get order summary
            const orderSummary = cart.map(item => {
                const details = [];
                if (item.color) details.push(`Color: ${item.color}`);
                if (item.size) details.push(`Size: ${item.size}`);
                const detailsText = details.length ? ` (${details.join(', ')})` : '';
                return `${item.name}${detailsText} x${item.qty}`;
            }).join('\n');
            
            const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            
            alert(`Order placed with ${paymentNames[selectedPayment.value]}\n\nItems:\n${orderSummary}\n\nTotal: $${total.toFixed(2)}`);
        }
    });
});