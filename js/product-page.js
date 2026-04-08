window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) return console.error("No product ID provided!");

  try {
    const productPB = await window.pb.collection("exclusive_ecommerce").getOne(productId);
    if (!productPB) return console.error("Product not found!");

    const product = formatPBProduct(productPB);
     

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
      // Fetch real reviews from the reviews collection
      let realReviewCount = 0;
      let realAvgRating = 4;
      
      try {
        const productReviews = await window.pb.collection("reviews").getFullList({
          filter: `productId = "${product.id}" && status = "approved"`,
          $autoCancel: false
        });
        
        realReviewCount = productReviews.length;
        if (realReviewCount > 0) {
          realAvgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / realReviewCount;
        }
      } catch (error) {
        console.log("Reviews collection not available, using product defaults");
        realReviewCount = product.reviews || 0;
        realAvgRating = product.rating || 4;
      }
      
      // Clear existing content
      ratingContainer.innerHTML = "";
      
      // Generate stars based on real average rating
      const roundedRating = Math.round(realAvgRating);
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.setAttribute("data-lucide", "star");
        star.classList.add(i <= roundedRating ? "full" : "empty");
        ratingContainer.appendChild(star);
      }
      
      // Add review count from real reviews
      const reviewsSpan = document.createElement("span");
      reviewsSpan.textContent = `(${realReviewCount} ${realReviewCount === 1 ? 'Review' : 'Reviews'})`;
      
      const stockSpan = document.createElement("span");
      stockSpan.textContent = product.stock ? " | In Stock" : " | Out of Stock";
      stockSpan.style.color = product.stock ? "#4CAF50" : "#f44336";
      
      ratingContainer.append(" ", reviewsSpan, " ", stockSpan);
    }

    // ---------------- COLORS ----------------
    let selectedColor = null;
    const colorsContainer = document.querySelector(".product-colors");
    if (colorsContainer && product.colors && product.colors.length > 0) {
      colorsContainer.innerHTML = "<p>Colour:</p>";
      product.colors.forEach((color, idx) => {
        const inputId = `color-${idx}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "color";
        input.id = inputId;
        input.value = color.name;
        input.dataset.img = color.img || product.img;
        if (idx === 0) {
          input.checked = true;
          selectedColor = color.name;
        }

        const label = document.createElement("label");
        label.setAttribute("for", inputId);
        label.classList.add("color");
        label.style.backgroundColor = color.code || '#ccc';
        label.title = color.name;

        colorsContainer.appendChild(input);
        colorsContainer.appendChild(label);

        input.addEventListener("change", () => {
          selectedColor = input.value;
          if (heroImg && input.dataset.img) {
            heroImg.src = input.dataset.img;
          }
        });
      });
    }

    // ---------------- SIZES ----------------
    let selectedSize = null;
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
        if (idx === 0) {
          input.checked = true;
          selectedSize = size;
        }

        const label = document.createElement("label");
        label.setAttribute("for", inputId);
        label.textContent = size;

        sizesContainer.appendChild(input);
        sizesContainer.appendChild(label);

        input.addEventListener("change", () => {
          selectedSize = input.value;
        });
      });
    }

    // ---------------- QUANTITY ----------------
    const minus = document.querySelector(".prod-no button:first-child");
    const plus = document.querySelector(".prod-no button:last-child");
    const inputQty = document.querySelector(".prod-no input");
    let quantity = 1;

    if (plus && minus && inputQty) {
      plus.onclick = () => {
        let val = parseInt(inputQty.value) || 1;
        inputQty.value = val + 1;
        quantity = val + 1;
      };
      minus.onclick = () => {
        let val = parseInt(inputQty.value) || 1;
        if (val > 1) {
          inputQty.value = val - 1;
          quantity = val - 1;
        }
      };
      inputQty.addEventListener("change", () => {
        let val = parseInt(inputQty.value) || 1;
        if (val < 1) val = 1;
        inputQty.value = val;
        quantity = val;
      });
      quantity = parseInt(inputQty.value) || 1;
    }

    // ---------------- ADD TO CART BUTTON WITH FULL DETAILS ----------------
    const addToCartBtn = document.querySelector(".add-to-cart-btn");
    if (addToCartBtn) {
      // Remove existing listeners
      const newAddToCartBtn = addToCartBtn.cloneNode(true);
      addToCartBtn.parentNode.replaceChild(newAddToCartBtn, addToCartBtn);
      
      newAddToCartBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        
        // Get selected options
        const selectedColorElem = document.querySelector('input[name="color"]:checked');
        const selectedSizeElem = document.querySelector('input[name="size"]:checked');
        
        const color = selectedColorElem ? selectedColorElem.value : null;
        const size = selectedSizeElem ? selectedSizeElem.value : null;
        const qty = parseInt(document.querySelector(".prod-no input")?.value) || 1;
        
        // Create cart item with all details
        const cartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          img: heroImg ? heroImg.src : product.img,
          color: color,
          size: size,
          qty: qty,
          totalPrice: product.price * qty
        };
        
        console.log("Adding to cart:", cartItem);
        
        // Add to cart system
        if (window.cartSystem) {
          await window.cartSystem.addToCartWithDetails(cartItem);
          
          // Show button feedback
          const originalText = newAddToCartBtn.innerHTML;
          newAddToCartBtn.innerHTML = '<i data-lucide="check" width="14" height="14"></i> Added!';
          newAddToCartBtn.classList.add("added");
          newAddToCartBtn.style.background = "#4CAF50";
          newAddToCartBtn.style.color = "white";
          
          setTimeout(() => {
            newAddToCartBtn.innerHTML = originalText;
            newAddToCartBtn.classList.remove("added");
            newAddToCartBtn.style.background = "";
            newAddToCartBtn.style.color = "";
          }, 1500);
          
          showNotification(`${product.name} (${color ? color + ', ' : ''}${size ? size + ', ' : ''}Qty: ${qty}) added to cart!`, "success");
        } else {
          console.error("Cart system not found");
          showNotification("Cart system not available", "error");
        }
      });
    }

    // ---------------- HEART ICON (WISHLIST) ----------------
    const heartIconContainer = document.querySelector(".prod-like");
    if (heartIconContainer) {
      heartIconContainer.dataset.id = product.id;
      
      let heartIcon = heartIconContainer.querySelector("i");
      if (!heartIcon) {
        heartIcon = document.createElement("i");
        heartIcon.setAttribute("data-lucide", "heart");
        heartIconContainer.appendChild(heartIcon);
      }
      
      if (window.wishlistSystem) {
        const isWishlisted = window.wishlistSystem.isWishlisted(product.id);
        if (isWishlisted) {
          heartIcon.classList.add("filled");
        } else {
          heartIcon.classList.remove("filled");
        }
      }
      
      const newHeartContainer = heartIconContainer.cloneNode(true);
      heartIconContainer.parentNode.replaceChild(newHeartContainer, heartIconContainer);
      
      newHeartContainer.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pid = newHeartContainer.dataset.id;
        if (!pid) return;
        
        if (window.wishlistSystem) {
          window.wishlistSystem.toggle(pid);
          
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
          
          if (window.wishlistSystem.updateCount) {
            window.wishlistSystem.updateCount();
          }
          
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
          limit: 4,
          $autoCancel: false 
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
                  <div class="rating" data-product-id="${related.id}">
                      <!-- Will be populated by JavaScript -->
                  </div>
                </div>
              </a>
            `;
            productsGrid.appendChild(div);
          });
          
          // Add event listeners for related products
          addRelatedProductEventListeners();
        }
        await updateRelatedProductsRatings();
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

    await loadProductReviews(product.id);

  } catch (err) {
    console.error("Error loading product page:", err);
  }
});

