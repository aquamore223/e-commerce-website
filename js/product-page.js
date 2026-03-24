window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) return console.error("No product ID provided!");

  try {
    const productPB = await window.pb.collection("exclusive_ecommerce").getOne(productId);
    if (!productPB) return console.error("Product not found!");

    const product = formatPBProduct(productPB);
    console.log("Product loaded:", product);
    console.log("Additional images:", product.additionalImages);

    // ---------------- BREADCRUMB ----------------
    const breadcrumb = document.getElementById("disp-hd");
    if (breadcrumb) {
      breadcrumb.innerHTML = `<a href="index.html">Home</a> / <a href="#">${product.category}</a> / <span>${product.name}</span>`;
    }

    // ---------------- HERO IMAGE ----------------
    const heroImg = document.querySelector(".product-hero img");
    if (heroImg) heroImg.src = product.img;

    // ---------------- THUMBNAILS (SIDE IMAGES) ----------------
    const smallImgContainer = document.querySelector(".product-img-wrapper-cont");
    
    if (smallImgContainer) {
      smallImgContainer.innerHTML = "";

      // Create array of all images: main image + additional images
      let allImages = [product.img];
      
      // Add additional images if they exist
      if (product.additionalImages && product.additionalImages.length > 0) {
        allImages = [...allImages, ...product.additionalImages];
      }
      
      console.log("Total images to show:", allImages.length);

      // Create thumbnails for all images
      allImages.forEach((img, index) => {
        const div = document.createElement("div");
        div.classList.add("product-img-wrapper");
        
        const imgElement = document.createElement("img");
        imgElement.src = img;
        imgElement.alt = `${product.name} - view ${index + 1}`;
        imgElement.classList.add("img-scale");
        
        // Highlight the first thumbnail (which is the main image)
        if (index === 0) {
          imgElement.style.border = "2px solid #db4444";
          imgElement.style.padding = "2px";
        }
        
        imgElement.addEventListener("click", () => {
          if (heroImg) {
            heroImg.src = img;
            // Update active thumbnail styling
            document.querySelectorAll(".product-img-wrapper img").forEach(thumb => {
              thumb.style.border = "none";
              thumb.style.padding = "0";
            });
            imgElement.style.border = "2px solid #db4444";
            imgElement.style.padding = "2px";
          }
        });
        
        div.appendChild(imgElement);
        smallImgContainer.appendChild(div);
      });
    }

    // ---------------- PRODUCT INFO ----------------
    const nameElement = document.querySelector(".prod-det-text h5");
    if (nameElement) nameElement.textContent = product.name;
    
    const priceElement = document.getElementById("prod-price");
    if (priceElement) priceElement.textContent = formatPrice(product.price);
    
    const descriptionElement = document.querySelector(".product-description");
    if (descriptionElement && product.description) {
      descriptionElement.textContent = product.description;
    }

    // ---------------- RATINGS ----------------
    const ratingContainer = document.querySelector(".prod-det-text .rating");
    if (ratingContainer) {
      ratingContainer.innerHTML = "";

      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.setAttribute("data-lucide", "star");
        star.classList.add(i <= (product.rating || 4) ? "full" : "empty");
        ratingContainer.appendChild(star);
      }

      const reviewsSpan = document.createElement("span");
      reviewsSpan.textContent = `(${product.reviews || 0} Reviews)`;

      const stockSpan = document.createElement("span");
      stockSpan.textContent = product.stock ? " | In Stock" : " | Out of Stock";
      stockSpan.style.color = product.stock ? "#4CAF50" : "#f44336";

      ratingContainer.append(" ", reviewsSpan, " ", stockSpan);
    }

    // ---------------- COLORS ----------------
    const colorsContainer = document.querySelector(".product-colors");
    if (colorsContainer && product.colors && product.colors.length > 0) {
      colorsContainer.innerHTML = "<p>Colour:</p>";
      product.colors.forEach((color, idx) => {
        const inputId = `color-${idx}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "color";
        input.id = inputId;
        input.dataset.img = color.img || product.img;
        if (idx === 0) input.checked = true;

        const label = document.createElement("label");
        label.setAttribute("for", inputId);
        label.classList.add("color");
        label.style.backgroundColor = color.code || '#ccc';
        label.title = color.name;

        colorsContainer.appendChild(input);
        colorsContainer.appendChild(label);

        input.addEventListener("change", () => {
          if (heroImg && input.dataset.img) {
            heroImg.src = input.dataset.img;
          }
        });
      });
    }

    // ---------------- SIZES ----------------
    const sizesContainer = document.querySelector(".sizes");
    if (sizesContainer && product.sizes && product.sizes.length > 0) {
      sizesContainer.innerHTML = "";
      product.sizes.forEach((size, idx) => {
        const inputId = `size-${idx}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "size";
        input.id = inputId;
        input.value = size;
        if (idx === 0) input.checked = true;

        const label = document.createElement("label");
        label.setAttribute("for", inputId);
        label.textContent = size;

        sizesContainer.appendChild(input);
        sizesContainer.appendChild(label);
      });
    }

    // ---------------- QUANTITY ----------------
    const minus = document.querySelector(".prod-no button:first-child");
    const plus = document.querySelector(".prod-no button:last-child");
    const inputQty = document.querySelector(".prod-no input");

    if (plus && minus && inputQty) {
      plus.onclick = () => {
        let val = parseInt(inputQty.value) || 1;
        inputQty.value = val + 1;
      };
      minus.onclick = () => {
        let val = parseInt(inputQty.value) || 1;
        if (val > 1) inputQty.value = val - 1;
      };
    }

    // ---------------- ADD TO CART BUTTON ----------------
    const addToCartBtn = document.querySelector(".add-to-cart-btn");
    if (addToCartBtn) {
      addToCartBtn.dataset.id = product.id;
    }

    // ---------------- HEART ICON ----------------
    const heartIcon = document.querySelector(".prod-like");
    if (heartIcon) {
      heartIcon.dataset.id = product.id;
    }

    // ---------------- RELATED PRODUCTS ----------------
    const relatedContainer = document.querySelector(".related-grid");
    if (relatedContainer) {
      try {
        const relatedProducts = await window.pb.collection("exclusive_ecommerce").getFullList({
          filter: `category="${product.category}" && id != "${product.id}"`,
          sort: '-created',
          limit: 4
        });
        
        console.log(`Found ${relatedProducts.length} related products`);
        
        relatedContainer.innerHTML = `
          <div class="wish-hd">
            <div class="wish-rod">
              <div id="red-rod-tag"></div>
              <h5>Related Products</h5>
            </div>
          </div>
          <div class="related-products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 25px; margin-top: 20px;"></div>
        `;
        
        const productsGrid = relatedContainer.querySelector(".related-products-grid");
        
        if (relatedProducts.length === 0) {
          productsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:40px;">No related products found</p>';
        } else {
          relatedProducts.forEach(p => {
            const related = formatPBProduct(p);
            const div = document.createElement("div");
            div.classList.add("scroll");
            div.innerHTML = `
              <div class="scroll-img-section">
                <a href="product-details.html?id=${related.id}">
                  <img src="${related.img}" alt="${related.name}" onerror="this.src='/images/placeholder.jpg'">
                  ${related.tag ? `<span class="scroll-tag">${related.tag}</span>` : ''}
                </a>
                <div class="scroll-icon">
                  <span class="heart-icon" data-id="${related.id}">
                    <i data-lucide="heart"></i>
                  </span>
                  <span class="eye-icon" data-id="${related.id}">
                    <i data-lucide="eye"></i>
                  </span>
                </div>
                <button class="add-to-cart-btn" data-id="${related.id}">Add To Cart</button>
              </div>
              <a href="product-details.html?id=${related.id}">
                <div class="scroll-text">
                  <h5>${related.name}</h5>
                  <p class="price">
                    ${formatPrice(related.price)}
                    ${related.oldPrice ? `<span>${formatPrice(related.oldPrice)}</span>` : ''}
                  </p>
                  <div class="rating">
                    ${generateStars(related.rating || 4)}
                    <span>(${related.reviews || 0})</span>
                  </div>
                </div>
              </a>
            `;
            productsGrid.appendChild(div);
          });
        }
      } catch (relatedError) {
        console.error("Error loading related products:", relatedError);
      }
    }

    // ---------------- RENDER LUCIDE ----------------
    if (typeof lucide !== "undefined") {
      setTimeout(() => lucide.createIcons(), 100);
    }

  } catch (err) {
    console.error("Error loading product page:", err);
  }
});

