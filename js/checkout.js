// checkout.js - Works with global cart system

window.addEventListener("DOMContentLoaded", async () => {

    const checkoutContainer = document.querySelector(".check-out-prev");
    if (!checkoutContainer) return;

    // Wait for cart system to be ready
    await waitForCartSystem();
    
    // Get cart from cartSystem or localStorage as fallback
    let cart = [];
    
    if (window.cartSystem && window.cartSystem.cart) {
        cart = window.cartSystem.cart;
        console.log('🛒 Cart loaded from cartSystem:', cart.length, 'items');
    } else {
        cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log('🛒 Cart loaded from localStorage:', cart.length, 'items');
    }

    // Payment method logos
    const paymentLogos = {
        visa: "/images/payments/Visa_Inc._logo_(2021–present).svg.png",
        mastercard: "/images/payments/master.png",
        paypal: "/images/payments/paypalpng.png",
        applepay: "/images/payments/apple.png",
        googlepay: "/images/payments/google.png",
        bank_transfer: "/images/bank-transfer.png"
    };

    // Helper function to wait for cart system
    function waitForCartSystem() {
        return new Promise((resolve) => {
            if (window.cartSystem && window.cartSystem.isInitialized) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.cartSystem && window.cartSystem.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => resolve(), 3000);
            }
        });
    }

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

    // Helper function to format price
    function formatPrice(price) {
        return `$${Number(price || 0).toFixed(2)}`;
    }

    // Make formatPrice available globally
    window.formatPrice = formatPrice;

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
                            <p class="item-subtotal">${formatPrice(subtotal)}</p>
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
                    <p>${formatPrice(subtotal)}</p>
                </div>
                <div class="undl-fl">
                    <p>Shipping:</p>
                    <p>${shipping === 0 ? "Free" : "$" + shipping}</p>
                </div>
                <div class="pg-flex-sb">
                    <p>Total:</p>
                    <p>${formatPrice(total)}</p>
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

// ==================== ORDER CONFIRMATION MODAL ====================

