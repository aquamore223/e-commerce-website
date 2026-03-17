document.addEventListener('DOMContentLoaded', initAdminPage);

function initAdminPage() {
  loadProducts();
  setupForm();
}

// Get products from localStorage
function getProducts() {
  return JSON.parse(localStorage.getItem('products')) || [];
}

// Save products to localStorage
function saveProducts(products) {
  localStorage.setItem('products', JSON.stringify(products));
}

// Load products into admin table
function loadProducts() {
  const container = document.getElementById('product-list');
  const products = getProducts();

  if (!products.length) {
    container.innerHTML = `<p>No products added yet.</p>`;
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-item" data-id="${p.id}">
      <img src="${p.img}" alt="${p.name}" width="80">
      <div class="product-info">
        <p><strong>${p.name}</strong></p>
        <p>Price: $${p.price} ${p.oldPrice ? `<span>$${p.oldPrice}</span>` : ''}</p>
        <p>Category: ${p.category}</p>
        <p>Tag: ${p.tag || 'None'}</p>
        <p>Rating: ${p.rating || 0}/5</p>
      </div>
      <div class="product-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    </div>
  `).join('');

  setupProductButtons();
}

// Add/Edit product form logic
function setupForm() {
  const saveBtn = document.getElementById('save-product-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');

  saveBtn.addEventListener('click', e => {
    e.preventDefault();
    saveProduct();
  });

  cancelBtn.addEventListener('click', e => {
    e.preventDefault();
    resetForm();
  });
}

// Save or update product
function saveProduct() {
  const idInput = document.getElementById('product-id');
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const oldPrice = parseFloat(document.getElementById('product-oldprice').value) || null;
  const category = document.getElementById('product-category').value.trim();
  const img = document.getElementById('product-img').value.trim();
  const tag = document.getElementById('product-tag').value.trim();
  const rating = parseInt(document.getElementById('product-rating').value) || 4;

  if (!name || !price || !category || !img) {
    alert('Please fill in all required fields');
    return;
  }

  const products = getProducts();

  if (idInput.value) {
    // Update existing product
    const index = products.findIndex(p => p.id === idInput.value);
    if (index > -1) {
      products[index] = { id: idInput.value, name, price, oldPrice, category, img, tag, rating };
    }
  } else {
    // Add new product
    const newId = Date.now().toString();
    products.push({ id: newId, name, price, oldPrice, category, img, tag, rating });
  }

  saveProducts(products);
  loadProducts();
  resetForm();
}

// Reset form
function resetForm() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('product-oldprice').value = '';
  document.getElementById('product-category').value = '';
  document.getElementById('product-img').value = '';
  document.getElementById('product-tag').value = '';
  document.getElementById('product-rating').value = '';
  document.getElementById('save-product-btn').textContent = 'Add Product';
}

// Setup edit and delete buttons
function setupProductButtons() {
  const editBtns = document.querySelectorAll('.edit-btn');
  const deleteBtns = document.querySelectorAll('.delete-btn');

  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.product-item').dataset.id;
      editProduct(id);
    });
  });

  deleteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.product-item').dataset.id;
      deleteProduct(id);
    });
  });
}

// Edit product
function editProduct(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-oldprice').value = product.oldPrice || '';
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-img').value = product.img;
  document.getElementById('product-tag').value = product.tag || '';
  document.getElementById('product-rating').value = product.rating || 4;

  document.getElementById('save-product-btn').textContent = 'Update Product';
}

// Delete product
function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  loadProducts();
}