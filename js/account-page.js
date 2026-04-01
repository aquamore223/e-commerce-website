// account-page.js - Fully dynamic account page with PocketBase integration

// Account page initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Account page loading...");
    setupSidebarToggle();
    
    // Wait for auth system to be ready
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkAuth = setInterval(() => {
        attempts++;
        
        if (window.authSystem) {
            console.log("Auth system found, initializing...");
            clearInterval(checkAuth);
            initAccountPage();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkAuth);
            console.error("Auth system not loaded after 3 seconds");
            
            if (window.pb && window.pb.authStore && window.pb.authStore.isValid) {
                console.log("Found valid PocketBase auth token, but no auth system. Creating one...");
                if (typeof AuthSystem !== 'undefined') {
                    window.authSystem = new AuthSystem();
                    setTimeout(() => initAccountPage(), 500);
                } else {
                    console.error("AuthSystem class not found");
                    window.location.href = "/user/signup.html";
                }
            } else {
                console.log("No valid session found, redirecting to signup");
                window.location.href = "/user/signup.html";
            }
        }
    }, 100);
});

// Setup sidebar toggle for mobile
function setupSidebarToggle() {
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.getElementById('account-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close sidebar on window resize if screen becomes larger
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

async function initAccountPage() {
    console.log("Initializing account page...");
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const isLoggedIn = window.authSystem?.isLoggedIn();
    console.log("Is logged in check:", isLoggedIn);
    
    if (!isLoggedIn) {
        if (window.pb && window.pb.authStore && window.pb.authStore.isValid) {
            console.log("PocketBase auth is valid, forcing user load...");
            const userId = window.pb.authStore.model?.id;
            if (userId) {
                try {
                    const userRecord = await window.pb.collection("exclusive_users_collection").getOne(userId);
                    window.authSystem.currentUser = userRecord;
                    console.log("User loaded manually:", userRecord);
                } catch (err) {
                    console.error("Failed to load user:", err);
                }
            }
        }
        
        if (!window.authSystem?.isLoggedIn()) {
            console.log("User not logged in, redirecting to signup");
            window.location.href = "/user/signup.html";
            return;
        }
    }
    
    console.log("User logged in, loading account page...");
    await loadUserInfo();
    loadAccountSections();
    setupProfileForm();
    setupLogoutButton();
    setupActiveLinkHighlight();
    
    // Show profile section by default
    showProfileSection();
}

// Setup active link highlighting
function setupActiveLinkHighlight() {
    const links = document.querySelectorAll('.acct-details a');
    links.forEach(link => {
        link.addEventListener('click', function() {
            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Close sidebar on mobile after click
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('account-sidebar');
                const overlay = document.querySelector('.sidebar-overlay');
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// Load user info from PocketBase
async function loadUserInfo() {
    const user = window.authSystem?.getUser();
    console.log("Loading user info:", user);
    
    if (user) {
        const displayName = user.name || user.email || 'User';
        const usernameElement = document.getElementById('acct-username');
        if (usernameElement) {
            usernameElement.textContent = displayName;
        }
        
        const dispHd = document.getElementById('disp-hd');
        if (dispHd) {
            dispHd.innerHTML = `<a href="/index.html">Home</a> / <a href="#">My Account</a>`;
        }
        
        // Populate form fields
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        const addressInput = document.getElementById('address');
        
        if (firstNameInput) {
            const nameParts = (user.name || '').split(' ');
            firstNameInput.value = nameParts[0] || '';
            if (lastNameInput) lastNameInput.value = nameParts.slice(1).join(' ') || '';
        }
        
        if (emailInput) emailInput.value = user.email || '';
        if (addressInput) addressInput.value = user.address || '';
    }
}

// Dynamic account sections
function loadAccountSections() {
    const sections = [
        {
            title: "Manage My Account",
            links: [
                { name: "My Profile", action: "showProfile" },
                { name: "Address Book", action: "showAddress" },
                { name: "My Payment Options", action: "showPayment" }
            ]
        },
        {
            title: "My Orders",
            links: [
                { name: "My Returns", action: "showReturns" },
                { name: "My Cancellations", action: "showCancellations" }
            ]
        },
        {
            title: "My Wishlist",
            links: [
                { name: "My Wishlist", href: "/user/wishlist.html" }
            ]
        }
    ];

    const container = document.querySelector('.acct-fd');
    if (!container) return;
    
    container.innerHTML = '';

    sections.forEach(section => {
        const h4 = document.createElement('h4');
        h4.textContent = section.title;
        container.appendChild(h4);

        const div = document.createElement('div');
        div.classList.add('acct-details');

        section.links.forEach(link => {
            const p = document.createElement('p');
            const a = document.createElement('a');
            a.href = link.href || '#';
            a.textContent = link.name;
            a.style.cursor = 'pointer';
            a.style.textDecoration = 'none';
            
            if (link.action) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleSectionClick(link.action);
                });
            }
            
            p.appendChild(a);
            div.appendChild(p);
        });

        container.appendChild(div);
    });

    // Update wishlist count
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const wishlistLink = container.querySelector('a[href="/user/wishlist.html"]');
    if (wishlistLink) wishlistLink.textContent = `My Wishlist (${wishlist.length})`;
}

// Handle section clicks
function handleSectionClick(action) {
    hideAllSections();
    
    switch(action) {
        case 'showProfile':
            showProfileSection();
            break;
        case 'showAddress':
            showAddressSection();
            break;
        case 'showPayment':
            showPaymentSection();
            break;
        case 'showReturns':
            showOrdersSection('returns');
            break;
        case 'showCancellations':
            showOrdersSection('cancellations');
            break;
    }
}

function hideAllSections() {
    const profileSection = document.querySelector('#profile-section');
    const addressSection = document.getElementById('address-section');
    const paymentSection = document.getElementById('payment-section');
    const ordersSection = document.getElementById('orders-section');
    
    if (profileSection) profileSection.style.display = 'none';
    if (addressSection) addressSection.style.display = 'none';
    if (paymentSection) paymentSection.style.display = 'none';
    if (ordersSection) ordersSection.style.display = 'none';
}

function showProfileSection() {
    const profileSection = document.querySelector('#profile-section');
    if (profileSection) profileSection.style.display = 'block';
}

function showAddressSection() {
    let addressSection = document.getElementById('address-section');
    addressSection.style.display = 'block';
}

function showPaymentSection() {
    let paymentSection = document.getElementById('payment-section');
    paymentSection.style.display = 'block';
}

function showOrdersSection(type) {
    let ordersSection = document.getElementById('orders-section');
    ordersSection.style.display = 'block';
    loadOrders(type);
}

// Load orders
function loadOrders(type) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    const orders = [
        { id: 'ORD-001', date: '2024-01-15', total: 299.99, status: 'Delivered', type: 'order' },
        { id: 'ORD-002', date: '2024-02-20', total: 159.99, status: 'Processing', type: 'order' },
        { id: 'RET-001', date: '2024-03-01', total: 89.99, status: 'Refunded', type: 'return' },
        { id: 'CAN-001', date: '2024-02-10', total: 49.99, status: 'Cancelled', type: 'cancellation' }
    ];
    
    const filteredOrders = orders.filter(order => {
        if (type === 'returns') return order.type === 'return';
        if (type === 'cancellations') return order.type === 'cancellation';
        return order.type === 'order';
    });
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
    }
    
    ordersList.innerHTML = filteredOrders.map(order => `
        <div class="order-item">
            <p><strong>Order #${order.id}</strong></p>
            <p>Date: ${order.date}</p>
            <p>Total: $${order.total}</p>
            <p>Status: <span style="color: ${order.status === 'Delivered' ? '#4CAF50' : '#ff9800'}">${order.status}</span></p>
        </div>
    `).join('');
}

// Setup profile form
function setupProfileForm() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });
}

