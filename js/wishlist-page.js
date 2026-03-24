// wishlist-page.js - Fully dynamic wishlist page with PocketBase support

document.addEventListener('DOMContentLoaded', function() {
    initWishlistPage();
});

async function initWishlistPage() {
    // Load wishlist from localStorage
    await loadWishlistItems();
    setupEventListeners();
    updateWishlistCount();
    await loadJustForYou();
}

async function loadWishlistItems() {
    const wishlist = await getWishlist();
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
        // Render wishlist items - NO RATING STARS
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
                    <button class="add-to-cart-btn" data-id="${item.id}">
                        <i data-lucide="shopping-cart" width="14" height="14"></i> Add to Cart
                    </button>
                </div>
                <div class="scroll-text">
                    <a href="/product-details.html?id=${item.id}">
                        <h5>${item.name || 'Product'}</h5>
                    </a>
                    <p>${formatPrice(item.price || '0')} ${item.oldPrice ? `<span>${formatPrice(item.oldPrice)}</span>` : ''}</p>
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
    const moveAllBtn = document.querySelector('.wishlist-main .wish-hd .shadow-btn');
    if (moveAllBtn) {
        // Remove existing listener to prevent duplicates
        moveAllBtn.removeEventListener('click', moveAllToCart);
        moveAllBtn.addEventListener('click', moveAllToCart);
    }
    
    // Just For You - View All button
    const viewAllBtn = document.querySelectorAll('.wish-hd .shadow-btn')[1];
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            window.location.href = '/index.html';
        });
    }
}

function deleteFromWishlist(productId) {
    if (!productId) return;
    
    // Get current wishlist
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    
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
            loadJustForYou();
        }, 300);
    } else {
        // If element not found, just reload
        loadWishlistItems();
        updateWishlistCount();
        loadJustForYou();
    }
    
    // Dispatch event for other pages
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: wishlist }));
    
    // Update wishlistSystem if exists
    if (window.wishlistSystem) {
        window.wishlistSystem.items = wishlist;
        window.wishlistSystem.updateCount();
    }
}

async function addToCartFromWishlist(productId, btnElement) {
    if (!productId) return;
    
    // Get product details from wishlist
    const wishlist = await getWishlist();
    const product = wishlist.find(item => item.id == productId);
    
    if (!product) return;
    
    // Check if cart system exists
    if (window.cartSystem) {
        // Add to cart
        await window.cartSystem.addToCart(productId);
        
        // Show button feedback
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<i data-lucide="check" width="14" height="14"></i> Added';
        btnElement.classList.add('added');
        btnElement.style.background = '#4CAF50';
        btnElement.style.color = 'white';
        
        setTimeout(() => {
            btnElement.innerHTML = '<i data-lucide="shopping-cart" width="14" height="14"></i> Add to Cart';
            btnElement.classList.remove('added');
            btnElement.style.background = '';
            btnElement.style.color = '';
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 1500);
        
        showNotification(`${product.name || 'Product'} added to cart`);
    } else {
        console.error('Cart system not found');
        alert('Cart system not available');
    }
}

async function moveAllToCart(e) {
    e.preventDefault();
    
    const wishlist = await getWishlist();
    
    if (wishlist.length === 0) {
        showNotification('Your wishlist is empty', 'error');
        return;
    }
    
    if (!window.cartSystem) {
        alert('Cart system not available');
        return;
    }
    
    // Add all items to cart
    for (const item of wishlist) {
        await window.cartSystem.addToCart(item.id);
    }
    
    // Clear wishlist
    localStorage.setItem('wishlist', JSON.stringify([]));
    
    // Show success message
    showNotification(`Added ${wishlist.length} items to cart`);
    
    // Reload wishlist items
    await loadWishlistItems();
    updateWishlistCount();
    await loadJustForYou();
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: [] }));
    
    // Update wishlistSystem if exists
    if (window.wishlistSystem) {
        window.wishlistSystem.items = [];
        window.wishlistSystem.updateCount();
    }
}

async function getWishlist() {
    try {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        
        // Process each wishlist item to ensure it has full details
        const processedWishlist = [];
        
        for (const item of wishlist) {
            // If item is just an ID (string/number), fetch full details
            if (typeof item === 'string' || typeof item === 'number') {
                const fullProduct = await fetchProductDetails(item.toString());
                if (fullProduct) {
                    processedWishlist.push(fullProduct);
                }
            } 
            // If it's already an object but missing details, fetch full details
            else if (item.id && (!item.name || !item.price)) {
                const fullProduct = await fetchProductDetails(item.id);
                if (fullProduct) {
                    processedWishlist.push(fullProduct);
                } else {
                    // Keep original if fetch fails
                    processedWishlist.push({
                        id: item.id || '0',
                        name: item.name || 'Product',
                        price: item.price || '0',
                        img: item.img || '/images/placeholder.jpg',
                        discount: item.discount || 0,
                        oldPrice: item.oldPrice || null
                    });
                }
            }
            // Already has all details
            else {
                processedWishlist.push({
                    id: item.id || '0',
                    name: item.name || 'Product',
                    price: item.price || '0',
                    img: item.img || '/images/placeholder.jpg',
                    discount: item.discount || 0,
                    oldPrice: item.oldPrice || null
                });
            }
        }
        
        return processedWishlist;
    } catch (e) {
        console.error('Error parsing wishlist:', e);
        return [];
    }
}

