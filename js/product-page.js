window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) return console.error("No product ID provided!");

  try {
    const productPB = await window.pb.collection("exclusive_ecommerce").getOne(productId);
    if (!productPB) return console.error("Product not found!");

    const product = formatPBProduct(productPB);
    console.log("Product loaded:", product);

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

      let allImages = [product.img];
      if (product.additionalImages && product.additionalImages.length > 0) {
        allImages = [...allImages, ...product.additionalImages];
      }
      
      console.log("Total images to show:", allImages.length);

      allImages.forEach((img, index) => {
        const div = document.createElement("div");
        div.classList.add("product-img-wrapper");
        
        const imgElement = document.createElement("img");
        imgElement.src = img;
        imgElement.alt = `${product.name} - view ${index + 1}`;
        imgElement.classList.add("img-scale");
        
        if (index === 0) {
          imgElement.style.border = "2px solid #db4444";
          imgElement.style.padding = "2px";
        }
        
        imgElement.addEventListener("click", () => {
          if (heroImg) {
            heroImg.src = img;
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

    // ================ HEART ICON (WISHLIST) - FIXED ================
    const heartIconContainer = document.querySelector(".prod-like");
    if (heartIconContainer) {
      // Set the product ID
      heartIconContainer.dataset.id = product.id;
      
      // Find the existing heart icon (don't create a new one)
      let heartIcon = heartIconContainer.querySelector("i");
      
      // If no icon exists, create one (but this shouldn't happen if HTML is correct)
      if (!heartIcon) {
        heartIcon = document.createElement("i");
        heartIcon.setAttribute("data-lucide", "heart");
        heartIconContainer.appendChild(heartIcon);
      }
      
      // Set initial heart state based on wishlist
      if (window.wishlistSystem) {
        const isWishlisted = window.wishlistSystem.isWishlisted(product.id);
        if (isWishlisted) {
          heartIcon.classList.add("filled");
        } else {
          heartIcon.classList.remove("filled");
        }
      }
      
      // Remove existing click listeners and add new one
      const newHeartContainer = heartIconContainer.cloneNode(true);
      heartIconContainer.parentNode.replaceChild(newHeartContainer, heartIconContainer);
      
      // Add click handler for wishlist
      newHeartContainer.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pid = newHeartContainer.dataset.id;
        if (!pid) return;
        
        if (window.wishlistSystem) {
          // Toggle wishlist
          window.wishlistSystem.toggle(pid);
          
          // Update the heart icon
          const icon = newHeartContainer.querySelector("i");
          if (icon) {
            if (window.wishlistSystem.isWishlisted(pid)) {
              icon.classList.add("filled");
              showNotification("Added to wishlist", "success");
            } else {
              icon.classList.remove("filled");
              showNotification("Removed from wishlist", "info");
            }
          }
          
          // Update wishlist count in header
          if (window.wishlistSystem.updateCount) {
            window.wishlistSystem.updateCount();
          }
          
          // Dispatch event for other components
          document.dispatchEvent(new CustomEvent('wishlistUpdated', { 
            detail: window.wishlistSystem.items 
          }));
        }
      });
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
            const isWishlisted = window.wishlistSystem?.isWishlisted(related.id) || false;
            const isViewed = window.viewedSystem?.isViewed(related.id) || false;
            
            const div = document.createElement("div");
            div.classList.add("scroll");
            div.setAttribute("data-product-id", related.id);
            div.innerHTML = `
              <div class="scroll-img-section">
                <a href="product-details.html?id=${related.id}">
                  <img src="${related.img}" alt="${related.name}" onerror="this.src='/images/placeholder.jpg'">
                  ${related.tag ? `<span class="scroll-tag">${related.tag}</span>` : ''}
                </a>
                <div class="scroll-icon">
                  <span class="heart-icon" data-id="${related.id}">
                    <i data-lucide="heart" class="${isWishlisted ? 'filled' : ''}"></i>
                  </span>
                  <span class="eye-icon" data-id="${related.id}">
                    <i data-lucide="eye" class="${isViewed ? 'viewed' : ''}"></i>
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
          
          // Add event listeners for related products
          addRelatedProductEventListeners();
        }
      } catch (relatedError) {
        console.error("Error loading related products:", relatedError);
      }
    }

    // ---------------- RENDER LUCIDE ----------------
    if (typeof lucide !== "undefined") {
      setTimeout(() => lucide.createIcons(), 100);
    }

    // Mark product as viewed
    if (window.viewedSystem) {
      window.viewedSystem.markViewed(product.id);
    }

  } catch (err) {
    console.error("Error loading product page:", err);
  }
});

// Function to add event listeners to related products
function addRelatedProductEventListeners() {
  // Wishlist hearts for related products
  document.querySelectorAll(".related-products-grid .heart-icon").forEach(heart => {
    heart.removeEventListener("click", handleRelatedHeartClick);
    heart.addEventListener("click", handleRelatedHeartClick);
  });
  
  // Viewed eyes for related products
  document.querySelectorAll(".related-products-grid .eye-icon").forEach(eye => {
    eye.removeEventListener("click", handleRelatedEyeClick);
    eye.addEventListener("click", handleRelatedEyeClick);
  });
}

function handleRelatedHeartClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const heart = e.currentTarget;
  const productId = heart.dataset.id;
  if (!productId) return;
  
  if (window.wishlistSystem) {
    window.wishlistSystem.toggle(productId);
    
    // Update the heart icon
    const icon = heart.querySelector("i");
    if (icon) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
        showNotification("Added to wishlist", "success");
      } else {
        icon.classList.remove("filled");
        showNotification("Removed from wishlist", "info");
      }
    }
    
    // Update wishlist count in header
    if (window.wishlistSystem.updateCount) {
      window.wishlistSystem.updateCount();
    }
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { 
      detail: window.wishlistSystem.items 
    }));
  }
}

function handleRelatedEyeClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const eye = e.currentTarget;
  const productId = eye.dataset.id;
  if (!productId) return;
  
  if (window.viewedSystem) {
    window.viewedSystem.markViewed(productId);
    
    // Update the eye icon
    const icon = eye.querySelector("i");
    if (icon) {
      icon.classList.add("viewed");
    }
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('viewedUpdated', { 
      detail: window.viewedSystem.items 
    }));
  }
}

// Listen for wishlist updates from other pages
document.addEventListener('wishlistUpdated', () => {
  // Update main product heart
  const heartContainer = document.querySelector(".prod-like");
  if (heartContainer && window.wishlistSystem) {
    const productId = heartContainer.dataset.id;
    const icon = heartContainer.querySelector("i");
    if (productId && icon) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
      } else {
        icon.classList.remove("filled");
      }
    }
  }
  
  // Update all related product hearts
  document.querySelectorAll(".related-products-grid .heart-icon").forEach(heart => {
    const productId = heart.dataset.id;
    const icon = heart.querySelector("i");
    if (icon && window.wishlistSystem) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
      } else {
        icon.classList.remove("filled");
      }
    }
  });
});

// Listen for viewed updates
document.addEventListener('viewedUpdated', () => {
  // Update all related product eyes
  document.querySelectorAll(".related-products-grid .eye-icon").forEach(eye => {
    const productId = eye.dataset.id;
    const icon = eye.querySelector("i");
    if (icon && window.viewedSystem) {
      if (window.viewedSystem.isViewed(productId)) {
        icon.classList.add("viewed");
      }
    }
  });
});

// Helper function for notifications
function showNotification(message, type) {
  // Remove existing notification
  const existing = document.querySelector('.product-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'product-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#db4444'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ---------------- FORMAT PB PRODUCT ----------------
function formatPBProduct(p) {
  let mainImage = '/images/placeholder.jpg';
  
  if (p.image) {
    if (typeof p.image === 'string') {
      mainImage = p.image;
    } else if (Array.isArray(p.image) && p.image.length > 0) {
      mainImage = p.image[0];
    }
  }
  
  if (mainImage && mainImage.startsWith("/") && !mainImage.startsWith("http")) {
    mainImage = window.location.origin + mainImage;
  }

  let additionalImages = [];
  if (p.additional_images) {
    if (Array.isArray(p.additional_images)) {
      additionalImages = p.additional_images;
    } else if (typeof p.additional_images === 'string') {
      try {
        const parsed = JSON.parse(p.additional_images);
        if (Array.isArray(parsed)) {
          additionalImages = parsed;
        } else {
          additionalImages = [p.additional_images];
        }
      } catch (e) {
        additionalImages = [p.additional_images];
      }
    }
  }
  
  additionalImages = additionalImages.map(img => {
    if (img && img.startsWith("/") && !img.startsWith("http")) {
      return window.location.origin + img;
    }
    return img;
  });

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
    additionalImages: additionalImages,
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