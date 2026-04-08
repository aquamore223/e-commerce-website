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
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const isLoggedIn = window.authSystem?.isLoggedIn();
     
    
    if (!isLoggedIn) {
        if (window.pb && window.pb.authStore && window.pb.authStore.isValid) {
             
            const userId = window.pb.authStore.model?.id;
            if (userId) {
                try {
                    const userRecord = await window.pb.collection("exclusive_users_collection").getOne(userId);
                    window.authSystem.currentUser = userRecord;
                    
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
    showSectionFromHash();
    
    // Load reviews from PocketBase
    await loadUserReviews();
    
    // Show profile section by default
    if (window.location.hash) {
        showSectionFromHash();
    } else {
        showProfileSection();
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        try {
            window.pb.authStore.clear();
            if (window.authSystem) {
                window.authSystem.currentUser = null;
            }
            alert('Logged out successfully');
            window.location.href = "/user/signup.html";
        } catch (err) {
            console.error("Logout error:", err);
        }
    });
}

function showSectionFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    hideAllSections();

    switch (hash) {
        case 'orders':
            showOrdersSection('orders');
            highlightSidebarLink('My Orders');
            break;
        case 'cancellations':
            showOrdersSection('cancellations');
            highlightSidebarLink('My Cancellations');
            break;
        case 'reviews':
            showReviewsSection();
            highlightSidebarLink('My Reviews');
            break;
        case 'profile':
            showProfileSection();
            highlightSidebarLink('My Profile');
            break;
        case 'address':
            showAddressSection();
            highlightSidebarLink('Address Book');
            break;
        case 'payment':
            showPaymentSection();
            highlightSidebarLink('My Payment Options');
            break;
    }
}

// Helper: highlight sidebar link
function highlightSidebarLink(linkText) {
    const links = document.querySelectorAll('.acct-details a');
    links.forEach(l => {
        if (l.textContent.includes(linkText)) {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });
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
                { name: "My Orders", action: "showOrders" },
                { name: "My Returns", action: "showReturns" },
                { name: "My Cancellations", action: "showCancellations" }
            ]
        },
        {
            title: "My Reviews",
            links: [
                { name: "My Reviews", action: "showReviews" }
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
        case 'showOrders':
            showOrdersSection('orders');
            break;
        case 'showReturns':
            showOrdersSection('returns');
            break;
        case 'showCancellations':
            showOrdersSection('cancellations');
            break;
        case 'showReviews':
            showReviewsSection();
            break;
    }
}

function hideAllSections() {
    const profileSection = document.querySelector('#profile-section');
    const addressSection = document.getElementById('address-section');
    const paymentSection = document.getElementById('payment-section');
    const ordersSection = document.getElementById('orders-section');
    const reviewsSection = document.getElementById('reviews-section');
    
    if (profileSection) profileSection.style.display = 'none';
    if (addressSection) addressSection.style.display = 'none';
    if (paymentSection) paymentSection.style.display = 'none';
    if (ordersSection) ordersSection.style.display = 'none';
    if (reviewsSection) reviewsSection.style.display = 'none';
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

function showReviewsSection() {
    let reviewsSection = document.getElementById('reviews-section');
    if (!reviewsSection) {
        createReviewsSection();
    }
    reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection) reviewsSection.style.display = 'block';
    loadUserReviews();
}

function showOrdersSection(type) {
    let ordersSection = document.getElementById('orders-section');
    if (ordersSection) ordersSection.style.display = 'block';
    loadOrders(type);
}

// Create Reviews Section if it doesn't exist
function createReviewsSection() {
    const accountContent = document.querySelector('.account-content');
    if (!accountContent) return;
    
    // Check if reviews section already exists
    if (document.getElementById('reviews-section')) return;
    
    const reviewsSection = document.createElement('div');
    reviewsSection.id = 'reviews-section';
    reviewsSection.className = 'edit-profile';
    reviewsSection.style.display = 'none';
    reviewsSection.innerHTML = `
        <h3>My Reviews & Ratings</h3>
        <div id="reviews-list" class="reviews-container">
            <div class="loading-reviews">Loading your reviews...</div>
        </div>
        <div class="review-stats" id="review-stats"></div>
    `;
    
    accountContent.appendChild(reviewsSection);
}

// ==================== POCKETBASE REVIEWS INTEGRATION ====================

// Load user reviews from PocketBase
async function loadUserReviews() {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    const user = window.authSystem?.getUser();
    if (!user) {
        reviewsList.innerHTML = '<div class="no-reviews">Please login to view your reviews.</div>';
        return;
    }
    
    try {
        // Fetch reviews from PocketBase
        const reviews = await window.pb.collection("reviews").getFullList({
            filter: `userId = "${user.id}"`,
            sort: '-created',
            $autoCancel: false
        });
        
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<div class="no-reviews">You haven\'t written any reviews yet.</div>';
            document.getElementById('review-stats').innerHTML = '';
            return;
        }
        
        // Calculate stats
        const totalReviews = reviews.length;
        const avgRating = reviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews;
        const ratingDistribution = {5:0, 4:0, 3:0, 2:0, 1:0};
        reviews.forEach(rev => {
            ratingDistribution[rev.rating]++;
        });
        
        // Display stats
        const statsContainer = document.getElementById('review-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="review-summary">
                    <div class="avg-rating">
                        <span class="avg-number">${avgRating.toFixed(1)}</span>
                        <div class="stars">${generateStars(Math.round(avgRating))}</div>
                        <span class="total-reviews">${totalReviews} reviews</span>
                    </div>
                    <div class="rating-breakdown">
                        ${[5,4,3,2,1].map(star => `
                            <div class="rating-bar">
                                <span class="star-label">${star} ★</span>
                                <div class="bar-container">
                                    <div class="bar-fill" style="width: ${(ratingDistribution[star] / totalReviews) * 100}%"></div>
                                </div>
                                <span class="bar-count">${ratingDistribution[star]}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Display reviews
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card" data-review-id="${review.id}">
                <div class="review-product-info">
                    <img src="${review.productImage || '/images/placeholder.jpg'}" alt="${review.productName}" onerror="this.src='/images/placeholder.jpg'">
                    <div>
                        <h4>${escapeHtml(review.productName)}</h4>
                        <div class="review-rating">${generateStars(review.rating)}</div>
                        <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="review-content">
                    <h4>${escapeHtml(review.title)}</h4>
                    <p>${escapeHtml(review.comment)}</p>
                    <div class="review-footer">
                        <span class="helpful-count"><i class="fas fa-thumbs-up"></i> ${review.helpful || 0} found helpful</span>
                        <span class="review-status ${review.status || 'pending'}">${review.status || 'pending'}</span>
                        <button class="edit-review-btn" onclick="editReview('${review.id}')">Edit Review</button>
                        <button class="delete-review-btn" onclick="deleteReview('${review.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("Error loading reviews:", error);
        reviewsList.innerHTML = '<div class="no-reviews">Error loading reviews. Please try again later.</div>';
    }
}

// Add new review to PocketBase
window.addReview = async function(productId, productName, productImage, rating, title, comment) {
    const user = window.authSystem?.getUser();
    if (!user) {
        showNotification('Please login to submit a review', 'error');
        return;
    }
    
    try {
        const review = await window.pb.collection("reviews").create({
            userId: user.id,
            productId: productId,
            productName: productName,
            productImage: productImage,
            rating: rating,
            title: title,
            comment: comment,
            date: new Date().toISOString(),
            helpful: 0,
            status: 'pending'
        });
        
        console.log("Review saved to PocketBase:", review);
        showNotification('Review submitted successfully! It will appear after approval.', 'success');
        loadUserReviews(); // Reload reviews
    } catch (error) {
        console.error("Error saving review:", error);
        showNotification('Error saving review: ' + (error.message || 'Unknown error'), 'error');
    }
};

// Edit review in PocketBase
window.editReview = async function(reviewId) {
    try {
        const review = await window.pb.collection("reviews").getOne(reviewId);
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'review-modal';
        modal.innerHTML = `
            <div class="review-modal-content">
                <div class="modal-header">
                    <h3>Edit Your Review</h3>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Rating</label>
                        <div class="star-rating-edit" data-rating="${review.rating}">
                            ${[1,2,3,4,5].map(star => `<span class="star" data-value="${star}">★</span>`).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="edit-review-title" value="${escapeHtml(review.title)}" placeholder="Review title">
                    </div>
                    <div class="form-group">
                        <label>Review</label>
                        <textarea id="edit-review-comment" rows="4" placeholder="Write your review...">${escapeHtml(review.comment)}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Star rating functionality
        const stars = modal.querySelectorAll('.star-rating-edit .star');
        let selectedRating = review.rating;
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value);
                stars.forEach(s => {
                    if (parseInt(s.dataset.value) <= selectedRating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
            // Set initial active stars
            if (parseInt(star.dataset.value) <= review.rating) {
                star.classList.add('active');
            }
        });
        
        modal.querySelector('.close-modal-btn').onclick = () => modal.remove();
        modal.querySelector('.cancel-btn').onclick = () => modal.remove();
        modal.querySelector('.save-btn').onclick = async () => {
            const updatedTitle = modal.querySelector('#edit-review-title').value;
            const updatedComment = modal.querySelector('#edit-review-comment').value;
            
            if (!updatedTitle || !updatedComment) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                await window.pb.collection("reviews").update(reviewId, {
                    rating: selectedRating,
                    title: updatedTitle,
                    comment: updatedComment,
                    date: new Date().toISOString()
                });
                
                showNotification('Review updated successfully!', 'success');
                loadUserReviews();
                modal.remove();
            } catch (error) {
                console.error("Error updating review:", error);
                showNotification('Error updating review', 'error');
            }
        };
    } catch (error) {
        console.error("Error loading review for edit:", error);
        showNotification('Error loading review', 'error');
    }
};

// Delete review from PocketBase
window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
    
    try {
        await window.pb.collection("reviews").delete(reviewId);
        showNotification('Review deleted successfully!', 'success');
        loadUserReviews();
    } catch (error) {
        console.error("Error deleting review:", error);
        showNotification('Error deleting review', 'error');
    }
};

// Generate stars HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star star-filled"></i>';
        } else {
            stars += '<i class="far fa-star star-empty"></i>';
        }
    }
    return stars;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Load orders (mock data - replace with actual API call)
