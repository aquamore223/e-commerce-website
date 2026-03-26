// admin.js - PocketBase Admin Panel (Remote Version)

// ==================== CONFIGURATION ====================
const PB_URL = "https://itrain.services.hodessy.com";
const COLLECTION_NAME = "exclusive_ecommerce";

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
    setupTagTypeListener();
    setupImageFormatListener();
});

// ==================== HELPER FUNCTIONS ====================

// Parse colors from simple format (color: image_url)
function parseColorsSimple(input) {
    if (!input || input.trim() === '') return [];
    
    // If it's already an array
    if (Array.isArray(input)) return input;
    
    // Try to parse as JSON first (for backward compatibility)
    try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
            return parsed.map(color => ({
                name: color.name || color,
                code: getColorCode(color.name || color),
                img: color.img || color.image || ''
            }));
        }
    } catch (e) {
        // Not JSON, parse simple format
    }
    
    // Parse simple format: color: image_url (one per line)
    const lines = input.split('\n');
    const colors = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Split by colon
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        
        const colorName = trimmed.substring(0, colonIndex).trim().toLowerCase();
        const imageUrl = trimmed.substring(colonIndex + 1).trim();
        
        if (colorName && imageUrl) {
            colors.push({
                name: colorName,
                code: getColorCode(colorName),
                img: imageUrl
            });
        }
    }
    
    return colors;
}

// Parse comma-separated values
function parseCommaSeparated(input) {
    if (!input || input.trim() === '') return [];
    if (Array.isArray(input)) return input;
    
    // Try to parse as JSON first
    try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        // Not JSON, continue
    }
    
    // Parse comma-separated values
    return input.split(',').map(item => item.trim()).filter(item => item);
}

// Get color code from name
function getColorCode(colorName) {
    const colorMap = {
        'red': '#ff0000', 'blue': '#0000ff', 'green': '#00ff00', 'black': '#000000',
        'white': '#ffffff', 'yellow': '#ffff00', 'purple': '#800080', 'pink': '#ff69b4',
        'orange': '#ffa500', 'gray': '#808080', 'grey': '#808080', 'brown': '#8b4513',
        'navy': '#000080', 'teal': '#008080', 'gold': '#ffd700', 'silver': '#c0c0c0',
        'cyan': '#00ffff', 'magenta': '#ff00ff', 'lime': '#00ff00', 'maroon': '#800000',
        'olive': '#808000', 'coral': '#ff7f50', 'tan': '#d2b48c', 'lavender': '#e6e6fa'
    };
    return colorMap[colorName.toLowerCase()] || '#cccccc';
}

// Format colors for display in table
function formatColorsForDisplay(colors) {
    if (!colors || colors.length === 0) return '';
    return colors.map(c => c.name).join(', ');
}

// Format colors for textarea (simple format)
function formatColorsForTextarea(colors) {
    if (!colors || colors.length === 0) return '';
    return colors.map(c => `${c.name}: ${c.img}`).join('\n');
}

// Parse image URLs from comma-separated
function parseImages(input) {
    if (!input || input.trim() === '') return [];
    return input.split(',').map(url => url.trim()).filter(url => url);
}

// ==================== CONNECTION CHECK ====================
async function checkConnection() {
    try {
        const response = await fetch(`${PB_URL}/api/health`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            <tr><td colspan="9" style="text-align: center; padding: 60px;">
                <i class="fas fa-database" style="font-size: 64px; color: #f44336;"></i>
                <h3 style="color: #f44336;">Cannot Connect to PocketBase</h3>
                <p>Make sure PocketBase is running at: <strong>${PB_URL}</strong></p>
                <button onclick="location.reload()" class="btn-primary">Retry</button>
            </td></tr>
        `;
    }
}

function hideConnectionError() {}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        if (!pb) throw new Error("PocketBase not initialized");
        
        console.log("Loading products from PocketBase...");
        
        const products = await Promise.race([
            pb.collection(COLLECTION_NAME).getFullList({ sort: '-created', $autoCancel: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 10000))
        ]);
        
        console.log("✅ Products loaded successfully:", products.length);
        allProducts = products.map(p => formatProduct(p));
        filteredProducts = [...allProducts];
        
        renderProductsTable();
        
    } catch (error) {
        console.error("Error loading products:", error);
        const productsList = document.getElementById('products-list');
        if (productsList) {
            productsList.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px;">
                <p style="color: #f44336;">Error: ${error.message}</p>
                <button onclick="location.reload()" class="btn-primary">Retry</button>
            </td></tr>`;
        }
    }
}

