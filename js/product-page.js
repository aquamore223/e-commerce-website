window.addEventListener("DOMContentLoaded", () => {
  // Get product ID from URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// Convert products object to array for easier handling
const productList = Object.values(products);

// Find the current product
const product = productList.find(p => p.id == productId);

if (!product) {
    console.error("Product not found!");
} else {

            const addBtn = document.querySelector(".add-to-cart-btn");
        if(addBtn){
            addBtn.dataset.id = productId;
        }
    const breadcrumb = document.getElementById("disp-hd");
    if (breadcrumb) {
        breadcrumb.innerHTML = `<a href="index.html">Home</a> / <a href="#">Gaming</a> / <span>${product.name}</span>`;
    }

    // ------------------ Hero Image ------------------
    const heroImg = document.querySelector(".product-hero img");
    if (heroImg) heroImg.src = product.img;

    // ------------------ Thumbnails ------------------
    const thumbContainer = document.querySelector(".product-img-wrapper-cont");
    if (thumbContainer && product.images) {
        thumbContainer.innerHTML = ""; // clear if any
        product.images.forEach((imgSrc, idx) => {
            const div = document.createElement("div");
            div.classList.add("product-img-wrapper");
            div.innerHTML = `<img src="${imgSrc}" alt="Thumbnail ${idx + 1}" class="img-scale">`;
            thumbContainer.appendChild(div);
        });

        // Add click to switch hero
        const thumbs = document.querySelectorAll(".product-img-wrapper img");
        thumbs.forEach(img => {
            img.onclick = () => heroImg.src = img.src;
        });
    }

    // ------------------ Product Info ------------------
    const prodName = document.querySelector(".prod-det-text h5");
    const prodPrice = document.getElementById("prod-price");
    const prodDesc = document.querySelector(".prod-det-text p:last-child");
    if (prodName) prodName.textContent = product.name;
    if (prodPrice) prodPrice.textContent = formatPrice(product.price);
    if (prodDesc) prodDesc.textContent = product.description;

    // ------------------ Rating ------------------
    const ratingContainer = document.querySelector(".prod-det-text .rating");
    if (ratingContainer && product.rating) {
        ratingContainer.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("i");
            star.setAttribute("data-lucide", "star");
            star.classList.add(i <= product.rating ? "full" : "empty");
            ratingContainer.appendChild(star);
        }
        // Add reviews and stock
        const reviewsSpan = document.createElement("span");
        reviewsSpan.classList.add("prod-det-avialable");
        reviewsSpan.textContent = `(${product.reviews || 0} Reviews)`;

        const stockSpan = document.createElement("span");
        stockSpan.classList.add("prod-det-avialable");
        stockSpan.textContent = product.stock ? "In Stock" : "Out of Stock";

        ratingContainer.appendChild(document.createTextNode(" | "));
        ratingContainer.appendChild(reviewsSpan);
        ratingContainer.appendChild(document.createTextNode(" | "));
        ratingContainer.appendChild(stockSpan);
    }

    // ------------------ Colors ------------------
    const colorsContainer = document.querySelector(".product-colors");
    if (colorsContainer && product.colors) {
        colorsContainer.innerHTML = "<p>Colour:</p>";
        product.colors.forEach((color, idx) => {
            const inputId = `color-${idx}`;
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "color";
            input.id = inputId;
            input.dataset.img = color.img;
            if (idx === 0) input.checked = true;

            const label = document.createElement("label");
            label.setAttribute("for", inputId);
            label.classList.add("color", color.name.toLowerCase());

            colorsContainer.appendChild(input);
            colorsContainer.appendChild(label);

            // Switch hero image on color change
            input.addEventListener("change", () => {
                heroImg.src = input.dataset.img;
            });
        });
    }

                        // wish btn //
                                                                                        const mainHeart = document.querySelector(".heart-icon");
                if (mainHeart) {
                    mainHeart.dataset.id = productId;
        }
    // ---------------------- PRODUCT IMAGE SWITCH ----------------------

const thumbs = document.querySelectorAll(".product-img-wrapper img");
const hero = document.querySelector(".product-hero img");

if (thumbs.length && hero) {
    thumbs.forEach(img => {
        img.onclick = () => {
            hero.src = img.src;
        };
    });
}


// ---------------------- PRODUCT QUANTITY ----------------------

const minus = document.querySelector(".prod-no button:first-child");
const plus = document.querySelector(".prod-no button:last-child");
const input = document.querySelector(".prod-no input");

if (plus && minus && input) {

    plus.onclick = () => {
        input.value = Number(input.value) + 1;
    };

    minus.onclick = () => {
        if (input.value > 1) {
            input.value = Number(input.value) - 1;
        }
    };
}



    // ------------------ Sizes ------------------
    const sizesContainer = document.querySelector(".sizes");
    if (sizesContainer && product.sizes) {
        sizesContainer.innerHTML = "";
        product.sizes.forEach((size, idx) => {
            const inputId = `size-${idx}`;
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "size";
            input.id = inputId;
            if (idx === 0) input.checked = true;

            const label = document.createElement("label");
            label.setAttribute("for", inputId);
            label.textContent = size;

            sizesContainer.appendChild(input);
            sizesContainer.appendChild(label);
        });
    }

    // ------------------ Related Items ------------------
    const relatedContainer = document.querySelector(".wish-grid");
    if (relatedContainer) {
        relatedContainer.innerHTML = "";
        // Show 4 other products as related
        productList.filter(p => p.id !== productId).slice(0, 4).forEach(p => {
            const div = document.createElement("div");
            div.classList.add("scroll");
           div.innerHTML = `
    <a href="product-details.html?id=${p.id}">
        <div class="scroll-img-section">
            <img src="${p.img}" alt="${p.name}">
            <span class="scroll-tag">-45%</span>
            <div class="scroll-icon">
                <span class="heart-icon" data-id="${p.id}">
                    <i data-lucide="heart" width="15" height="15"></i>
                </span>
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
        <span>${formatPrice(parseInt(p.price.replace('$','')) + 40)}</span>
        </p>
        <p class="rating">
            ${[...Array(5)].map((_,i) => `<i data-lucide="star" class="${i < (p.rating||4)?'full':'empty'}"></i>`).join('')}
        </p>
    </div>

`;

    document.addEventListener("click", e => {

  
        const heart = e.target.closest(".heart-icon");
        if (heart) {
            e.preventDefault();
            e.stopPropagation();

            const id = String(heart.dataset.id);

            wishlistSystem.toggle(id);

            const icon = heart.querySelector("i");
            if (icon) {
            icon.classList.toggle("filled", wishlistSystem.isWishlisted(id));
            }

            return;
        }

  
        const eye = e.target.closest(".eye-icon");
        if (eye) {
            e.preventDefault();
            e.stopPropagation();

            const id = String(eye.dataset.id);

            viewedSystem.markViewed(id);

            const icon = eye.querySelector("i");
            if (icon) {
            icon.classList.add("viewed");
            }

            return;
        }

    });
            relatedContainer.appendChild(div);
        });
    }

    // Re-create lucide icons after dynamic rendering
    if (typeof lucide !== "undefined") lucide.createIcons();
}
});