async function fetchProductDetails(productId) {
    // Try local products first
    if (typeof products !== 'undefined' && products[productId]) {
        return products[productId];
    }
    
    // Try PocketBase
    if (window.pb) {
        try {
            const pbProduct = await window.pb.collection("exclusive_ecommerce").getOne(productId);
            if (pbProduct) {
                return {
                    id: pbProduct.id,
                    name: pbProduct.name,
                    price: typeof pbProduct.price === 'number' ? pbProduct.price : parseFloat(pbProduct.price) || 0,
                    img: getProductImage(pbProduct),
                    oldPrice: pbProduct.oldPrice,
                    discount: pbProduct.flashSale ? pbProduct.discount : 0,
                    category: pbProduct.category
                };
            }
        } catch (error) {
            console.error("Error fetching from PocketBase:", error);
        }
    }
    
    return null;
}

function getProductImage(product) {
    if (product.image) {
        if (typeof product.image === 'string') {
            if (product.image.startsWith('http')) {
                return product.image;
            }
            return window.pb.files.getURL(product, product.image);
        } else if (Array.isArray(product.image) && product.image.length > 0) {
            return window.pb.files.getURL(product, product.image[0]);
        }
    }
    return '/images/placeholder.jpg';
}

function updateWishlistCount() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const count = wishlist.length;
    
    // Update count in header
    const headerCount = document.querySelector('.wish-count');
    if (headerCount) {
        if (count > 0) {
            headerCount.style.display = "block";
            headerCount.textContent = count > 99 ? "99+" : count;
        } else {
            headerCount.style.display = "none";
        }
    }
    
    // Update count in wishlist page header
    const pageCount = document.querySelector('.wishlist-main .wish-hd h4 span');
    if (pageCount) {
        pageCount.textContent = `(${count})`;
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

async function loadJustForYou() {
    const container = document.querySelector('.just-for-you');
    if (!container) return;

    // Get wishlist IDs to exclude
    const wishlist = await getWishlist();
    const wishlistIds = wishlist.map(item => String(item.id));
    
    let allProducts = [];
    
    // Try to get products from PocketBase first
    if (window.pb) {
        try {
            const pbProducts = await window.pb.collection("exclusive_ecommerce").getFullList({
                sort: '-created',
                limit: 20
            });
            
            allProducts = pbProducts.map(p => ({
                id: p.id,
                name: p.name,
                price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
                img: getProductImage(p),
                oldPrice: p.oldPrice,
                tag: p.flashSale ? "-SALE" : (p.newArrival ? "NEW" : ""),
                rating: p.rating || 4,
                reviews: p.reviews || 0
            }));
        } catch (error) {
            console.error("Error fetching from PocketBase:", error);
        }
    }
    
    // Fallback to local products if PocketBase fails or has no products
    if (allProducts.length === 0 && typeof products !== 'undefined') {
        allProducts = Object.values(products);
    }
    
    // Filter out wishlist items and randomize
    const recommendations = allProducts
        .filter(p => !wishlistIds.includes(String(p.id)))
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

    if (recommendations.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:40px;">No recommendations available</p>';
        return;
    }

    container.innerHTML = recommendations.map(p => `
        <div class="scroll">
            <a href="/product-details.html?id=${p.id}">
                <div class="scroll-img-section">
                    <img src="${p.img}" alt="${p.name}" onerror="this.src='/images/placeholder.jpg'">
                    ${p.tag ? `<span class="scroll-tag">${p.tag}</span>` : ""}
                    
                    <div class="scroll-icon">
                        <span class="eye-icon" data-id="${p.id}">
                            <i data-lucide="eye" width="15" height="15"></i>
                        </span>
                    </div>

                    <button class="add-to-cart-btn" data-id="${p.id}">
                        <i data-lucide="shopping-cart" width="14" height="14"></i> Add to Cart
                    </button>
                </div>
            </a>

            <div class="scroll-text">
                <h5>${p.name}</h5>
                <p>
                    ${formatPrice(p.price)}
                    ${p.oldPrice ? `<span>${formatPrice(p.oldPrice)}</span>` : ""}
                </p>
                <div class="rating">
                    ${generateStars(p.rating || 4)}
                    <span>(${p.reviews || 0})</span>
                </div>
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}

function formatPrice(price) {
    if (typeof price === "string") {
        price = parseFloat(price.replace(/[^0-9.-]/g, ""));
    }
    if (isNaN(price)) price = 0;
    return `$${price.toFixed(2)}`;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i data-lucide="star" class="${i <= rating ? 'full' : 'empty'}"></i>`;
    }
    return stars;
}

// Export for use in other files
window.wishlistPage = {
    reload: loadWishlistItems,
    deleteItem: deleteFromWishlist,
    moveAllToCart: moveAllToCart
};