// checkout.js - Only handles UI rendering and triggers payment

window.addEventListener("DOMContentLoaded", () => {

    const checkoutContainer = document.querySelector(".check-out-prev");

    if (!checkoutContainer) return;

    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    console.log('🛒 Cart loaded:', cart.length, 'items');

    // Payment method logos
    const paymentLogos = {
        visa: "/images/payments/Visa_Inc._logo_(2021–present).svg.png",
        mastercard: "/images/payments/master.png",
        paypal: "/images/payments/paypalpng.png",
        applepay: "/images/payments/apple.png",
        googlepay: "/images/payments/google.png",
        bank_transfer: "/images/bank-transfer.png"
    };

    // Helper function to format item details
    function getItemDetails(item) {
        const details = [];
        
        if (item.color && item.color !== 'null' && item.color !== 'undefined' && item.color.trim() !== '') {
            details.push(`${item.color}`);
        }
        
        if (item.size && item.size !== 'null' && item.size !== 'undefined' && item.size.trim() !== '') {
            details.push(`${item.size}`);
        }
        
        if (details.length === 0) return '';
        if (details.length === 1) return `(${details[0]})`;
        return `(${details.join(', ')})`;
    }

    // Render checkout page
    function renderCheckout() {
        if (cart.length === 0) {
            checkoutContainer.innerHTML = `<p>Your cart is empty</p>`;
            return;
        }

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

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const shipping = 0;
        const total = subtotal + shipping;

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
                    <input type="text" id="coupon-code" placeholder="Coupon Code">
                    <button class="colored-btn" id="apply-coupon-btn">Apply Coupon</button>
                </div>
                
                <button class="colored-btn" id="place-order-btn">Place Order</button>
            </div>
        `;
    }

    renderCheckout();
});

// Handle place order button click
document.addEventListener('click', async (e) => {
    if (e.target.id === 'place-order-btn') {
        console.log('🔴 Place order button clicked!');
        
        // Get fresh cart data
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        const selectedPayment = document.querySelector('input[name="payment-meth"]:checked');
        console.log('Selected payment method:', selectedPayment?.value);
        
        if (!selectedPayment) {
            alert('Please select a payment method');
            return;
        }
        
        // Check if payment processor is available
        if (!window.paymentProcessor) {
            console.error('❌ Payment processor not found! Waiting...');
            alert('Payment system is loading. Please wait a moment and try again.');
            return;
        }
        
        // Show loading state
        const placeOrderBtn = e.target;
        const originalText = placeOrderBtn.textContent;
        placeOrderBtn.textContent = 'Processing...';
        placeOrderBtn.disabled = true;
        
        try {
            const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            
            // Collect customer info
            const customerInfo = await window.paymentProcessor.collectCustomerInfo();
            
            if (!customerInfo) {
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
                return;
            }
            
            // Prepare order data
            const orderData = {
                userId: null,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.qty,
                    color: item.color || null,
                    size: item.size || null,
                    img: item.img
                })),
                total: total,
                paymentMethod: selectedPayment.value === 'cash' ? 'cash_on_delivery' : 
                              selectedPayment.value === 'bank' ? 'bank_transfer' : 
                              selectedPayment.value,
                customerInfo: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                    address: customerInfo.address
                }
            };
            
            console.log('Processing order:', orderData);
            
            // Process payment
            const result = await window.paymentProcessor.processPayment(orderData, selectedPayment.value);
            
            if (result.success) {
                localStorage.removeItem('cart');
                
                if (selectedPayment.value === 'cash') {
                    alert(`✅ Order Placed Successfully!\n\n📦 Order ID: ${result.orderId}\n💰 Amount: ₦${total.toFixed(2)}\n📊 Status: Pending\n\nWe will contact you at ${customerInfo.phone}`);
                    window.location.href = `/order-tracking.html?orderId=${result.orderId}`;
                } else if (selectedPayment.value === 'bank') {
                    alert(`📋 Order Saved!\n\nOrder ID: ${result.orderId}\n\nPlease transfer ₦${result.bankDetails.amount} to:\nBank: ${result.bankDetails.bankName}\nAccount: ${result.bankDetails.accountNumber}\nReference: ${result.bankDetails.reference}`);
                    window.location.href = `/order-tracking.html?orderId=${result.orderId}`;
                }
            } else {
                alert(`❌ Failed: ${result.error}`);
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Order error:', error);
            alert(`Error: ${error.message}`);
            placeOrderBtn.textContent = originalText;
            placeOrderBtn.disabled = false;
        }
    }
});