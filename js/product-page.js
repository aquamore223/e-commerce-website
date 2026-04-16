// ==================== REVIEW LIKE SYSTEM (WITH DATABASE STORAGE) ====================

class ReviewLikeSystem {
  constructor() {
    this.userId = null;
    this.likedReviews = [];
    this.isInitialized = false;
    
    this.init();
  }
  
  async init() {
    await this.waitForAuth();
    this.userId = this.getCurrentUserId();
    
    if (this.userId) {
      await this.loadLikesFromDatabase();
    } else {
      this.loadGuestLikes();
    }
    
    this.setupEventListeners();
    this.setupAuthListener();
    this.initializeButtons();
    
    this.isInitialized = true;
    console.log(`ReviewLikeSystem initialized for user: ${this.userId || 'guest'}`);
  }
  
  waitForAuth() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.authSystem && window.authSystem.currentUser) {
          clearInterval(check);
          resolve();
        }
      }, 100);

      // fallback after 5s
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });
  }
  
  getCurrentUserId() {
    return window.authSystem?.currentUser?.id || null;
  }
  
  loadGuestLikes() {
    const storageKey = 'guest_review_likes';
    this.likedReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
    console.log(`Loaded ${this.likedReviews.length} guest likes`);
  }
  
  saveGuestLikes() {
    const storageKey = 'guest_review_likes';
    localStorage.setItem(storageKey, JSON.stringify(this.likedReviews));
  }
  
  async loadLikesFromDatabase() {
    if (!this.userId || !window.pb) return;
    
    try {
      const likes = await window.pb.collection("user_review_likes").getFullList({
        filter: `userId = "${this.userId}"`,
        $autoCancel: false
      });
      
      this.likedReviews = likes.map(like => like.reviewId);
      console.log(`Loaded ${this.likedReviews.length} liked reviews from database`);
    } catch (error) {
      console.error('Error loading likes from database:', error);
      this.likedReviews = [];
    }
  }
  
  setupAuthListener() {
    document.addEventListener('authChanged', async () => {
      const newUserId = this.getCurrentUserId();
      
      if (newUserId && !this.userId) {
        // User logged in - merge guest likes
        console.log('User logged in, merging review likes...');
        const guestLikes = [...this.likedReviews];
        this.userId = newUserId;
        await this.loadLikesFromDatabase();
        
        // Merge guest likes with database likes
        for (const reviewId of guestLikes) {
          if (!this.likedReviews.includes(reviewId)) {
            try {
              await this.addLikeToDatabase(reviewId);
              this.likedReviews.push(reviewId);
            } catch (e) {
              console.error('Error merging like:', e);
            }
          }
        }
        
        localStorage.removeItem('guest_review_likes');
        this.initializeButtons();
        
      } else if (!newUserId && this.userId) {
        // User logged out
        console.log('User logged out, saving likes to guest storage...');
        this.saveGuestLikes();
        this.userId = null;
        this.initializeButtons();
      }
    });
  }
  
  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      const likeBtn = e.target.closest('.review-like-btn');
      if (!likeBtn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const reviewId = likeBtn.dataset.reviewId;
      if (!reviewId) return;
      
      // Check if user is logged in
      if (!this.userId && !window.authSystem?.currentUser) {
        this.showNotification('Please log in to like reviews', 'info');
        setTimeout(() => {
          window.location.href = '/user/signup.html?show=login';
        }, 1500);
        return;
      }
      
      await this.toggleLike(reviewId, likeBtn);
    });
  }
  
  async toggleLike(reviewId, buttonElement) {
    const isLiked = this.isReviewLiked(reviewId);
    
    try {
      if (isLiked) {
        // Unlike
        if (this.userId) {
          await this.removeLikeFromDatabase(reviewId);
        } else {
          this.removeGuestLike(reviewId);
        }
        this.removeLocalLike(reviewId);
        this.updateButtonUI(buttonElement, false);
        this.updateLikeCountDisplay(reviewId, -1);
        this.showNotification('Like removed', 'info');
      } else {
        // Like
        if (this.userId) {
          await this.addLikeToDatabase(reviewId);
        } else {
          this.addGuestLike(reviewId);
        }
        this.addLocalLike(reviewId);
        this.updateButtonUI(buttonElement, true);
        this.updateLikeCountDisplay(reviewId, 1);
        this.showNotification('Thanks for your feedback!', 'success');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      this.showNotification('Failed to update. Please try again.', 'error');
    }
  }
  
  addGuestLike(reviewId) {
    if (!this.likedReviews.includes(reviewId)) {
      this.likedReviews.push(reviewId);
      this.saveGuestLikes();
    }
  }
  
  removeGuestLike(reviewId) {
    const index = this.likedReviews.indexOf(reviewId);
    if (index > -1) {
      this.likedReviews.splice(index, 1);
      this.saveGuestLikes();
    }
  }
  
  addLocalLike(reviewId) {
    if (!this.likedReviews.includes(reviewId)) {
      this.likedReviews.push(reviewId);
    }
  }
  
  removeLocalLike(reviewId) {
    const index = this.likedReviews.indexOf(reviewId);
    if (index > -1) {
      this.likedReviews.splice(index, 1);
    }
  }
  
  async addLikeToDatabase(reviewId) {
    if (!window.pb) throw new Error('PocketBase not available');
    
    try {
      // Check if like already exists
      const existingLikes = await window.pb.collection("user_review_likes").getFullList({
        filter: `reviewId = "${reviewId}" && userId = "${this.userId}"`,
        $autoCancel: false
      });
      
      if (existingLikes.length > 0) {
        console.log('Like already exists');
        return;
      }
      
      // Create like record
      await window.pb.collection("user_review_likes").create({
        reviewId: reviewId,
        userId: this.userId,
        createdAt: new Date().toISOString()
      });
      
      // Update review's helpful count
      const review = await window.pb.collection("reviews").getOne(reviewId);
      await window.pb.collection("reviews").update(reviewId, {
        helpful: (review.helpful || 0) + 1
      });
      
      console.log(`Added like to database for review ${reviewId}`);
      
    } catch (error) {
      console.error('Error adding like to database:', error);
      throw error;
    }
  }
  
  async removeLikeFromDatabase(reviewId) {
    if (!window.pb) throw new Error('PocketBase not available');
    
    try {
      // Find the like record
      const likes = await window.pb.collection("user_review_likes").getFullList({
        filter: `reviewId = "${reviewId}" && userId = "${this.userId}"`,
        $autoCancel: false
      });
      
      // Delete each like record
      for (const like of likes) {
        await window.pb.collection("user_review_likes").delete(like.id);
      }
      
      // Update review's helpful count
      const review = await window.pb.collection("reviews").getOne(reviewId);
      await window.pb.collection("reviews").update(reviewId, {
        helpful: Math.max(0, (review.helpful || 0) - 1)
      });
      
      console.log(`Removed like from database for review ${reviewId}`);
      
    } catch (error) {
      console.error('Error removing like from database:', error);
      throw error;
    }
  }
  
  updateLikeCountDisplay(reviewId, delta) {
    const likeCountSpan = document.querySelector(`.review-like-btn[data-review-id="${reviewId}"] .like-count`);
    if (likeCountSpan) {
      const currentCount = parseInt(likeCountSpan.textContent) || 0;
      likeCountSpan.textContent = Math.max(0, currentCount + delta);
    }
  }
  
  isReviewLiked(reviewId) {
    return this.likedReviews.includes(reviewId);
  }
  
  updateButtonUI(button, isLiked) {
    const icon = button.querySelector('i');
    
    if (isLiked) {
      button.classList.add('liked');
      if (icon) {
        icon.classList.remove('fa-regular', 'fa-thumbs-up');
        icon.classList.add('fa-solid', 'fa-thumbs-up');
      }
      button.style.backgroundColor = '#db4444';
      button.style.borderColor = '#db4444';
      button.style.color = 'white';
    } else {
      button.classList.remove('liked');
      if (icon) {
        icon.classList.remove('fa-solid', 'fa-thumbs-up');
        icon.classList.add('fa-regular', 'fa-thumbs-up');
      }
      button.style.backgroundColor = '';
      button.style.borderColor = '';
      button.style.color = '';
    }
  }
  
  initializeButtons() {
    document.querySelectorAll('.review-like-btn').forEach(btn => {
      const reviewId = btn.dataset.reviewId;
      if (reviewId && this.isReviewLiked(reviewId)) {
        this.updateButtonUI(btn, true);
      } else {
        this.updateButtonUI(btn, false);
      }
    });
  }
  
  showNotification(message, type) {
    const existing = document.querySelector('.review-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'review-notification';
    notification.textContent = message;
    
    let bgColor = '#4CAF50';
    if (type === 'error') bgColor = '#f44336';
    if (type === 'info') bgColor = '#2196F3';
    
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${bgColor};
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
}

// Initialize the system
let reviewLikeSystem;

// Initialize after DOM is ready
 
// ==================== MAIN PAGE LOAD ====================

window.addEventListener("DOMContentLoaded", async () => {
  // Initialize review like system
  reviewLikeSystem = new ReviewLikeSystem();
  
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
        realReviewCount = product.reviews || 0;
        realAvgRating = product.rating || 4;
      }
      
      ratingContainer.innerHTML = "";
      
      const roundedRating = Math.round(realAvgRating);
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.setAttribute("data-lucide", "star");
        star.classList.add(i <= roundedRating ? "full" : "empty");
        ratingContainer.appendChild(star);
      }
      
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

    // ---------------- ADD TO CART BUTTON WITH REDIRECT OPTION ----------------
    const addToCartBtn = document.querySelector(".add-to-cart-btn");
    if (addToCartBtn) {
      const newAddToCartBtn = addToCartBtn.cloneNode(true);
      addToCartBtn.parentNode.replaceChild(newAddToCartBtn, addToCartBtn);
      
      newAddToCartBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        newAddToCartBtn.disabled = true;
        
        const selectedColorElem = document.querySelector('input[name="color"]:checked');
        const selectedSizeElem = document.querySelector('input[name="size"]:checked');
        
        const color = selectedColorElem ? selectedColorElem.value : null;
        const size = selectedSizeElem ? selectedSizeElem.value : null;
        const qty = parseInt(document.querySelector(".prod-no input")?.value) || 1;
        
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
        
        if (window.cartSystem) {
          try {
            await window.cartSystem.addToCartWithDetails(cartItem);
            
            const originalText = newAddToCartBtn.innerHTML;
            newAddToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
            newAddToCartBtn.classList.add("added");
            newAddToCartBtn.style.background = "#4CAF50";
            newAddToCartBtn.style.color = "white";
            
            // Show notification with option to go to cart
            const notification = document.createElement('div');
            notification.innerHTML = `
              <div style="display: flex; align-items: center; gap: 15px;">
                <span>✓ Added to cart!</span>
                <button id="goToCartBtn" style="background: white; color: #db4444; border: none; padding: 5px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">View Cart</button>
                <button id="continueShoppingBtn" style="background: transparent; color: white; border: 1px solid white; padding: 5px 12px; border-radius: 5px; cursor: pointer;">Continue</button>
              </div>
            `;
            notification.style.cssText = `
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: #4CAF50;
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
            
            const goToCartBtn = notification.querySelector('#goToCartBtn');
            const continueBtn = notification.querySelector('#continueShoppingBtn');
            
            if (goToCartBtn) {
              goToCartBtn.addEventListener('click', () => {
                window.location.href = "/order&payment/cart.html";
              });
            }
            
            if (continueBtn) {
              continueBtn.addEventListener('click', () => {
                notification.remove();
              });
            }
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
              }
            }, 5000);
            
            setTimeout(() => {
              newAddToCartBtn.disabled = false;
              newAddToCartBtn.innerHTML = originalText;
              newAddToCartBtn.classList.remove("added");
              newAddToCartBtn.style.background = "";
              newAddToCartBtn.style.color = "";
            }, 2000);
            
          } catch (error) {
            console.error("Error adding to cart:", error);
            newAddToCartBtn.disabled = false;
            showNotification("Failed to add to cart. Please try again.", "error");
          }
        } else {
          newAddToCartBtn.disabled = false;
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
          heartIcon.style.fill = "#ff4444";
          heartIcon.style.color = "#ff4444";
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
              icon.style.fill = "#ff4444";
              icon.style.color = "#ff4444";
              showNotification("Added to wishlist", "success");
            } else {
              icon.classList.remove("filled");
              icon.style.fill = "";
              icon.style.color = "";
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
                    <i data-lucide="heart" class="${isWishlisted ? 'filled' : ''}" ${isWishlisted ? 'style="fill:#ff4444;color:#ff4444;"' : ''}></i>
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
                  <div class="rating" data-product-id="${related.id}"></div>
                </div>
              </a>
            `;
            productsGrid.appendChild(div);
          });
          
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

// ==================== LOAD PRODUCT REVIEWS ====================

async function loadProductReviews(productId, sortBy = 'recent', limit = 5) {
  const reviewsContainer = document.getElementById('product-reviews-section');
  if (!reviewsContainer) return;
  
  try {
    // Get all approved reviews for this product
    let reviews = await window.pb.collection("reviews").getFullList({
      filter: `productId = "${productId}" && status = "approved"`,
      $autoCancel: false
    });
    
    // Update review count in rating container
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
    
    // ========== SORT REVIEWS ==========
    if (sortBy === 'recent') {
      // Sort by most recent first
      reviews.sort((a, b) => new Date(b.created || b.date) - new Date(a.created || a.date));
    } else if (sortBy === 'helpful') {
      // Sort by most helpful (highest likes) first
      reviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
    } else if (sortBy === 'rating_high') {
      // Sort by highest rating first
      reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'rating_low') {
      // Sort by lowest rating first
      reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }
    
    // ========== LIMIT REVIEWS ==========
    const totalReviews = reviews.length;
    const displayedReviews = reviews.slice(0, limit);
    const hasMoreReviews = totalReviews > limit;
    
    // Fetch user names for displayed reviews only
    const userIds = [...new Set(displayedReviews.map(r => r.userId).filter(id => id))];
    const userNames = new Map();
    
    for (const userId of userIds) {
      try {
        const user = await window.pb.collection("exclusive_users_collection").getOne(userId);
        userNames.set(userId, user.name || user.email?.split('@')[0] || 'Verified Customer');
      } catch (error) {
        userNames.set(userId, 'Verified Customer');
      }
    }
    
    // Calculate average rating from all reviews
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    // Create sort options HTML
    const sortOptions = `
      <div class="reviews-sort">
        <label>Sort by:</label>
        <select id="reviewSortSelect" class="sort-select">
          <option value="recent" ${sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
          <option value="helpful" ${sortBy === 'helpful' ? 'selected' : ''}>Most Helpful</option>
          <option value="rating_high" ${sortBy === 'rating_high' ? 'selected' : ''}>Highest Rating</option>
          <option value="rating_low" ${sortBy === 'rating_low' ? 'selected' : ''}>Lowest Rating</option>
        </select>
      </div>
    `;
    
    // Render reviews
    reviewsContainer.innerHTML = `
      <div class="reviews-section">
        <div class="reviews-header">
          <h3>Customer Reviews (${reviews.length})</h3>
          ${sortOptions}
        </div>
        <div class="reviews-summary">
          <div class="avg-rating-large">
            <span class="avg-number">${avgRating.toFixed(1)}</span>
            <div class="stars">${generateStars(Math.round(avgRating))}</div>
            <span>Based on ${reviews.length} reviews</span>
          </div>
        </div>
        <div class="reviews-list" id="reviewsList">
          ${displayedReviews.map(review => {
            const reviewerName = userNames.get(review.userId) || 'Verified Customer';
            const isLiked = reviewLikeSystem ? reviewLikeSystem.isReviewLiked(review.id) : false;
            return `
              <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                  <div class="reviewer-info">
                    <strong>${escapeHtml(reviewerName)}</strong>
                    <span class="review-date">${new Date(review.created || review.date).toLocaleDateString()}</span>
                  </div>
                  <div class="review-rating">${generateStars(review.rating)}</div>
                </div>
                <h4>${escapeHtml(review.title)}</h4>
                <p>${escapeHtml(review.comment)}</p>
                <div class="review-helpful">
                  <button class="review-like-btn ${isLiked ? 'liked' : ''}" data-review-id="${review.id}">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
                    <span class="like-count">${review.helpful || 0}</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${hasMoreReviews ? `
          <div class="view-more-reviews">
            <button id="viewMoreReviewsBtn" class="view-more-btn">View All ${totalReviews} Reviews</button>
          </div>
        ` : ''}
      </div>
    `;
    
    // Add sort event listener
    const sortSelect = document.getElementById('reviewSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        loadProductReviews(productId, e.target.value, limit);
      });
    }
    
    // Add view more button event listener
    const viewMoreBtn = document.getElementById('viewMoreReviewsBtn');
    if (viewMoreBtn) {
      viewMoreBtn.addEventListener('click', () => {
        loadProductReviews(productId, sortBy, totalReviews); // Load all reviews
      });
    }
    
    // Initialize like buttons after rendering
    if (reviewLikeSystem) {
      setTimeout(() => {
        reviewLikeSystem.initializeButtons();
      }, 100);
    }
    
    // Re-render Lucide icons for stars
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
    
  } catch (error) {
    console.error('Error loading reviews:', error);
    reviewsContainer.innerHTML = '<div class="no-reviews-section"><p>Error loading reviews. Please try again later.</p></div>';
  }
}

// ==================== HELPER FUNCTIONS ====================

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function showNotification(message, type) {
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
      ratingDiv.innerHTML = `
        ${generateStars(4)}
        <span>(0)</span>
      `;
    }
  }
  
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function addRelatedProductEventListeners() {
  document.querySelectorAll(".related-products-grid .heart-icon").forEach(heart => {
    heart.removeEventListener("click", handleRelatedHeartClick);
    heart.addEventListener("click", handleRelatedHeartClick);
  });
  
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
    
    const icon = heart.querySelector("i");
    if (icon) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
        icon.style.fill = "#ff4444";
        icon.style.color = "#ff4444";
        showNotification("Added to wishlist", "success");
      } else {
        icon.classList.remove("filled");
        icon.style.fill = "";
        icon.style.color = "";
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
}

function handleRelatedEyeClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const eye = e.currentTarget;
  const productId = eye.dataset.id;
  if (!productId) return;
  
  if (window.viewedSystem) {
    window.viewedSystem.markViewed(productId);
    
    const icon = eye.querySelector("i");
    if (icon) {
      icon.classList.add("viewed");
    }
    
    document.dispatchEvent(new CustomEvent('viewedUpdated', { 
      detail: window.viewedSystem.items 
    }));
  }
}

// Event listeners for updates
document.addEventListener('wishlistUpdated', () => {
  const heartContainer = document.querySelector(".prod-like");
  if (heartContainer && window.wishlistSystem) {
    const productId = heartContainer.dataset.id;
    const icon = heartContainer.querySelector("i");
    if (productId && icon) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
        icon.style.fill = "#ff4444";
        icon.style.color = "#ff4444";
      } else {
        icon.classList.remove("filled");
        icon.style.fill = "";
        icon.style.color = "";
      }
    }
  }
  
  document.querySelectorAll(".related-products-grid .heart-icon").forEach(heart => {
    const productId = heart.dataset.id;
    const icon = heart.querySelector("i");
    if (icon && window.wishlistSystem) {
      if (window.wishlistSystem.isWishlisted(productId)) {
        icon.classList.add("filled");
        icon.style.fill = "#ff4444";
        icon.style.color = "#ff4444";
      } else {
        icon.classList.remove("filled");
        icon.style.fill = "";
        icon.style.color = "";
      }
    }
  });
});

document.addEventListener('viewedUpdated', () => {
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

// ==================== FORMAT FUNCTIONS ====================

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
    if (i <= rating) {
      stars += `<i data-lucide="star" class="full" style="fill: #ffad33; color: #ffad33;"></i>`;
    } else {
      stars += `<i data-lucide="star" class="empty" style="fill: none; color: #ddd;"></i>`;
    }
  }
  return stars;
}