// ---------------- FORMAT PB PRODUCT ----------------
function formatPBProduct(p) {
  // Handle main image (keep your existing logic)
  let mainImage = '/images/placeholder.jpg';
  
  if (p.image) {
    if (typeof p.image === 'string') {
      mainImage = p.image;
    } else if (Array.isArray(p.image) && p.image.length > 0) {
      mainImage = p.image[0];
    }
  }
  
  // Fix relative paths for main image
  if (mainImage && mainImage.startsWith("/") && !mainImage.startsWith("http")) {
    mainImage = window.location.origin + mainImage;
  }

  // Handle additional images (new field)
  let additionalImages = [];
  
  if (p.additional_images) {
    if (Array.isArray(p.additional_images)) {
      // If it's already an array
      additionalImages = p.additional_images;
    } else if (typeof p.additional_images === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(p.additional_images);
        if (Array.isArray(parsed)) {
          additionalImages = parsed;
        } else {
          additionalImages = [p.additional_images];
        }
      } catch (e) {
        // Not JSON, treat as single URL
        additionalImages = [p.additional_images];
      }
    }
  }
  
  // Fix relative paths for additional images
  additionalImages = additionalImages.map(img => {
    if (img && img.startsWith("/") && !img.startsWith("http")) {
      return window.location.origin + img;
    }
    return img;
  });

  // Handle colors
  let colorsArray = [];
  if (p.colors) {
    if (Array.isArray(p.colors)) {
      colorsArray = p.colors;
    } else if (typeof p.colors === 'string') {
      try {
        colorsArray = JSON.parse(p.colors);
      } catch (e) {
        colorsArray = p.colors.split(',').map(c => ({ name: c.trim(), code: '#ccc' }));
      }
    }
  }
  
  // Handle sizes
  let sizesArray = [];
  if (p.sizes) {
    if (Array.isArray(p.sizes)) {
      sizesArray = p.sizes;
    } else if (typeof p.sizes === 'string') {
      try {
        sizesArray = JSON.parse(p.sizes);
      } catch (e) {
        sizesArray = p.sizes.split(',');
      }
    }
  }

  return {
    id: p.id,
    name: p.name || "Product",
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
    oldPrice: p.oldPrice ? (typeof p.oldPrice === 'number' ? p.oldPrice : parseFloat(p.oldPrice)) : null,
    category: p.category || "Uncategorized",
    img: mainImage,
    additionalImages: additionalImages, // New field for side images
    description: p.description || "No description available",
    rating: p.rating || 4,
    reviews: p.reviews || 0,
    colors: colorsArray,
    sizes: sizesArray,
    stock: p.stock !== false,
    tag: p.flashSale ? "-SALE" : (p.newArrival ? "NEW" : "")
  };
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