// account-page.js - Now using external CSS

// Function to load orders
async function loadOrders(type = 'normal') {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    // Show loading state
    ordersList.innerHTML = `
        <div class="orders-loading">
            <div class="spinner"></div>
            <p>Loading your orders...</p>
        </div>
    `;

    // Get user from localStorage
    let userId = null;
    let user = null;
    
    try {
        const authData = localStorage.getItem('pocketbase_auth');
        if (authData) {
            const auth = JSON.parse(authData);
            userId = auth.record?.id;
            user = auth.record;
            console.log('User ID:', userId);
        }
    } catch (e) {
        console.error('Error parsing auth:', e);
    }
    
    if (!userId) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">🔒</div>
                <h3>Please Login</h3>
                <p>You need to be logged in to view your orders.</p>
                <a href="/login.html" class="shop-now-link">Login Now</a>
            </div>
        `;
        return;
    }

    try {
        // Make sure pb is initialized
        if (!window.pb) {
            window.pb = new PocketBase('https://itrain.services.hodessy.com');
        }
        
        // Fetch orders for this user
        const orders = await window.pb.collection("orders").getFullList({
            filter: `userId = "${userId}"`,
            sort: '-created',
            $autoCancel: false
        });
        
        console.log("Orders fetched:", orders.length);
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <div class="empty-orders-icon">📦</div>
                    <h3>No Orders Yet</h3>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/shop.html" class="shop-now-link">Start Shopping</a>
                </div>
            `;
            return;
        }

        // Filter by type
        const filteredOrders = orders.filter(order => {
            if (type === 'cancellations') return order.orderStatus === 'cancelled';
            if (type === 'returns') return order.orderStatus === 'returned';
            return order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned';
        });

        if (filteredOrders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <div class="empty-orders-icon">📭</div>
                    <h3>No ${type} Orders</h3>
                    <p>You don't have any ${type} orders.</p>
                </div>
            `;
            return;
        }

        // Render orders with tracking button
        ordersList.innerHTML = filteredOrders.map(order => {
            // Parse items
            let items = order.items;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                } catch (e) {
                    items = [];
                }
            }
            
            // Check if order is not delivered (can be tracked)
            const canTrack = order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled';
            
            return `
                <div class="order-item" data-order-id="${order.id}">
                    <div class="order-header">
                        <div class="order-header-item">
                            <span class="order-header-label">Order ID</span>
                            <span class="order-header-value order-id">#${order.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Order Date</span>
                            <span class="order-header-value">${new Date(order.created).toLocaleDateString()}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Payment Method</span>
                            <span class="order-header-value">${order.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Payment Status</span>
                            <span class="payment-badge payment-${order.paymentStatus}">${order.paymentStatus?.toUpperCase() || 'PENDING'}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Order Status</span>
                            <span class="status-badge status-${order.orderStatus}">${order.orderStatus?.toUpperCase() || 'PENDING'}</span>
                        </div>
                    </div>
                    
                    <div class="order-products">
                        <div class="order-products-title">Products (${items.length})</div>
                        ${items.slice(0, 3).map(item => `
                            <div class="order-product">
                                <img src="${item.img || '/images/placeholder.jpg'}" alt="${item.name}" class="order-product-img" onerror="this.src='/images/placeholder.jpg'">
                                <div class="order-product-info">
                                    <div class="order-product-name">${escapeHtml(item.name)}</div>
                                    <div class="order-product-details">
                                        <span>Qty: ${item.quantity || item.qty}</span>
                                        ${item.color ? `<span>Color: ${item.color}</span>` : ''}
                                        ${item.size ? `<span>Size: ${item.size}</span>` : ''}
                                    </div>
                                </div>
                                <div class="order-product-price">
                                    ${window.formatPrice ? window.formatPrice(item.price * (item.quantity || item.qty)) : `₦${(item.price * (item.quantity || item.qty)).toFixed(2)}`}
                                </div>
                            </div>
                        `).join('')}
                        ${items.length > 3 ? `
                            <div class="order-product" style="justify-content: center; color: #666;">
                                + ${items.length - 3} more items
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-footer">
                        <div class="order-total">
                            <span class="order-total-label">Total Amount:</span>
                            ${window.formatPrice ? window.formatPrice(order.total) : `₦${parseFloat(order.total).toFixed(2)}`}
                        </div>
                        <div class="order-actions">
                            <button onclick="viewOrderDetails('${order.id}')" class="btn-view-details">View Details</button>
                            ${canTrack ? `
                                <button onclick="trackOrder('${order.id}')" class="btn-track-order">
                                    <i class="fas fa-truck"></i> Track Order
                                </button>
                            ` : ''}
                            ${order.orderStatus === 'pending' ? `<button onclick="cancelOrder('${order.id}')" class="btn-cancel-order">Cancel Order</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">⚠️</div>
                <h3>Error Loading Orders</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="shop-now-link">Try Again</button>
            </div>
        `;
    }
}


// View order details
window.viewOrderDetails = async function(orderId) {
    try {
        if (!window.pb) {
            window.pb = new PocketBase('https://itrain.services.hodessy.com');
        }
        
        const order = await window.pb.collection('orders').getOne(orderId, {
            $autoCancel: false
        });
        
        showOrderDetailsModal(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Error loading order details');
    }
};

// Show order details modal
function showOrderDetailsModal(order) {
    let items = order.items;
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch (e) {
            items = [];
        }
    }
    
    const modalHtml = `
        <div class="order-modal" id="order-modal">
            <div class="order-modal-content">
                <div class="order-modal-header">
                    <h2>Order #${order.id.slice(-8).toUpperCase()}</h2>
                    <button class="order-modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="order-modal-body">
                    <div class="order-section">
                        <h3>Order Information</h3>
                        <div class="order-info-grid">
                            <div class="order-info-item">
                                <span class="order-info-label">Order Date</span>
                                <span class="order-info-value">${new Date(order.created).toLocaleString()}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Payment Method</span>
                                <span class="order-info-value">${order.paymentMethod?.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Payment Status</span>
                                <span class="payment-badge payment-${order.paymentStatus}">${order.paymentStatus?.toUpperCase()}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Order Status</span>
                                <span class="status-badge status-${order.orderStatus}">${order.orderStatus?.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h3>Delivery Information</h3>
                        <div class="order-info-grid">
                            <div class="order-info-item">
                                <span class="order-info-label">Full Name</span>
                                <span class="order-info-value">${order.customerName || 'N/A'}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Email</span>
                                <span class="order-info-value">${order.email || 'N/A'}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Phone</span>
                                <span class="order-info-value">${order.phone || 'N/A'}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Address</span>
                                <span class="order-info-value">${order.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h3>Items (${items.length})</h3>
                        <ul class="modal-items-list">
                            ${items.map(item => `
                                <li class="modal-item">
                                    <img src="${item.img || '/images/placeholder.jpg'}" class="modal-item-img" onerror="this.src='/images/placeholder.jpg'">
                                    <div class="modal-item-details">
                                        <div class="modal-item-name">${item.name}</div>
                                        <div class="modal-item-meta">
                                            Quantity: ${item.quantity || item.qty}
                                            ${item.color ? ` | Color: ${item.color}` : ''}
                                            ${item.size ? ` | Size: ${item.size}` : ''}
                                        </div>
                                    </div>
                                    <div class="modal-item-price">
                                        ${window.formatPrice ? window.formatPrice(item.price * (item.quantity || item.qty)) : `₦${(item.price * (item.quantity || item.qty)).toFixed(2)}`}
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="order-section">
                        <div class="order-total" style="text-align: right; font-size: 20px;">
                            Total: ${window.formatPrice ? window.formatPrice(order.total) : `₦${parseFloat(order.total).toFixed(2)}`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('order-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-modal') {
            closeModal();
        }
    });
}

// Close modal
window.closeModal = function() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.remove();
};

// Cancel order
window.cancelOrder = async function(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        try {
            if (!window.pb) {
                window.pb = new PocketBase('https://itrain.services.hodessy.com');
            }
            
            await window.pb.collection('orders').update(orderId, {
                orderStatus: 'cancelled'
            });
            alert('Order cancelled successfully');
            loadOrders('normal');
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Error cancelling order');
        }
    }
};

// Initialize account page
document.addEventListener('DOMContentLoaded', () => {
    // Load orders when page loads
    loadOrders('normal');
});

// Function to open write review modal for a product
window.openWriteReview = function(orderId) {
    // Find the product from order (mock data - replace with actual order data)
    const orderProducts = {
        'ORD-001': { id: '1', name: 'iPhone 14 Pro Max', image: '/images/slider-pic1.jpg' },
        'ORD-002': { id: '2', name: 'Samsung Galaxy S23 Ultra', image: '/images/slider-pic2.webp' }
    };
    
    const product = orderProducts[orderId];
    if (!product) return;
    
    const modal = document.createElement('div');
    modal.className = 'review-modal';
    modal.innerHTML = `
        <div class="review-modal-content">
            <div class="modal-header">
                <h3>Write a Review for ${product.name}</h3>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Your Rating</label>
                    <div class="star-rating-write">
                        ${[1,2,3,4,5].map(star => `<span class="star" data-value="${star}">★</span>`).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>Review Title</label>
                    <input type="text" id="review-title" placeholder="Summarize your experience" autocomplete="experience">
                </div>
                <div class="form-group">
                    <label>Your Review</label>
                    <textarea id="review-comment" rows="4" placeholder="Share details about your experience with the product"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn">Cancel</button>
                <button class="submit-review-btn">Submit Review</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    let selectedRating = 0;
    const stars = modal.querySelectorAll('.star-rating-write .star');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            stars.forEach(s => {
                if (parseInt(s.dataset.value) <= selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });
    
    modal.querySelector('.close-modal-btn').onclick = () => modal.remove();
    modal.querySelector('.cancel-btn').onclick = () => modal.remove();
    modal.querySelector('.submit-review-btn').onclick = () => {
        const title = modal.querySelector('#review-title').value;
        const comment = modal.querySelector('#review-comment').value;
        
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        if (!title || !comment) {
            alert('Please fill in all fields');
            return;
        }
        
        addReview(product.id, product.name, product.image, selectedRating, title, comment);
        modal.remove();
    };
};

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
        address: address
    };

    // Only update email if changed
    if (email && email !== currentUser.email) {
        updateData.email = email;
    }

    // Proper password update
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            alert('Enter current password');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        updateData.oldPassword = currentPassword;
        updateData.password = newPassword;
        updateData.passwordConfirm = newPassword;
    }

    console.log("Sending updateData:", updateData);

    try {
        const updatedUser = await window.pb
            .collection("exclusive_users_collection")
            .update(currentUser.id, updateData, {
                $autoCancel: false
            });

        window.authSystem.currentUser = updatedUser;
        alert('Profile updated successfully!');
        await loadUserInfo();

    } catch (error) {
        console.error("Update error FULL:", error);
        alert(error?.data?.message || error.message);
    }
}

window.addEventListener('hashchange', showSectionFromHash);

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

// account-page.js - Complete pagination for all sections

// Pagination state for different sections
const paginationState = {
    orders: { currentPage: 1, itemsPerPage: 2, totalPages: 0, totalItems: 0, cache: [] },
    cancellations: { currentPage: 1, itemsPerPage: 2, totalPages: 0, totalItems: 0, cache: [] },
    returns: { currentPage: 1, itemsPerPage: 2, totalPages: 0, totalItems: 0, cache: [] },
    reviews: { currentPage: 1, itemsPerPage: 2, totalPages: 0, totalItems: 0, cache: [] }
};

let currentActiveSection = 'orders';

// ==================== ORDERS SECTION WITH PAGINATION ====================

async function loadOrders(type = 'normal', page = 1) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    // Determine which state to use
    let stateKey = 'orders';
    let filterType = 'normal';
    
    if (type === 'cancellations') {
        stateKey = 'cancellations';
        filterType = 'cancelled';
    } else if (type === 'returns') {
        stateKey = 'returns';
        filterType = 'returned';
    }
    
    const state = paginationState[stateKey];
    state.currentPage = page;
    currentActiveSection = stateKey;

    // Show loading state
    ordersList.innerHTML = `
        <div class="orders-loading">
            <div class="spinner"></div>
            <p>Loading your orders...</p>
        </div>
    `;

    // Get user from localStorage
    let userId = null;
    
    try {
        const authData = localStorage.getItem('pocketbase_auth');
        if (authData) {
            const auth = JSON.parse(authData);
            userId = auth.record?.id;
        }
    } catch (e) {
        console.error('Error parsing auth:', e);
    }
    
    if (!userId) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">🔒</div>
                <h3>Please Login</h3>
                <p>You need to be logged in to view your orders.</p>
                <a href="/login.html" class="shop-now-link">Login Now</a>
            </div>
        `;
        return;
    }

    try {
        if (!window.pb) {
            window.pb = new PocketBase('https://itrain.services.hodessy.com');
        }
        
        // Fetch orders if cache is empty
        if (state.cache.length === 0) {
            const orders = await window.pb.collection("orders").getFullList({
                filter: `userId = "${userId}"`,
                sort: '-created',
                $autoCancel: false
            });
            state.cache = orders;
        }
        
        // Filter by type
        let filteredOrders = state.cache;
        if (filterType === 'cancelled') {
            filteredOrders = state.cache.filter(order => order.orderStatus === 'cancelled');
        } else if (filterType === 'returned') {
            filteredOrders = state.cache.filter(order => order.orderStatus === 'returned');
        } else {
            filteredOrders = state.cache.filter(order => order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned');
        }
        
        state.totalItems = filteredOrders.length;
        state.totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
        
        if (state.totalItems === 0) {
            let emptyMessage = '';
            if (filterType === 'cancelled') emptyMessage = 'No cancelled orders found.';
            else if (filterType === 'returned') emptyMessage = 'No returned orders found.';
            else emptyMessage = 'No orders found.';
            
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <div class="empty-orders-icon">📭</div>
                    <h3>${emptyMessage}</h3>
                    <a href="/shop.html" class="shop-now-link">Start Shopping</a>
                </div>
            `;
            return;
        }
        
        // Paginate
        const startIndex = (page - 1) * state.itemsPerPage;
        const endIndex = startIndex + state.itemsPerPage;
        const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
        
        // Render orders with pagination info and tracking button
        const ordersInfo = `
            <div class="orders-info">
                <span class="orders-count">
                    Showing <strong>${startIndex + 1}-${Math.min(endIndex, state.totalItems)}</strong> 
                    of <strong>${state.totalItems}</strong> orders
                </span>
                <span class="orders-per-page">
                    Show: 
                    <select onchange="changeOrdersPerPage('${stateKey}', this.value)" class="per-page-select">
                        <option value="2" ${state.itemsPerPage === 2 ? 'selected' : ''}>2</option>
                        <option value="5" ${state.itemsPerPage === 5? 'selected' : ''}>5</option>
                        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${state.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                    </select>
                </span>
            </div>
        `;
        
        ordersList.innerHTML = ordersInfo + paginatedOrders.map(order => {
            let items = order.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch(e) { items = []; }
            }
            
            // Check if order can be tracked (not delivered and not cancelled)
            const canTrack = order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled';
            
            return `
                <div class="order-item" data-order-id="${order.id}">
                    <div class="order-header">
                        <div class="order-header-item">
                            <span class="order-header-label">Order ID</span>
                            <span class="order-header-value order-id">#${order.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Order Date</span>
                            <span class="order-header-value">${new Date(order.created).toLocaleDateString()}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Payment Method</span>
                            <span class="order-header-value">${order.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Payment Status</span>
                            <span class="payment-badge payment-${order.paymentStatus}">${order.paymentStatus?.toUpperCase() || 'PENDING'}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Order Status</span>
                            <span class="status-badge status-${order.orderStatus}">${order.orderStatus?.toUpperCase() || 'PENDING'}</span>
                        </div>
                    </div>
                    
                    <div class="order-products">
                        <div class="order-products-title">Products (${items.length})</div>
                        ${items.slice(0, 3).map(item => `
                            <div class="order-product">
                                <img src="${item.img || '/images/placeholder.jpg'}" class="order-product-img" onerror="this.src='/images/placeholder.jpg'">
                                <div class="order-product-info">
                                    <div class="order-product-name">${escapeHtml(item.name)}</div>
                                    <div class="order-product-details">
                                        <span>Qty: ${item.quantity || item.qty}</span>
                                        ${item.color ? `<span>Color: ${item.color}</span>` : ''}
                                        ${item.size ? `<span>Size: ${item.size}</span>` : ''}
                                    </div>
                                </div>
                                <div class="order-product-price">
                                    ${window.formatPrice ? window.formatPrice(item.price * (item.quantity || item.qty)) : `₦${(item.price * (item.quantity || item.qty)).toFixed(2)}`}
                                </div>
                            </div>
                        `).join('')}
                        ${items.length > 3 ? `<div class="order-product" style="justify-content: center; color: #666;">+ ${items.length - 3} more items</div>` : ''}
                    </div>
                    
                    <div class="order-footer">
                        <div class="order-total">
                            <span class="order-total-label">Total Amount:</span>
                            ${window.formatPrice ? window.formatPrice(order.total) : `₦${parseFloat(order.total).toFixed(2)}`}
                        </div>
                        <div class="order-actions">
                            <button onclick="viewOrderDetails('${order.id}')" class="btn-view-details">View Details</button>
                            ${canTrack ? `
                                <button onclick="trackOrder('${order.id}')" class="btn-track-order">
                                    <i class="fas fa-truck"></i> Track Order
                                </button>
                            ` : ''}
                            ${order.orderStatus === 'pending' ? `<button onclick="cancelOrder('${order.id}')" class="btn-cancel-order">Cancel Order</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Render pagination
        renderOrdersPagination(stateKey, state.totalPages, state.currentPage);
        
    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = `<div class="empty-orders"><div class="empty-orders-icon">⚠️</div><h3>Error Loading Orders</h3><p>${error.message}</p><button onclick="location.reload()" class="shop-now-link">Try Again</button></div>`;
    }
}

// Render pagination for orders
function renderOrdersPagination(section, totalPages, currentPage) {
    const paginationContainer = document.getElementById('orders-pagination');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHtml = `<div class="pagination-wrapper"><button class="pagination-btn" onclick="changeOrdersPage('${section}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Previous</button><div class="pagination-numbers">`;
    
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="changeOrdersPage('${section}', ${i})">${i}</button>`;
        }
    } else {
        paginationHtml += `<button class="page-number ${1 === currentPage ? 'active' : ''}" onclick="changeOrdersPage('${section}', 1)">1</button>`;
        if (currentPage > 3) paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="changeOrdersPage('${section}', ${i})">${i}</button>`;
        }
        if (currentPage < totalPages - 2) paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        paginationHtml += `<button class="page-number ${totalPages === currentPage ? 'active' : ''}" onclick="changeOrdersPage('${section}', ${totalPages})">${totalPages}</button>`;
    }
    
    paginationHtml += `</div><button class="pagination-btn" onclick="changeOrdersPage('${section}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button></div>`;
    paginationContainer.innerHTML = paginationHtml;
}

// Change orders page
window.changeOrdersPage = function(section, page) {
    const state = paginationState[section];
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    
    if (section === 'cancellations') loadOrders('cancellations', page);
    else if (section === 'returns') loadOrders('returns', page);
    else loadOrders('normal', page);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Change items per page
window.changeOrdersPerPage = function(section, value) {
    const state = paginationState[section];
    state.itemsPerPage = parseInt(value);
    state.currentPage = 1;
    
    if (section === 'cancellations') loadOrders('cancellations', 1);
    else if (section === 'returns') loadOrders('returns', 1);
    else loadOrders('normal', 1);
};

// ==================== REVIEWS SECTION WITH PAGINATION ====================

async function loadUserReviews(page = 1) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    const state = paginationState.reviews;
    state.currentPage = page;
    
    reviewsList.innerHTML = `<div class="orders-loading"><div class="spinner"></div><p>Loading your reviews...</p></div>`;
    
    const user = window.authSystem?.getUser();
    if (!user) {
        reviewsList.innerHTML = '<div class="empty-orders"><div class="empty-orders-icon">🔒</div><h3>Please Login</h3><p>Login to view your reviews.</p></div>';
        return;
    }
    
    try {
        if (state.cache.length === 0) {
            const reviews = await window.pb.collection("reviews").getFullList({
                filter: `userId = "${user.id}"`,
                sort: '-created',
                $autoCancel: false
            });
            state.cache = reviews;
        }
        
        state.totalItems = state.cache.length;
        state.totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
        
        if (state.totalItems === 0) {
            reviewsList.innerHTML = '<div class="empty-orders"><div class="empty-orders-icon">📝</div><h3>No Reviews Yet</h3><p>You haven\'t written any reviews yet.</p></div>';
            document.getElementById('review-stats').innerHTML = '';
            return;
        }
        
        // Calculate stats
        const avgRating = state.cache.reduce((sum, rev) => sum + rev.rating, 0) / state.totalItems;
        const ratingDistribution = {5:0, 4:0, 3:0, 2:0, 1:0};
        state.cache.forEach(rev => { ratingDistribution[rev.rating]++; });
        
        // Display stats
        const statsContainer = document.getElementById('review-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="review-summary">
                    <div class="avg-rating">
                        <span class="avg-number">${avgRating.toFixed(1)}</span>
                        <div class="stars">${generateStars(Math.round(avgRating))}</div>
                        <span class="total-reviews">${state.totalItems} reviews</span>
                    </div>
                    <div class="rating-breakdown">
                        ${[5,4,3,2,1].map(star => `
                            <div class="rating-bar">
                                <span class="star-label">${star} ★</span>
                                <div class="bar-container"><div class="bar-fill" style="width: ${(ratingDistribution[star] / state.totalItems) * 100}%"></div></div>
                                <span class="bar-count">${ratingDistribution[star]}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Paginate
        const startIndex = (page - 1) * state.itemsPerPage;
        const endIndex = startIndex + state.itemsPerPage;
        const paginatedReviews = state.cache.slice(startIndex, endIndex);
        
        const reviewsInfo = `
            <div class="orders-info">
                <span class="orders-count">Showing <strong>${startIndex + 1}-${Math.min(endIndex, state.totalItems)}</strong> of <strong>${state.totalItems}</strong> reviews</span>
                <span class="orders-per-page">
                    Show: 
                    <select onchange="changeReviewsPerPage(this.value)" class="per-page-select">
                        <option value="5" ${state.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${state.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                    </select>
                </span>
            </div>
        `;
        
        reviewsList.innerHTML = reviewsInfo + paginatedReviews.map(review => `
            <div class="review-card" data-review-id="${review.id}">
                <div class="review-product-info">
                    <img src="${review.productImage || '/images/placeholder.jpg'}" onerror="this.src='/images/placeholder.jpg'">
                    <div>
                        <h4>${escapeHtml(review.productName)}</h4>
                        <div class="review-rating">${generateStars(review.rating)}</div>
                        <span class="review-date">${new Date(review.created || review.date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="review-content">
                    <h4>${escapeHtml(review.title)}</h4>
                    <p>${escapeHtml(review.comment)}</p>
                    <div class="review-footer">
                        <span class="helpful-count"><i class="fas fa-thumbs-up"></i> ${review.helpful || 0} found helpful</span>
                        <span class="review-status ${review.status || 'pending'}">${review.status || 'pending'}</span>
                        <button class="edit-review-btn" onclick="editReview('${review.id}')">Edit Review</button>
                        <button class="delete-review-btn" onclick="deleteReview('${review.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        renderReviewsPagination();
        
    } catch (error) {
        console.error("Error loading reviews:", error);
        reviewsList.innerHTML = '<div class="empty-orders"><div class="empty-orders-icon">⚠️</div><h3>Error Loading Reviews</h3></div>';
    }
}

// Render reviews pagination
function renderReviewsPagination() {
    const paginationContainer = document.getElementById('reviews-pagination');
    if (!paginationContainer) return;
    
    const state = paginationState.reviews;
    if (state.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHtml = `<div class="pagination-wrapper"><button class="pagination-btn" onclick="changeReviewsPage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Previous</button><div class="pagination-numbers">`;
    
    for (let i = 1; i <= state.totalPages; i++) {
        if (i === 1 || i === state.totalPages || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
            paginationHtml += `<button class="page-number ${i === state.currentPage ? 'active' : ''}" onclick="changeReviewsPage(${i})">${i}</button>`;
        } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    paginationHtml += `</div><button class="pagination-btn" onclick="changeReviewsPage(${state.currentPage + 1})" ${state.currentPage === state.totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button></div>`;
    paginationContainer.innerHTML = paginationHtml;
}

// Change reviews page
window.changeReviewsPage = function(page) {
    if (page < 1 || page > paginationState.reviews.totalPages) return;
    loadUserReviews(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Change reviews per page
window.changeReviewsPerPage = function(value) {
    paginationState.reviews.itemsPerPage = parseInt(value);
    paginationState.reviews.currentPage = 1;
    loadUserReviews(1);
};

// ==================== HELPER FUNCTIONS ====================

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '<i class="fas fa-star star-filled"></i>' : '<i class="far fa-star star-empty"></i>';
    }
    return stars;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ==================== UPDATE SECTION HANDLERS ====================

// Update the showOrdersSection function
function showOrdersSection(type) {
    let ordersSection = document.getElementById('orders-section');
    if (ordersSection) ordersSection.style.display = 'block';
    
    // Clear cache when switching sections
    if (type === 'cancellations') {
        paginationState.cancellations.cache = [];
        loadOrders('cancellations', 1);
    } else if (type === 'returns') {
        paginationState.returns.cache = [];
        loadOrders('returns', 1);
    } else {
        paginationState.orders.cache = [];
        loadOrders('normal', 1);
    }
}

// Update showReviewsSection function
function showReviewsSection() {
    let reviewsSection = document.getElementById('reviews-section');
    if (!reviewsSection) createReviewsSection();
    reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection) reviewsSection.style.display = 'block';
    
    // Clear cache and reload
    paginationState.reviews.cache = [];
    loadUserReviews(1);
}

// Create reviews section with pagination container
function createReviewsSection() {
    const accountContent = document.querySelector('.account-content');
    if (!accountContent || document.getElementById('reviews-section')) return;
    
    const reviewsSection = document.createElement('div');
    reviewsSection.id = 'reviews-section';
    reviewsSection.className = 'edit-profile';
    reviewsSection.style.display = 'none';
    reviewsSection.innerHTML = `
        <h3>My Reviews & Ratings</h3>
        <div id="reviews-list" class="reviews-container">
            <div class="loading-reviews">Loading your reviews...</div>
        </div>
        <div id="review-stats" class="review-stats"></div>
        <div id="reviews-pagination" class="reviews-pagination"></div>
    `;
    accountContent.appendChild(reviewsSection);
}

// Add pagination container to orders section in HTML
function addOrdersPaginationContainer() {
    const ordersSection = document.getElementById('orders-section');
    if (ordersSection && !document.getElementById('orders-pagination')) {
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'orders-pagination';
        ordersSection.appendChild(paginationDiv);
    }
}


// Track order function - redirect to tracking page
function trackOrder(orderId) {
    if (orderId) {
        window.location.href = `/order&payment/order-tracking.html?orderId=${orderId}`;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addOrdersPaginationContainer();
    }, 500);
});