function showOrderConfirmationModal(orderDetails) {
    // Remove existing modal if any
    const existingModal = document.getElementById('order-confirmation-modal');
    if (existingModal) existingModal.remove();
    
    // Format items for display
    const itemsHtml = orderDetails.items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                ${item.color ? `<br><small>Color: ${item.color}</small>` : ''}
                ${item.size ? `<small>Size: ${item.size}</small>` : ''}
            </div>
            <div>
                x${item.quantity} = ${window.formatPrice ? window.formatPrice(item.price * item.quantity) : '$' + (item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');
    
    const modalHtml = `
        <div id="order-confirmation-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000; animation: fadeIn 0.3s ease;">
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 90%; max-height: 85%; overflow: auto; animation: slideIn 0.3s ease;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 25px; text-align: center; border-radius: 16px 16px 0 0;">
                    <i class="fas fa-check-circle" style="font-size: 60px; margin-bottom: 10px;"></i>
                    <h2 style="margin: 0; font-size: 24px;">Order Confirmed!</h2>
                    <p style="margin: 5px 0 0; opacity: 0.9;">Thank you for your purchase</p>
                </div>
                
                <!-- Body -->
                <div style="padding: 20px;">
                    <!-- Order ID -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                        <small style="color: #666;">Order ID</small>
                        <h3 style="margin: 5px 0 0; color: #333;">#${orderDetails.orderId}</h3>
                    </div>
                    
                    <!-- Order Items -->
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px; color: #333;">Order Items</h4>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; padding: 0 10px;">
                            ${itemsHtml}
                        </div>
                    </div>
                    
                    <!-- Total -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Subtotal:</span>
                            <span>${window.formatPrice ? window.formatPrice(orderDetails.subtotal) : '$' + orderDetails.subtotal.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Shipping:</span>
                            <span>Free</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 5px;">
                            <span>Total:</span>
                            <span style="color: #28a745;">${window.formatPrice ? window.formatPrice(orderDetails.total) : '$' + orderDetails.total.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <!-- Delivery Info -->
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px; color: #0066cc;">Delivery Information</h4>
                        <div style="font-size: 14px;">
                            <div><strong>${escapeHtml(orderDetails.customerInfo.name)}</strong></div>
                            <div>${orderDetails.customerInfo.phone}</div>
                            <div>${orderDetails.customerInfo.address}</div>
                        </div>
                    </div>
                    
                    <!-- Payment Info -->
                    <div style="background: ${orderDetails.paymentMethod === 'cash' ? '#fff3cd' : '#d4edda'}; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px; color: ${orderDetails.paymentMethod === 'cash' ? '#856404' : '#155724'};">Payment Information</h4>
                        <div><strong>Method:</strong> ${orderDetails.paymentMethod === 'cash' ? 'Cash on Delivery' : 
                                    orderDetails.paymentMethod === 'bank' ? 'Bank Transfer' : 
                                    orderDetails.paymentMethod}</div>
                        <div><strong>Status:</strong> 
                            <span style="color: ${orderDetails.paymentMethod === 'cash' ? '#ff9800' : '#28a745'}">
                                ${orderDetails.paymentMethod === 'cash' ? 'Pending' : 'Paid'}
                            </span>
                        </div>
                        ${orderDetails.paymentMethod === 'cash' ? 
                            '<small style="color: #856404;">Please keep exact change ready for delivery</small>' : 
                            '<small style="color: #155724;">Payment completed successfully</small>'}
                    </div>
                    
                    <!-- Bank Transfer Details (if applicable) -->
                    ${orderDetails.bankDetails ? `
                        <div style="background: #e7f3ff; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px; color: #0066cc;">Bank Transfer Details</h4>
                            <div><strong>Bank:</strong> ${orderDetails.bankDetails.bankName}</div>
                            <div><strong>Account Name:</strong> ${orderDetails.bankDetails.accountName}</div>
                            <div><strong>Account Number:</strong> ${orderDetails.bankDetails.accountNumber}</div>
                            <div><strong>Reference:</strong> ${orderDetails.bankDetails.reference}</div>
                            <div><strong>Amount:</strong> ${window.formatPrice ? window.formatPrice(orderDetails.bankDetails.amount) : '$' + orderDetails.bankDetails.amount}</div>
                            <small>Please use the reference number when making payment</small>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Footer -->
                <div style="padding: 20px; border-top: 1px solid #eee; display: flex; gap: 10px;">
                    <button onclick="closeOrderConfirmationModal()" class="colored-btn" style="flex: 1; background: #6c757d;">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button onclick="window.location.href='/order&payment/order-tracking.html?orderId=${orderDetails.orderId}'" class="colored-btn" style="flex: 1;">
                        <i class="fas fa-truck"></i> Track Order
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add animation styles if not present
    if (!document.getElementById('modal-animation-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-animation-styles';
        styles.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
}

function closeOrderConfirmationModal() {
    const modal = document.getElementById('order-confirmation-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// Make functions globally available
window.closeOrderConfirmationModal = closeOrderConfirmationModal;

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== HANDLE PLACE ORDER ====================

// Handle place order button click
document.addEventListener('click', async (e) => {
    if (e.target.id === 'place-order-btn') {
        console.log('🔴 Place order button clicked!');
        
        // Get fresh cart data from cartSystem or localStorage
        let cart = [];
        
        if (window.cartSystem && window.cartSystem.cart) {
            cart = window.cartSystem.cart;
            console.log('Cart from cartSystem:', cart.length, 'items');
        } else {
            cart = JSON.parse(localStorage.getItem("cart")) || [];
            console.log('Cart from localStorage:', cart.length, 'items');
        }
        
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
            const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            const total = subtotal;
            
            // Collect customer info
            const customerInfo = await window.paymentProcessor.collectCustomerInfo();
            
            if (!customerInfo) {
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
                return;
            }
            
            // Prepare order data
            const orderData = {
                userId: window.cartSystem?.userId || null,
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
                subtotal: subtotal,
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
                // Clear cart after successful order
                if (window.cartSystem) {
                    await window.cartSystem.clearCart();
                } else {
                    localStorage.removeItem('cart');
                }
                
                // Prepare order details for modal
                const orderDetails = {
                    orderId: result.orderId,
                    items: orderData.items,
                    subtotal: subtotal,
                    total: total,
                    paymentMethod: selectedPayment.value,
                    customerInfo: customerInfo,
                    bankDetails: result.bankDetails || null
                };
                
                // Show confirmation modal
                showOrderConfirmationModal(orderDetails);
                
                // Reset button
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
                
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