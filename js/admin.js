// admin.js - PocketBase Admin Panel (Remote Version)

// ==================== CONFIGURATION ====================
const PB_URL = "https://itrain.services.hodessy.com";
const COLLECTION_NAME = "exclusive_ecommerce"; // Change this if your collection name is different

// ==================== INITIALIZATION ====================
let pb = null;
let currentPage = 1;
let productsPerPage = 10;
let allProducts = [];
let filteredProducts = [];

// Initialize PocketBase
try {
    pb = new PocketBase(PB_URL);
    window.pb = pb;
    console.log("✅ PocketBase initialized with URL:", PB_URL);
} catch (error) {
    console.error("❌ Failed to initialize PocketBase:", error);
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page loaded");
    await checkConnection();
    await loadProducts();
    setupEventListeners();
    updateStats();
    setupNavigation();
});

// ==================== CONNECTION CHECK ====================
async function checkConnection() {
    try {
        const response = await fetch(`${PB_URL}/api/health`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        console.log("✅ PocketBase connection successful");
        hideConnectionError();
        return true;
    } catch (error) {
        console.error("❌ PocketBase connection failed:", error);
        showConnectionError();
        return false;
    }
}

function showConnectionError() {
    const productsList = document.getElementById('products-list');
    if (productsList) {
        productsList.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px;">
                    <i class="fas fa-database" style="font-size: 64px; color: #f44336; margin-bottom: 20px; display: block;"></i>
                    <h3 style="color: #f44336; margin-bottom: 12px;">Cannot Connect to PocketBase</h3>
                    <p style="margin-bottom: 20px;">Make sure PocketBase is running at: <strong>${PB_URL}</strong></p>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: left; max-width: 500px; margin: 0 auto;">
                        <h4>How to fix this:</h4>
                        <ol style="margin-top: 12px; line-height: 1.8;">
                            <li>1. Check if PocketBase is running at ${PB_URL}</li>
                            <li>2. Verify the collection "${COLLECTION_NAME}" exists</li>
                            <li>3. Check your internet connection</li>
                            <li>4. Refresh this page</li>
                        </ol>
                    </div>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 30px;">
                        <i class="fas fa-sync-alt"></i> Retry Connection
                    </button>
                </td>
            </tr>
        `;
    }
}

function hideConnectionError() {
    // Connection is good, no action needed
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        if (!pb) {
            throw new Error("PocketBase not initialized");
        }
        
        console.log("Loading products from PocketBase...");
        
        const products = await Promise.race([
            pb.collection(COLLECTION_NAME).getFullList({
                sort: '-created',
                $autoCancel: false
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Request timeout")), 10000)
            )
        ]);
        
        console.log("✅ Products loaded successfully:", products.length);
        allProducts = products.map(p => formatProduct(p));
        filteredProducts = [...allProducts];
        
        renderProductsTable();
        
    } catch (error) {
        console.error("Error loading products:", error);
        
        let errorMessage = error.message;
        if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
            errorMessage = "Cannot connect to PocketBase. Make sure it's running at " + PB_URL;
        } else if (error.message.includes("404")) {
            errorMessage = `Collection '${COLLECTION_NAME}' not found. Please create it in PocketBase admin panel.`;
        }
        
        const productsList = document.getElementById('products-list');
        if (productsList) {
            productsList.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff9800;"></i>
                        <p style="margin-top: 16px; color: #f44336;"><strong>Error:</strong> ${errorMessage}</p>
                        <p style="margin-top: 8px; color: #666;">Make sure PocketBase is running at ${PB_URL}</p>
                        <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

// ==================== FORMAT PRODUCT ====================
function formatProduct(p) {
    // Get image URL
    let imageUrl = '/images/placeholder.jpg';
    if (p.image) {
        if (typeof p.image === 'string') {
            if (p.image.startsWith('http')) {
                imageUrl = p.image;
            } else if (pb) {
                try {
                    imageUrl = pb.files.getURL(p, p.image);
                } catch(e) {
                    imageUrl = p.image;
                }
            } else {
                imageUrl = p.image;
            }
        }
    }
    
    // Determine tag
    let tag = '';
    if (p.flashSale) tag = 'flash';
    else if (p.bestselling) tag = 'best';
    else if (p.newArrival) tag = 'new';
    
    return {
        id: p.id,
        name: p.name || 'Unnamed Product',
        price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
        oldPrice: p.oldPrice,
        category: p.category || 'Uncategorized',
        img: imageUrl,
        rating: p.rating || 4,
        reviews: p.reviews || 0,
        stock: p.stock !== false,
        tag: tag,
        description: p.description || '',
        colors: p.colors || [],
        sizes: p.sizes || []
    };
}

// ==================== RENDER PRODUCTS TABLE ====================
function renderProductsTable() {
    const tbody = document.getElementById('products-list');
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const pageProducts = filteredProducts.slice(start, end);
    
    if (!tbody) return;
    
    if (pageProducts.length === 0 && filteredProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 16px;">No products found. Create your first product!</p>
                    <button onclick="document.getElementById('add-product-btn')?.click()" class="btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Add Your First Product
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    if (pageProducts.length === 0 && filteredProducts.length > 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px;">
                    <p>No products match your filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageProducts.map(product => `
        <tr>
            <td><input type="checkbox" class="product-checkbox" data-id="${product.id}"></td>
            <td><img src="${product.img}" alt="${product.name}" class="product-thumb" onerror="this.src='/images/placeholder.jpg'"></td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category)}</td>
            <td>
                <span style="color: var(--primary); font-weight: 600;">$${product.price.toFixed(2)}</span>
                ${product.oldPrice ? `<span style="text-decoration: line-through; color: #999; margin-left: 8px;">$${product.oldPrice.toFixed(2)}</span>` : ''}
            </td>
            <td>
                <span style="color: ${product.stock ? '#4CAF50' : '#f44336'}">
                    ${product.stock ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span>${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
                    <span style="color: #999;">(${product.reviews})</span>
                </div>
            </td>
            <td>${getStatusBadge(product.tag)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    renderPagination();
}

function getStatusBadge(tag) {
    switch(tag) {
        case 'flash':
            return '<span class="status-badge status-flash"><i class="fas fa-bolt"></i> Flash Sale</span>';
        case 'best':
            return '<span class="status-badge status-best"><i class="fas fa-fire"></i> Best Selling</span>';
        case 'new':
            return '<span class="status-badge status-new"><i class="fas fa-star"></i> New Arrival</span>';
        default:
            return '<span class="status-badge">—</span>';
    }
}

// ==================== PAGINATION ====================
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    
    if (!pageNumbers) return;
    
    if (totalPages <= 1) {
        pageNumbers.innerHTML = '';
        return;
    }
    
    let pagesHtml = '';
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `<div class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</div>`;
    }
    
    pageNumbers.innerHTML = pagesHtml;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function goToPage(page) {
    currentPage = page;
    renderProductsTable();
}

// ==================== FILTER PRODUCTS ====================
function filterProducts() {
    const searchTerm = document.getElementById('search-products')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        const matchesStatus = !status || product.tag === status;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    currentPage = 1;
    renderProductsTable();
    updateStats();
}

// ==================== SAVE PRODUCT ====================
async function saveProduct() {
    if (!pb) {
        showNotification("PocketBase not connected", "error");
        return;
    }
    
    const id = document.getElementById('product-id').value;
    const tagValue = document.getElementById('product-tag')?.value || '';
    
    const productData = {
        name: document.getElementById('product-name')?.value || '',
        price: parseFloat(document.getElementById('product-price')?.value) || 0,
        oldPrice: parseFloat(document.getElementById('product-oldprice')?.value) || null,
        category: document.getElementById('product-category')?.value || '',
        image: document.getElementById('product-img')?.value || '',
        images: document.getElementById('product-images')?.value ? JSON.parse(document.getElementById('product-images').value) : [],
        rating: parseFloat(document.getElementById('product-rating')?.value) || 4,
        reviews: parseInt(document.getElementById('product-reviews')?.value) || 0,
        stock: document.getElementById('product-stock')?.value === 'true',
        description: document.getElementById('product-description')?.value || '',
        colors: document.getElementById('product-colors')?.value ? JSON.parse(document.getElementById('product-colors').value) : [],
        sizes: document.getElementById('product-sizes')?.value ? JSON.parse(document.getElementById('product-sizes').value) : [],
        flashSale: tagValue === 'flash',
        bestselling: tagValue === 'best',
        newArrival: tagValue === 'new'
    };
    
    try {
        if (id) {
            await pb.collection(COLLECTION_NAME).update(id, productData);
            showNotification('Product updated successfully!', 'success');
        } else {
            await pb.collection(COLLECTION_NAME).create(productData);
            showNotification('Product added successfully!', 'success');
        }
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.remove('active');
        await loadProducts();
        updateStats();
        
    } catch (error) {
        console.error("Error saving product:", error);
        showNotification('Error saving product: ' + error.message, 'error');
    }
}

// ==================== EDIT PRODUCT ====================
async function editProduct(id) {
    if (!pb) {
        showNotification("PocketBase not connected", "error");
        return;
    }
    
    try {
        const product = await pb.collection(COLLECTION_NAME).getOne(id);
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || 0;
        document.getElementById('product-oldprice').value = product.oldPrice || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-img').value = product.image || '';
        document.getElementById('product-images').value = product.images ? JSON.stringify(product.images) : '';
        document.getElementById('product-rating').value = product.rating || 4;
        document.getElementById('product-reviews').value = product.reviews || 0;
        document.getElementById('product-stock').value = product.stock !== false;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-colors').value = product.colors ? JSON.stringify(product.colors) : '';
        document.getElementById('product-sizes').value = product.sizes ? JSON.stringify(product.sizes) : '';
        
        let tag = '';
        if (product.flashSale) tag = 'flash';
        else if (product.bestselling) tag = 'best';
        else if (product.newArrival) tag = 'new';
        document.getElementById('product-tag').value = tag;
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error("Error loading product for edit:", error);
        showNotification('Error loading product', 'error');
    }
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    if (!pb) {
        showNotification("PocketBase not connected", "error");
        return;
    }
    
    try {
        await pb.collection(COLLECTION_NAME).delete(id);
        showNotification('Product deleted successfully!', 'success');
        await loadProducts();
        updateStats();
        
    } catch (error) {
        console.error("Error deleting product:", error);
        showNotification('Error deleting product: ' + error.message, 'error');
    }
}

// ==================== UPDATE STATS ====================
function updateStats() {
    const totalProductsEl = document.getElementById('total-products');
    const totalCategoriesEl = document.getElementById('total-categories');
    const totalValueEl = document.getElementById('total-value');
    const bestSellersEl = document.getElementById('best-sellers');
    
    if (totalProductsEl) totalProductsEl.textContent = allProducts.length;
    
    if (totalCategoriesEl) {
        const categories = new Set(allProducts.map(p => p.category));
        totalCategoriesEl.textContent = categories.size;
    }
    
    if (totalValueEl) {
        const totalValue = allProducts.reduce((sum, p) => sum + p.price, 0);
        totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
    }
    
    if (bestSellersEl) {
        const bestSellers = allProducts.filter(p => p.tag === 'best').length;
        bestSellersEl.textContent = bestSellers;
    }
}

// ==================== NOTIFICATION ====================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
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
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== UTILITIES ====================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Modal controls
    const modal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const closeModal = document.querySelector('.close-modal');
    const cancelModal = document.getElementById('cancel-modal');
    
    if (addBtn) {
        addBtn.onclick = () => {
            document.getElementById('modal-title').textContent = 'Add New Product';
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
            if (modal) modal.classList.add('active');
        };
    }
    
    if (closeModal) {
        closeModal.onclick = () => {
            if (modal) modal.classList.remove('active');
        };
    }
    
    if (cancelModal) {
        cancelModal.onclick = () => {
            if (modal) modal.classList.remove('active');
        };
    }
    
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }
    
    // Form submission
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = async (e) => {
            e.preventDefault();
            await saveProduct();
        };
    }
    
    // Search and filter
    const searchInput = document.getElementById('search-products');
    if (searchInput) searchInput.oninput = filterProducts;
    
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) filterCategory.onchange = filterProducts;
    
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.onchange = filterProducts;
    
    // Select all
    const selectAll = document.getElementById('select-all');
    if (selectAll) {
        selectAll.onchange = (e) => {
            document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = e.target.checked);
        };
    }
    
    // Pagination
    const prevPage = document.getElementById('prev-page');
    if (prevPage) {
        prevPage.onclick = () => {
            if (currentPage > 1) goToPage(currentPage - 1);
        };
    }
    
    const nextPage = document.getElementById('next-page');
    if (nextPage) {
        nextPage.onclick = () => {
            const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
            if (currentPage < totalPages) goToPage(currentPage + 1);
        };
    }
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sectionEl => {
                sectionEl.classList.remove('active');
            });
            
            const activeSection = document.getElementById(`${section}-section`);
            if (activeSection) activeSection.classList.add('active');
        };
    });
}

// ==================== ADD CSS ANIMATIONS ====================
if (!document.querySelector('#admin-animations')) {
    const style = document.createElement('style');
    style.id = 'admin-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification {
            font-family: 'Inter', sans-serif;
        }
    `;
    document.head.appendChild(style);
}

console.log("✅ Admin.js loaded successfully");
console.log("Connected to:", PB_URL);
console.log("Collection:", COLLECTION_NAME);