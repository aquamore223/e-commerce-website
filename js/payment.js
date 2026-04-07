 // payment.js - Handles all payment processing and PocketBase operations

class PaymentProcessor {
    constructor() {
        this.isProcessing = false;
        this.pb = null;
        this.initPocketBase();
    }

    // Initialize PocketBase using the existing global pb or create new one
    initPocketBase() {
        try {
            // Use existing global pb from index.js if available
            if (window.pb) {
                this.pb = window.pb;
                console.log('✅ Using existing PocketBase instance from index.js');
                console.log('PocketBase URL:', this.pb.baseUrl);
                this.testConnection();
            } 
            // Otherwise create new instance
            else if (typeof PocketBase !== 'undefined') {
                this.pb = new PocketBase('https://itrain.services.hodessy.com');
                window.pb = this.pb; // Make it global
                console.log('✅ New PocketBase instance created:', this.pb.baseUrl);
                this.testConnection();
            } else {
                console.error('❌ PocketBase SDK not loaded!');
            }
        } catch (error) {
            console.error('❌ Failed to initialize PocketBase:', error);
        }
    }

    // Test PocketBase connection
    async testConnection() {
        try {
            console.log('Testing PocketBase connection...');
            const health = await this.pb.health.check();
            console.log('✅ PocketBase connection successful!', health);
            
            // Try to list collections
            const collections = await this.pb.collections.getList();
            console.log('📚 Available collections:', collections.items.map(c => c.name));
            
            // Check if orders collection exists
            const hasOrders = collections.items.some(c => c.name === 'orders');
            if (hasOrders) {
                console.log('✅ "orders" collection found!');
            } else {
                console.warn('⚠️ "orders" collection not found! Please create it in PocketBase admin.');
            }
        } catch (error) {
            console.error('❌ PocketBase connection test failed:', error);
        }
    }

    // Save order to PocketBase
  async saveOrderToDatabase(orderData) {
    console.log('🔵 saveOrderToDatabase called');
    
    if (!this.pb) {
        console.error('❌ PocketBase not available');
        return this.saveOrderLocally(orderData);
    }

    try {
        // Get userId from multiple sources
        let userId = null;
        
        // Source 1: pb.authStore
        if (this.pb.authStore && this.pb.authStore.isValid) {
            userId = this.pb.authStore.model?.id;
            console.log('UserId from pb.authStore:', userId);
        }
        
        // Source 2: localStorage
        if (!userId) {
            const authData = localStorage.getItem('pocketbase_auth');
            if (authData) {
                try {
                    const auth = JSON.parse(authData);
                    userId = auth.model?.id;
                    console.log('UserId from localStorage:', userId);
                } catch (e) {}
            }
        }
        
        // Source 3: window.authSystem
        if (!userId && window.authSystem?.getUser()) {
            userId = window.authSystem.getUser().id;
            console.log('UserId from authSystem:', userId);
        }
        
        console.log('Final userId to save:', userId);
        
        const orderRecord = {
            userId: userId,  // This must match the field name in PocketBase
            customerName: orderData.customerInfo.name,
            email: orderData.customerInfo.email,
            phone: orderData.customerInfo.phone,
            address: orderData.customerInfo.address,
            items: orderData.items,
            total: orderData.total,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'pending'
        };
        
        const result = await this.pb.collection('orders').create(orderRecord);
        console.log('✅ Order saved with userId:', result.userId);
        
        return {
            success: true,
            orderId: result.id,
            orderData: result
        };
    } catch (error) {
        console.error('❌ Database save error:', error);
        return this.saveOrderLocally(orderData);
    }
}