async function saveProfile() {
    const currentUser = window.authSystem?.getUser();
    if (!currentUser) {
        alert('Please login again');
        window.location.href = "/user/signup.html";
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const email = document.getElementById('email')?.value;
    const address = document.getElementById('address')?.value;

    const updateData = {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        address: address
    };

    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            alert('Please enter your current password to change it.');
            return;
        }
        
        try {
            await window.pb.collection("exclusive_users_collection").authWithPassword(currentUser.email, currentPassword);
        } catch (error) {
            alert('Current password is incorrect!');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('New password and confirm password do not match!');
            return;
        }
        
        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }
        
        updateData.password = newPassword;
        updateData.passwordConfirm = newPassword;
    }

    try {
        const updatedUser = await window.pb.collection("exclusive_users_collection").update(currentUser.id, updateData);
        window.authSystem.currentUser = updatedUser;
        
        alert('Profile updated successfully!');
        await loadUserInfo();
        
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
    } catch (error) {
        console.error("Update error:", error);
        alert('Error updating profile: ' + (error.message || 'Unknown error'));
    }
}

function setupLogoutButton() {
    const logoutLinks = document.querySelectorAll('#logout-btn, .logout-btn, a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.authSystem) {
                window.authSystem.logout();
            }
        });
    });
}

// Global functions for address/payment
window.saveAddress = function() {
    const address = {
        street: document.getElementById('street-address')?.value,
        city: document.getElementById('city')?.value,
        state: document.getElementById('state')?.value,
        zip: document.getElementById('zip-code')?.value,
        country: document.getElementById('country')?.value
    };
    localStorage.setItem('userAddress', JSON.stringify(address));
    alert('Address saved successfully!');
};

window.savePayment = function() {
    const payment = {
        cardNumber: document.getElementById('card-number')?.value,
        cardName: document.getElementById('card-name')?.value,
        expiry: document.getElementById('expiry-date')?.value,
        cvv: document.getElementById('cvv')?.value
    };
    localStorage.setItem('userPayment', JSON.stringify(payment));
    alert('Payment method saved successfully!');
};