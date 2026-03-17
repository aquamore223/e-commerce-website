// wishlist-page.js - Fully dynamic wishlist page

document.addEventListener('DOMContentLoaded', function() {
    initWishlistPage();
});

function initWishlistPage() {
    // Load wishlist from localStorage
    loadWishlistItems();
    setupEventListeners();
    updateWishlistCount();
    loadJustForYou();
}

function loadWishlistItems() {
    const wishlist = getWishlist();
    const container = document.querySelector('.wishlist-main .wish-grid');
    const countSpan = document.querySelector('.wish-hd h4 span');
    
    if (!container) return;
    
    // Update count in header
    if (countSpan) {
        countSpan.textContent = `(${wishlist.length})`;
    }
    
    if (wishlist.length === 0) {
        // Show empty wishlist
        container.innerHTML = `
            <div class="empty-wishlist" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i data-lucide="heart" width="64" height="64" style="color: #ccc; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; color: #666; margin-bottom: 10px;">Your wishlist is empty</p>
                <p style="font-size: 14px; color: #999; margin-bottom: 30px;">Save your favorite items here</p>
                <a href="/index.html" class="gen-btn" style="display: inline-block; padding: 12px 30px;">Continue Shopping</a>
            </div>
        `;
    } else {
        // Render wishlist items
        container.innerHTML = wishlist.map(item => `
            <div class="scroll" data-product-id="${item.id}">
                <div class="scroll-img-section">
                    <a href="/product-details.html?id=${item.id}">
                        <img src="${item.img || '/images/placeholder.jpg'}" alt="${item.name || 'Product'}" onerror="this.src='/images/placeholder.jpg'">
                    </a>
                    ${item.discount ? `<span class="scroll-tag">-${item.discount}%</span>` : ''}
                    <div class="scroll-icon">
                        <span class="heart-tag delete-btn" data-id="${item.id}">
                            <i data-lucide="trash-2" width="15" height="15"></i>
                        </span>
                    </div>
                    <button class="add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
                </div>
                <div class="scroll-text">
                    <a href="/product-details.html?id=${item.id}">
                        <h5>${item.name || 'Product'}</h5>
                    </a>
                    <p>$${item.price || '0'} ${item.oldPrice ? `<span>$${item.oldPrice}</span>` : ''}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Reinitialize Lucide icons for new content
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}

function setupEventListeners() {
    // Delete item from wishlist
    document.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            const productId = deleteBtn.dataset.id;
            deleteFromWishlist(productId);
            return;
        }
        
        // Add to cart from wishlist
        const cartBtn = e.target.closest('.add-to-cart-btn');
        if (cartBtn) {
            e.preventDefault();
            const productId = cartBtn.dataset.id;
            addToCartFromWishlist(productId, cartBtn);
            return;
        }
    });
    
    // Move all to cart button
    const moveAllBtn = document.querySelector('.wish-hd .shadow-btn');
    if (moveAllBtn) {
        // Remove existing listener to prevent duplicates
        moveAllBtn.removeEventListener('click', moveAllToCart);
        moveAllBtn.addEventListener('click', moveAllToCart);
    }
    
    // Just For You - View All button
    const viewAllBtn = document.querySelector('.wish-hd .shadow-btn:last-child');
    if (viewAllBtn && !viewAllBtn.id) {
        viewAllBtn.addEventListener('click', function() {
            window.location.href = '/index.html';
        });
    }
}

function deleteFromWishlist(productId) {
    if (!productId) return;
    
    // Get current wishlist
    let wishlist = getWishlist();
    
    // Filter out the item
    wishlist = wishlist.filter(item => item.id != productId);
    
    // Save back to localStorage
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    // Show feedback
    showNotification('Item removed from wishlist');
    
    // Remove the item from DOM with animation
    const itemElement = document.querySelector(`.scroll[data-product-id="${productId}"]`);
    if (itemElement) {
        itemElement.style.transition = 'opacity 0.3s ease';
        itemElement.style.opacity = '0';
        setTimeout(() => {
            // Reload the wishlist items
            loadWishlistItems();
            updateWishlistCount();
        }, 300);
    } else {
        // If element not found, just reload
        loadWishlistItems();
        updateWishlistCount();
    }
    
    // Dispatch event for other pages
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: wishlist }));
}

function addToCartFromWishlist(productId, btnElement) {
    if (!productId) return;
    
    // Get product details from wishlist
    const wishlist = getWishlist();
    const product = wishlist.find(item => item.id == productId);
    
    if (!product) return;
    
    // Check if cart system exists
    if (window.cartSystem) {
        // Add to cart
        window.cartSystem.addToCart(productId);
        
        // Show button feedback
        const originalText = btnElement.textContent;
        btnElement.textContent = '✓ Added';
        btnElement.classList.add('added');
        btnElement.style.background = '#4CAF50';
        btnElement.style.color = 'white';
        
        setTimeout(() => {
            btnElement.textContent = originalText;
            btnElement.classList.remove('added');
            btnElement.style.background = '';
            btnElement.style.color = '';
        }, 1500);
        
        showNotification(`${product.name || 'Product'} added to cart`);
    } else {
        console.error('Cart system not found');
        alert('Cart system not available');
    }
}

function moveAllToCart(e) {
    e.preventDefault();
    
    const wishlist = getWishlist();
    
    if (wishlist.length === 0) {
        showNotification('Your wishlist is empty', 'error');
        return;
    }
    
    if (!window.cartSystem) {
        alert('Cart system not available');
        return;
    }
    
    // Add all items to cart
    wishlist.forEach(item => {
        window.cartSystem.addToCart(item.id);
    });
    
    // Clear wishlist
    localStorage.setItem('wishlist', JSON.stringify([]));
    
    // Show success message
    showNotification(`Added ${wishlist.length} items to cart`);
    
    // Reload wishlist items
    loadWishlistItems();
    updateWishlistCount();
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: [] }));
}

function getWishlist() {
    try {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        // Ensure each item has required fields
        return wishlist.map(item => {
            // If item is just an ID (string/number), convert to object
            if (typeof item === 'string' || typeof item === 'number') {
                return {
                    id: item.toString(),
                    name: 'Product',
                    price: '0',
                    img: '/images/placeholder.jpg'
                };
            }
            // If it's already an object, ensure it has all fields
            return {
                id: item.id || '0',
                name: item.name || 'Product',
                price: item.price || '0',
                img: item.img || '/images/placeholder.jpg',
                discount: item.discount || 0,
                oldPrice: item.oldPrice || null
            };
        });
    } catch (e) {
        console.error('Error parsing wishlist:', e);
        return [];
    }
}

function updateWishlistCount() {
    const wishlist = getWishlist();
    
    // Update count in header
    const headerCount = document.querySelector('.wish-count');
    if (headerCount) {
        headerCount.textContent = wishlist.length;
    }
    
    // Update count in wishlist page header
    const pageCount = document.querySelector('.wish-hd h4 span');
    if (pageCount) {
        pageCount.textContent = `(${wishlist.length})`;
    }
}

function showNotification(message, type = 'success') {
    // Check if notification container exists, if not create it
    let notification = document.querySelector('.wishlist-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'wishlist-notification';
        document.body.appendChild(notification);
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
    }
    
    // Set color based on type
    notification.style.background = type === 'success' ? '#4CAF50' : '#f44336';
    notification.textContent = message;
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Hide after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
    }, 2000);

    
}

function loadJustForYou() {
    const container = document.querySelector('.just-for-you');
    if (!container) return;

    const wishlist = getWishlist().map(item => String(item.id));
    const allProducts = Object.values(products);

    // ❗ Filter out wishlist items
    const recommendations = allProducts
        .filter(p => !wishlist.includes(String(p.id)))
        .sort(() => 0.5 - Math.random()) // random
        .slice(0, 4); // show 4

    container.innerHTML = recommendations.map(p => `
        <div class="scroll">
            <a href="/product-details.html?id=${p.id}">
                <div class="scroll-img-section">
                    <img src="${p.img}" alt="${p.name}">
                    ${p.tag ? `<span class="scroll-tag">${p.tag}</span>` : ""}
                    
                    <div class="scroll-icon">
                        <span class="eye-icon" data-id="${p.id}">
                            <i data-lucide="eye" width="15" height="15"></i>
                        </span>
                    </div>

                    <button class="add-to-cart-btn" data-id="${p.id}">
                        Add To Cart
                    </button>
                </div>
            </a>

            <div class="scroll-text">
                <h5>${p.name}</h5>
                <p>
                    ${formatPrice(p.price)}
                    ${p.oldPrice ? `<span>${formatPrice(p.oldPrice)}</span>` : ""}
                </p>
                <p class="rating">
                    ${[...Array(5)].map((_,i) => 
                        `<i data-lucide="star" class="${i < (p.rating||4)?'full':'empty'}"></i>`
                    ).join('')}
                </p>
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}
    
// Export for use in other files
window.wishlistPage = {
    reload: loadWishlistItems,
    deleteItem: deleteFromWishlist,
    moveAllToCart: moveAllToCart
};