// Load real reviews from reviews collection

async function loadProductReviews(productId) {
  const reviewsContainer = document.getElementById('product-reviews-section');
  if (!reviewsContainer) return;
  
  try {
    const reviews = await window.pb.collection("reviews").getFullList({
      filter: `productId = "${productId}" && status = "approved"`,
      sort: '-created',
      $autoCancel: false
    });
    
    // Update review count and rating in the UI
    const ratingContainer = document.querySelector(".prod-det-text .rating");
    if (ratingContainer) {
      const reviewCountSpan = ratingContainer.querySelector('span:first-child');
      if (reviewCountSpan) {
        reviewCountSpan.textContent = `(${reviews.length} Reviews)`;
      }
    }
    
    if (reviews.length === 0) {
      reviewsContainer.innerHTML = `
        <div class="no-reviews-section">
          <h3>Customer Reviews</h3>
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      `;
      return;
    }
    
    // 🔥 FETCH USER NAMES FOR ALL REVIEWS
    const userIds = [...new Set(reviews.map(r => r.userId).filter(id => id))];
    const userNames = new Map();
    
    for (const userId of userIds) {
      try {
        const user = await window.pb.collection("exclusive_users_collection").getOne(userId);
        userNames.set(userId, user.name || user.email?.split('@')[0] || 'Verified Customer');
      } catch (error) {
        userNames.set(userId, 'Verified Customer');
      }
    }
    
    // Calculate average rating
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    reviewsContainer.innerHTML = `
      <div class="reviews-section">
        <h3>Customer Reviews (${reviews.length})</h3>
        <div class="reviews-summary">
          <div class="avg-rating-large">
            <span class="avg-number">${avgRating.toFixed(1)}</span>
            <div class="stars">${generateStars(Math.round(avgRating))}</div>
            <span>Based on ${reviews.length} reviews</span>
          </div>
        </div>
        <div class="reviews-list">
          ${reviews.map(review => {
            const reviewerName = userNames.get(review.userId) || 'Verified Customer';
            return `
              <div class="review-item">
                <div class="review-header">
                  <div class="reviewer-info">
                    <strong>${escapeHtml(reviewerName)}</strong>
                    <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                  </div>
                  <div class="review-rating">${generateStars(review.rating)}</div>
                </div>
                <h4>${escapeHtml(review.title)}</h4>
                <p>${escapeHtml(review.comment)}</p>
                <div class="review-helpful">
                  <button onclick="markHelpful('${review.id}')">
                    <i class="fas fa-thumbs-up"></i> Helpful (${review.helpful || 0})
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading reviews:', error);
    reviewsContainer.innerHTML = '<div class="no-reviews-section"><p>Error loading reviews. Please try again later.</p></div>';
  }
}

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Mark review as helpful
async function markHelpful(reviewId) {
  try {
    const review = await window.pb.collection("reviews").getOne(reviewId);
    await window.pb.collection("reviews").update(reviewId, {
      helpful: (review.helpful || 0) + 1
    });
    loadProductReviews(review.productId);
  } catch (error) {
    console.error('Error marking helpful:', error);
  }
}


// Update ratings for related products with real data
async function updateRelatedProductsRatings() {
  const relatedRatings = document.querySelectorAll('.related-products-grid .rating');
  
  for (const ratingDiv of relatedRatings) {
    const productId = ratingDiv.dataset.productId;
    if (!productId) continue;
    
    try {
      const reviews = await window.pb.collection("reviews").getFullList({
        filter: `productId = "${productId}" && status = "approved"`,
        $autoCancel: false
      });
      
      const reviewCount = reviews.length;
      let avgRating = 4;
      if (reviewCount > 0) {
        avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
      }
      
      ratingDiv.innerHTML = `
        ${generateStars(Math.round(avgRating))}
        <span>(${reviewCount})</span>
      `;
    } catch (error) {
      // Fallback to default
      ratingDiv.innerHTML = `
        ${generateStars(4)}
        <span>(0)</span>
      `;
    }
  }
  
  // Re-render Lucide icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}


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