    // Fallback: Save order locally
    saveOrderLocally(orderData) {
        try {
            let localOrders = JSON.parse(localStorage.getItem('local_orders')) || [];
            
            const localOrder = {
                id: `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                ...orderData,
                savedAt: new Date().toISOString(),
                isLocal: true
            };
            
            localOrders.push(localOrder);
            localStorage.setItem('local_orders', JSON.stringify(localOrders));
            console.log('💾 Order saved locally:', localOrder);
            
            return {
                success: true,
                orderId: localOrder.id,
                isLocal: true
            };
        } catch (error) {
            console.error('❌ Local save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process Cash on Delivery
    async processCOD(orderData) {
        console.log('🟢 Processing Cash on Delivery...');
        const saveResult = await this.saveOrderToDatabase(orderData);
        
        if (saveResult.success) {
            return {
                success: true,
                paymentMethod: 'cash_on_delivery',
                orderId: saveResult.orderId,
                isLocal: saveResult.isLocal,
                message: 'Order placed successfully! Pay cash upon delivery.'
            };
        } else {
            return {
                success: false,
                error: saveResult.error
            };
        }
    }

    // Process Bank Transfer
    async processBankTransfer(orderData) {
        console.log('🟢 Processing Bank Transfer...');
        const saveResult = await this.saveOrderToDatabase(orderData);
        
        if (saveResult.success) {
            const bankDetails = {
                bankName: 'Your Bank Name',
                accountName: 'Your Business Name',
                accountNumber: '1234567890',
                reference: saveResult.orderId,
                amount: orderData.total
            };
            
            return {
                success: true,
                paymentMethod: 'bank_transfer',
                orderId: saveResult.orderId,
                bankDetails: bankDetails
            };
        } else {
            return {
                success: false,
                error: saveResult.error
            };
        }
    }

    // Main payment handler
    async processPayment(orderData, paymentMethod) {
        console.log('🟡 processPayment called with method:', paymentMethod);
        
        if (this.isProcessing) {
            return {
                success: false,
                error: 'Payment already in progress'
            };
        }
        
        this.isProcessing = true;
        
        try {
            let result;
            
            switch(paymentMethod) {
                case 'cash':
                    result = await this.processCOD(orderData);
                    break;
                case 'bank':
                    result = await this.processBankTransfer(orderData);
                    break;
                default:
                    result = {
                        success: false,
                        error: `Unsupported payment method: ${paymentMethod}`
                    };
            }
            
            console.log('🟢 Payment result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Payment error:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // Collect customer information
    async collectCustomerInfo() {
        console.log('📝 Collecting customer info...');
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'customer-info-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                    <h3>Delivery Information Required</h3>
                    <form id="customer-info-form">
                        <div style="margin-bottom: 15px;">
                            <label>Full Name *</label>
                            <input type="text" id="cust-name" required style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>Email *</label>
                            <input type="email" id="cust-email" required style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label>Phone Number *</label>
                            <input type="tel" id="cust-phone" required style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label>Delivery Address *</label>
                            <textarea id="cust-address" required rows="3" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="submit" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Confirm Order</button>
                            <button type="button" id="cancel-cod" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const form = document.getElementById('customer-info-form');
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('cust-name').value;
                const email = document.getElementById('cust-email').value;
                const phone = document.getElementById('cust-phone').value;
                const address = document.getElementById('cust-address').value;
                
                if (name && email && phone && address) {
                    modal.remove();
                    console.log('📝 Customer info collected:', { name, email, phone, address });
                    resolve({ name, email, phone, address });
                } else {
                    alert('Please fill in all fields');
                }
            };
            
            document.getElementById('cancel-cod').onclick = () => {
                modal.remove();
                console.log('❌ Customer cancelled');
                resolve(null);
            };
        });
    }
}

// Wait for window.pb to be ready from index.js
function initPaymentProcessor() {
    if (window.pb) {
        console.log('✅ Found global pb, creating payment processor');
        window.paymentProcessor = new PaymentProcessor();
    } else {
        console.log('⏳ Waiting for pb to be ready...');
        setTimeout(initPaymentProcessor, 500);
    }
}

// Start initialization
initPaymentProcessor();
console.log('✅ Payment processor script loaded');