// ==================== FORMAT PRODUCT ====================
function formatProduct(p) {
    // Get main image URL
    let imageUrl = '/images/placeholder.jpg';
    if (p.image) {
        if (typeof p.image === 'string') {
            if (p.image.startsWith('http')) {
                imageUrl = p.image;
            } else if (pb) {
                try {
                    imageUrl = pb.files.getURL(p, p.image);
                } catch(e) { imageUrl = p.image; }
            } else {
                imageUrl = p.image;
            }
        }
    }
    
    // Handle additional images
    let additionalImages = [];
    if (p.additional_images) {
        if (Array.isArray(p.additional_images)) {
            additionalImages = p.additional_images;
        } else if (typeof p.additional_images === 'string') {
            additionalImages = parseImages(p.additional_images);
        }
    }
    
    // Handle colors with images (simple format)
    let colors = [];
    if (p.colors) {
        if (Array.isArray(p.colors)) {
            colors = p.colors;
        } else if (typeof p.colors === 'string') {
            colors = parseColorsSimple(p.colors);
        }
    }
    
    // Handle sizes
    let sizes = [];
    if (p.sizes) {
        if (Array.isArray(p.sizes)) {
            sizes = p.sizes;
        } else if (typeof p.sizes === 'string') {
            sizes = parseCommaSeparated(p.sizes);
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
        additionalImages: additionalImages,
        rating: p.rating || 4,
        reviews: p.reviews || 0,
        stock: p.stock !== false,
        tag: tag,
        description: p.description || '',
        colors: colors,
        sizes: sizes,
        discount: p.discount || 10
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
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 60px;">
            <i class="fas fa-box-open" style="font-size: 48px; color: #ccc;"></i>
            <p>No products found. Create your first product!</p>
            <button onclick="document.getElementById('add-product-btn')?.click()" class="btn-primary">Add Product</button>
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = pageProducts.map(product => `
        <tr>
            <td><input type="checkbox" class="product-checkbox" data-id="${product.id}"></td>
            <td><img src="${product.img}" alt="${product.name}" class="product-thumb" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.src='/images/placeholder.jpg'"></td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category)}</td>
            <td>$${product.price.toFixed(2)}${product.oldPrice ? `<span style="text-decoration: line-through; color: #999; margin-left: 8px;">$${product.oldPrice.toFixed(2)}</span>` : ''}</td>
            <td><span style="color: ${product.stock ? '#4CAF50' : '#f44336'}">${product.stock ? 'In Stock' : 'Out of Stock'}</span></td>
            <td>${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))} (${product.reviews})</td>
            <td>${getStatusBadge(product.tag)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    renderPagination();
}

function getStatusBadge(tag) {
    switch(tag) {
        case 'flash': return '<span class="status-badge status-flash"><i class="fas fa-bolt"></i> Flash Sale</span>';
        case 'best': return '<span class="status-badge status-best"><i class="fas fa-fire"></i> Best Selling</span>';
        case 'new': return '<span class="status-badge status-new"><i class="fas fa-star"></i> New Arrival</span>';
        default: return '<span class="status-badge">—</span>';
    }
}

// ==================== PAGINATION ====================
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    if (!pageNumbers) return;
    
    if (totalPages <= 1) { pageNumbers.innerHTML = ''; return; }
    
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

function goToPage(page) { currentPage = page; renderProductsTable(); }

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

// ==================== SETUP LISTENERS ====================
function setupTagTypeListener() {
    const tagTypeSelect = document.getElementById('product-tag-type');
    if (tagTypeSelect) {
        tagTypeSelect.addEventListener('change', function() {
            const discountField = document.getElementById('discount-field');
            if (discountField) discountField.style.display = this.value === 'flash' ? 'flex' : 'none';
        });
    }
}

function setupImageFormatListener() {
    const imageFormatSelect = document.getElementById('image-format');
    if (imageFormatSelect) {
        imageFormatSelect.addEventListener('change', function() {
            const singleImageField = document.getElementById('single-image-field');
            const multipleImagesField = document.getElementById('multiple-images-field');
            if (this.value === 'single') {
                if (singleImageField) singleImageField.style.display = 'flex';
                if (multipleImagesField) multipleImagesField.style.display = 'none';
            } else {
                if (singleImageField) singleImageField.style.display = 'none';
                if (multipleImagesField) multipleImagesField.style.display = 'flex';
            }
        });
    }
}

// ==================== SAVE PRODUCT ====================
async function saveProduct() {
    if (!pb) { showNotification("PocketBase not connected", "error"); return; }
    
    const id = document.getElementById('product-id').value;
    const tagType = document.getElementById('product-tag-type')?.value || 'none';
    const discount = parseInt(document.getElementById('product-discount')?.value) || 10;
    
    // Handle images
    let mainImage = '';
    let additionalImages = [];
    const imageFormat = document.getElementById('image-format')?.value || 'single';
    
    if (imageFormat === 'multiple') {
        const imagesInput = document.getElementById('product-additional-images')?.value || '';
        additionalImages = parseImages(imagesInput);
        if (additionalImages.length > 0) mainImage = additionalImages[0];
    } else {
        mainImage = document.getElementById('product-img')?.value || '';
    }
    
    // Handle colors with images (simple format)
    let colors = [];
    const colorsInput = document.getElementById('product-colors')?.value || '';
    if (colorsInput.trim()) {
        colors = parseColorsSimple(colorsInput);
        if (colors.length === 0 && colorsInput.trim()) {
            showNotification('Invalid colors format. Use format: color: image_url (one per line)', 'error');
            return;
        }
    }
    
    // Handle sizes
    const sizesInput = document.getElementById('product-sizes')?.value || '';
    const sizes = parseCommaSeparated(sizesInput);
    
    const productData = {
        name: document.getElementById('product-name')?.value || '',
        price: parseFloat(document.getElementById('product-price')?.value) || 0,
        oldPrice: parseFloat(document.getElementById('product-oldprice')?.value) || null,
        category: document.getElementById('product-category')?.value || '',
        image: mainImage,
        additional_images: additionalImages,
        rating: parseFloat(document.getElementById('product-rating')?.value) || 4,
        reviews: parseInt(document.getElementById('product-reviews')?.value) || 0,
        stock: document.getElementById('product-stock')?.value === 'true',
        description: document.getElementById('product-description')?.value || '',
        colors: colors,
        sizes: sizes,
        discount: discount,
        flashSale: tagType === 'flash',
        bestselling: tagType === 'best',
        newArrival: tagType === 'new'
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
    if (!pb) { showNotification("PocketBase not connected", "error"); return; }
    
    try {
        const product = await pb.collection(COLLECTION_NAME).getOne(id);
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || 0;
        document.getElementById('product-oldprice').value = product.oldPrice || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-rating').value = product.rating || 4;
        document.getElementById('product-reviews').value = product.reviews || 0;
        document.getElementById('product-stock').value = product.stock !== false;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-discount').value = product.discount || 10;
        
        // Handle images
        if (product.additional_images && product.additional_images.length > 0) {
            document.getElementById('image-format').value = 'multiple';
            document.getElementById('product-additional-images').value = product.additional_images.join(', ');
            document.getElementById('single-image-field').style.display = 'none';
            document.getElementById('multiple-images-field').style.display = 'flex';
        } else {
            document.getElementById('image-format').value = 'single';
            document.getElementById('product-img').value = product.image || '';
            document.getElementById('single-image-field').style.display = 'flex';
            document.getElementById('multiple-images-field').style.display = 'none';
        }
        
        // Handle colors with images (simple format)
        if (product.colors && product.colors.length > 0) {
            document.getElementById('product-colors').value = formatColorsForTextarea(product.colors);
        } else {
            document.getElementById('product-colors').value = '';
        }
        
        // Handle sizes
        if (product.sizes && product.sizes.length > 0) {
            document.getElementById('product-sizes').value = product.sizes.join(', ');
        } else {
            document.getElementById('product-sizes').value = '';
        }
        
        // Handle tag type
        let tag = 'none';
        if (product.flashSale) tag = 'flash';
        else if (product.bestselling) tag = 'best';
        else if (product.newArrival) tag = 'new';
        document.getElementById('product-tag-type').value = tag;
        
        const discountField = document.getElementById('discount-field');
        if (discountField) discountField.style.display = tag === 'flash' ? 'flex' : 'none';
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error("Error loading product for edit:", error);
        showNotification('Error loading product', 'error');
    }
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    if (!pb) { showNotification("PocketBase not connected", "error"); return; }
    
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
    document.getElementById('total-products').textContent = allProducts.length;
    const categories = new Set(allProducts.map(p => p.category));
    document.getElementById('total-categories').textContent = categories.size;
    const totalValue = allProducts.reduce((sum, p) => sum + p.price, 0);
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    const bestSellers = allProducts.filter(p => p.tag === 'best').length;
    document.getElementById('best-sellers').textContent = bestSellers;
}

// ==================== NOTIFICATION ====================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999;
        animation: slideIn 0.3s ease; display: flex; align-items: center; gap: 12px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease'; setTimeout(() => notification.remove(), 300); }, 3000);
}

// ==================== UTILITIES ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    const modal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const closeModal = document.querySelector('.close-modal');
    const cancelModal = document.getElementById('cancel-modal');
    
    if (addBtn) {
        addBtn.onclick = () => {
            document.getElementById('modal-title').textContent = 'Add New Product';
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
            document.getElementById('image-format').value = 'single';
            document.getElementById('single-image-field').style.display = 'flex';
            document.getElementById('multiple-images-field').style.display = 'none';
            if (modal) modal.classList.add('active');
        };
    }
    
    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');
    if (cancelModal) cancelModal.onclick = () => modal.classList.remove('active');
    if (modal) modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.onsubmit = async (e) => { e.preventDefault(); await saveProduct(); };
    
    const searchInput = document.getElementById('search-products');
    if (searchInput) searchInput.oninput = filterProducts;
    
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) filterCategory.onchange = filterProducts;
    
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.onchange = filterProducts;
    
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.onchange = (e) => document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = e.target.checked);
    
    const prevPage = document.getElementById('prev-page');
    if (prevPage) prevPage.onclick = () => { if (currentPage > 1) goToPage(currentPage - 1); };
    
    const nextPage = document.getElementById('next-page');
    if (nextPage) nextPage.onclick = () => { const totalPages = Math.ceil(filteredProducts.length / productsPerPage); if (currentPage < totalPages) goToPage(currentPage + 1); };
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.content-section').forEach(sectionEl => sectionEl.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
        };
    });
}

// ==================== ADD CSS ANIMATIONS ====================
if (!document.querySelector('#admin-animations')) {
    const style = document.createElement('style');
    style.id = 'admin-animations';
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .status-flash { background: #ffe6e6; color: #db4444; }
        .status-best { background: #e6f3ff; color: #2196f3; }
        .status-new { background: #e6ffe6; color: #4caf50; }
        .action-buttons { display: flex; gap: 8px; }
        .action-btn { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.3s ease; }
        .edit-btn { background: #2196f3; color: white; }
        .edit-btn:hover { background: #0b7dda; }
        .delete-btn { background: #f44336; color: white; }
        .delete-btn:hover { background: #da190b; }
    `;
    document.head.appendChild(style);
}

console.log("✅ Admin.js loaded successfully");
console.log("Connected to:", PB_URL);
console.log("Collection:", COLLECTION_NAME);