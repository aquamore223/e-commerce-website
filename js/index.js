const pb = new PocketBase("https://itrain.services.hodessy.com");
window.pb = pb;

function getBasePath() {
    const path = window.location.pathname;
    const depth = path.split("/").length - 2;

    let base = "";
    for (let i = 0; i < depth; i++) {
        base += "../";
    }

    return base;
}

function loadComponent(id, file) {
    const base = getBasePath();

    return fetch(base + file)
        .then(res => {
            if (!res.ok) throw new Error(`${file} not found`);
            return res.text();
        })
        .then(data => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = data;

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }
        })
        .catch(error => console.error(`Error loading ${file}:`, error));
}

Promise.all([
    loadComponent("header", "../header.html"),
    loadComponent("footer", "../footer.html")
]).then(() => {
    initializeMenu();
    setActiveNav();
    initiUser();
    initSearch(); // Initialize search after components load
});

// ---------------------- MENU ----------------------

function initializeMenu() {
    const menuIcon = document.getElementById("menu-icon");
    const navLinks = document.getElementById("menu");

    if (!menuIcon || !navLinks) return;

    menuIcon.onclick = (e) => {
        e.preventDefault();
        navLinks.classList.toggle("active");
        menuIcon.classList.toggle("bx-x");
    };
}

function initiUser() {
    const userIcon = document.querySelector('.user-icon');
    if (!userIcon) return;

    const dropdown = userIcon.querySelector('ul');
    if (!dropdown) return;

    userIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!userIcon.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// ---------------------- ACTIVE NAV ----------------------

function setActiveNav() {
    const navLinks = document.querySelectorAll(".nav a");
    const currentPage = window.location.pathname.split("/").pop();

    navLinks.forEach(link => {
        const linkPage = link.getAttribute("href").split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });
}

// ---------------------- SLIDER ----------------------

const slider = document.querySelector(".slider");

if (slider) {
    const slides = document.querySelectorAll(".slides");
    const dots = document.querySelectorAll(".slider-nav-btn");
    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".prev");

    let index = 0;
    let interval;

    function updateSlider() {
        slider.style.transform = `translateX(-${index * 100}%)`;

        dots.forEach(dot => dot.classList.remove("active"));
        if (dots[index]) dots[index].classList.add("active");
    }

    function nextSlide() {
        index = (index + 1) % slides.length;
        updateSlider();
    }

    function prevSlide() {
        index = (index - 1 + slides.length) % slides.length;
        updateSlider();
    }

    dots.forEach((dot, i) => {
        dot.onclick = () => {
            index = i;
            updateSlider();
        };
    });

    if (nextBtn) nextBtn.onclick = nextSlide;
    if (prevBtn) prevBtn.onclick = prevSlide;

    function startAutoSlide() {
        interval = setInterval(nextSlide, 3000);
    }

    function stopAutoSlide() {
        clearInterval(interval);
    }

    startAutoSlide();

    slider.addEventListener("mouseenter", stopAutoSlide);
    slider.addEventListener("mouseleave", startAutoSlide);
}

// ---------------------- COUNTDOWN TIMER ----------------------

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

if (daysEl && hoursEl && minutesEl && secondsEl) {
    const targetDate = new Date("Dec 31, 2026 23:59:59").getTime();

    const countdown = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = days;
        hoursEl.textContent = hours;
        minutesEl.textContent = minutes;
        secondsEl.textContent = seconds;

        if (distance < 0) {
            clearInterval(countdown);
        }
    }, 1000);
}

// ---------------------- HERO 2 COUNTDOWN ----------------------

function hero2Countdown() {
    const daysEl = document.getElementById("hdays");
    const hoursEl = document.getElementById("hhours");
    const minutesEl = document.getElementById("hminutes");
    const secondsEl = document.getElementById("hseconds");

    if (!daysEl) return;

    let totalSeconds = (Number(daysEl.textContent) * 86400) +
        (Number(hoursEl.textContent) * 3600) +
        (Number(minutesEl.textContent) * 60) +
        Number(secondsEl.textContent);

    setInterval(() => {
        if (totalSeconds <= 0) return;

        totalSeconds--;

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        daysEl.textContent = String(days).padStart(2, "0");
        hoursEl.textContent = String(hours).padStart(2, "0");
        minutesEl.textContent = String(minutes).padStart(2, "0");
        secondsEl.textContent = String(seconds).padStart(2, "0");
    }, 1000);
}

hero2Countdown();

// ==================== SEARCH FUNCTIONALITY ====================

let searchCache = [];

async function getProductsForSearch() {
    if (window.allProducts && window.allProducts.length > 0) {
        return window.allProducts;
    }

    if (searchCache.length > 0) return searchCache;

    try {
        const data = await window.pb.collection("exclusive_ecommerce").getFullList();

        searchCache = data.map(p => ({
            id: p.id,
            name: p.name || "Product",
            price: p.price || 0,
            category: p.category || "",
            img: p.image
                ? (Array.isArray(p.image)
                    ? window.pb.files.getURL(p, p.image[0])
                    : window.pb.files.getURL(p, p.image))
                : "/images/placeholder.jpg"
        }));

        return searchCache;
    } catch (err) {
        console.error("Search fetch error:", err);
        return [];
    }
}

function initSearch() {
    const input = document.getElementById("search-input");
    if (!input) return;

    let dropdown = document.createElement("div");
    dropdown.className = "search-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.background = "#fff";
    dropdown.style.width = "100%";
    dropdown.style.top = "100%";
    dropdown.style.left = "0";
    dropdown.style.zIndex = "999";
    dropdown.style.display = "none";

    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(dropdown);

    input.addEventListener("input", async () => {
        const term = input.value.toLowerCase();

        if (!term) {
            dropdown.style.display = "none";
            return;
        }

        const products = await getProductsForSearch();

        const results = products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        );

        dropdown.innerHTML = results.map(p => `
            <a href="product-details.html?id=${p.id}" style="display:flex; gap:10px; padding:10px;">
                <img src="${p.img}" style="width:40px;height:40px;">
                <div>
                    <p>${p.name}</p>
                    <span>$${p.price}</span>
                </div>
            </a>
        `).join("");

        dropdown.style.display = "block";
    });

    document.addEventListener("click", (e) => {
        if (!input.parentNode.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

// Run search AFTER everything loads
window.addEventListener("load", () => {
    setTimeout(() => {
        initSearch();
    }, 500);
});


// ==================== LOAD CATEGORY LINKS ====================
async function loadCategoryLinks() {
    try {
        // Fetch all products from PocketBase
        const products = await window.pb.collection("exclusive_ecommerce").getFullList();
        
        // Get unique categories
        const uniqueCategories = [...new Set(products.map(p => p.category).filter(c => c))];
        
        // Define category display names and their corresponding filter values
        const categoryMap = [
            { display: "Woman's Fashion", filter: "Fashion" },
            { display: "Men's Fashion", filter: "Fashion" },
            { display: "Electronics", filter: "Electronics" },
            { display: "Home & Lifestyle", filter: "Home & Lifestyle" },
            { display: "Medicine", filter: "Medicine" },
            { display: "Sports & Outdoor", filter: "Sports & Outdoor" },
            { display: "Baby's & Toys", filter: "Baby's & Toys" },
            { display: "Groceries & Pets", filter: "Groceries & Pets" },
            { display: "Health & Beauty", filter: "Health & Beauty" }
        ];
        
        const container = document.querySelector(".exclusive-text ul");
        if (!container) return;
        
        container.innerHTML = categoryMap.map(cat => `
            <li>
                <a href="product-category.html?category=${encodeURIComponent(cat.filter)}">${cat.display}</a>
                ${cat.display.includes("Fashion") ? `<i data-lucide="chevron-right" class="chev-icon"></i>` : ''}
            </li>
        `).join("");
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error("Error loading categories:", error);
        
        // Fallback static categories if PocketBase fails
        loadStaticCategoryLinks();
    }
}

function loadStaticCategoryLinks() {
    const categories = [
        { display: "Woman's Fashion", filter: "Fashion", hasIcon: true },
        { display: "Men's Fashion", filter: "Fashion", hasIcon: true },
        { display: "Electronics", filter: "Electronics", hasIcon: false },
        { display: "Home & Lifestyle", filter: "Home & Lifestyle", hasIcon: false },
        { display: "Medicine", filter: "Medicine", hasIcon: false },
        { display: "Sports & Outdoor", filter: "Sports & Outdoor", hasIcon: false },
        { display: "Baby's & Toys", filter: "Baby's & Toys", hasIcon: false },
        { display: "Groceries & Pets", filter: "Groceries & Pets", hasIcon: false },
        { display: "Health & Beauty", filter: "Health & Beauty", hasIcon: false }
    ];
    
    const container = document.querySelector(".exclusive-text ul");
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <li>
            <a href="product-category.html?category=${encodeURIComponent(cat.filter)}">${cat.display}</a>
            ${cat.hasIcon ? `<i data-lucide="chevron-right" class="chev-icon"></i>` : ''}
        </li>
    `).join("");
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Call this function when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for PocketBase to be available
    const checkPB = setInterval(() => {
        if (window.pb) {
            clearInterval(checkPB);
            loadCategoryLinks();
        }
    }, 100);
    
    // Fallback after 3 seconds
    setTimeout(() => {
        clearInterval(checkPB);
        if (!window.pb) {
            loadStaticCategoryLinks();
        }
    }, 3000);
});

// ==================== DYNAMIC SLIDER ====================

class DynamicSlider {
    constructor() {
        this.slides = [];
        this.currentIndex = 0;
        this.autoPlayInterval = null;
        this.autoPlayDelay = 5000; // 5 seconds
        
        this.sliderContainer = document.querySelector('.slider');
        this.sliderNav = document.querySelector('.slider-nav');
        this.prevBtn = document.querySelector('.prev');
        this.nextBtn = document.querySelector('.next');
        
        this.init();
    }
    
    async init() {
        await this.loadSlides();
        if (this.slides.length > 0) {
            this.renderSlides();
            this.setupEventListeners();
            this.startAutoPlay();
        }
    }
    
    async loadSlides() {
        try {
            // Fetch slides from PocketBase
            const result = await window.pb.collection("slider_slides").getFullList({
                sort: 'order',
                filter: 'active = true'
            });
            
            this.slides = result.map(slide => this.formatSlide(slide));
            console.log(`Loaded ${this.slides.length} slides`);
            
        } catch (error) {
            console.error("Error loading slides:", error);
            // Fallback to default slides if no data in PocketBase
            this.loadDefaultSlides();
        }
    }
    
    formatSlide(slide) {
        // Get image URLs
        let imageUrl = '/images/placeholder.jpg';
        let logoUrl = '';
        
        if (slide.image) {
            if (typeof slide.image === 'string') {
                if (slide.image.startsWith('http')) {
                    imageUrl = slide.image;
                } else {
                    imageUrl = window.pb.files.getURL(slide, slide.image);
                }
            }
        }
        
        if (slide.logo) {
            if (typeof slide.logo === 'string') {
                if (slide.logo.startsWith('http')) {
                    logoUrl = slide.logo;
                } else {
                    logoUrl = window.pb.files.getURL(slide, slide.logo);
                }
            }
        }
        
        return {
            id: slide.id,
            title: slide.title || "Product Title",
            subtitle: slide.subtitle || "",
            description: slide.description || "",
            image: imageUrl,
            logo: logoUrl,
            buttonText: slide.button_text || "Shop Now",
            buttonLink: slide.button_link || "#",
            order: slide.order || 0,
            bgColor: slide.bg_color || "#000"
        };
    }
    
    loadDefaultSlides() {
        // Fallback default slides
        this.slides = [
            {
                id: '1',
                title: 'iPhone 14 Series',
                subtitle: 'Up to 10% off Voucher',
                image: 'images/slider-pic1.jpg',
                logo: 'images/1200px-Apple_gray_logo 1.png',
                buttonText: 'Shop Now',
                buttonLink: '#'
            },
            {
                id: '2',
                title: 'iPhone 14 Series',
                subtitle: 'Up to 10% off Voucher',
                image: 'images/slider-pic2.webp',
                logo: 'images/1200px-Apple_gray_logo 1.png',
                buttonText: 'Shop Now',
                buttonLink: '#'
            },
            {
                id: '3',
                title: 'iPhone 14 Series',
                subtitle: 'Up to 10% off Voucher',
                image: 'images/New-Mercedes-Benz-Gtr-Licensed-Ride-on-Car-Kids-Electric-Toy-Car 1.png',
                logo: 'images/1200px-Apple_gray_logo 1.png',
                buttonText: 'Shop Now',
                buttonLink: '#'
            }
        ];
    }
    
    renderSlides() {
        if (!this.sliderContainer) return;
        
        // Clear existing slides
        this.sliderContainer.innerHTML = '';
        
        // Render each slide
        this.slides.forEach((slide, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `slides ${index === this.currentIndex ? 'active' : ''}`;
            slideDiv.id = `slide${slide.id}`;
            
            slideDiv.innerHTML = `
                <div class="overlay">
                    <div class="bg-overlay">
                        ${slide.logo ? `<img src="${slide.logo}" alt="Logo" class="top-img">` : ''}
                        ${slide.title}
                    </div>
                    <h1>${slide.subtitle}</h1>
                    ${slide.description ? `<p>${slide.description}</p>` : ''}
                    <a href="${slide.buttonLink}" class="SN">${slide.buttonText} <i data-lucide="arrow-right"></i></a>
                </div>
                <div class="bg-div">
                    <img src="${slide.image}" alt="${slide.title}" class="bg-image">
                </div>
            `;
            
            this.sliderContainer.appendChild(slideDiv);
        });
        
        // Render navigation dots
        this.renderNavigationDots();
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    renderNavigationDots() {
        if (!this.sliderNav) return;
        
        this.sliderNav.innerHTML = '';
        
        this.slides.forEach((slide, index) => {
            const dot = document.createElement('a');
            dot.href = `#slide${slide.id}`;
            dot.className = `slider-nav-btn ${index === this.currentIndex ? 'active' : ''}`;
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToSlide(index);
            });
            this.sliderNav.appendChild(dot);
        });
    }
    
    goToSlide(index) {
        if (index === this.currentIndex) return;
        if (index < 0) index = this.slides.length - 1;
        if (index >= this.slides.length) index = 0;
        
        this.currentIndex = index;
        this.updateSlider();
    }
    
    nextSlide() {
        this.goToSlide(this.currentIndex + 1);
    }
    
    prevSlide() {
        this.goToSlide(this.currentIndex - 1);
    }
    
    updateSlider() {
        // Update slide visibility
        const slides = document.querySelectorAll('.slides');
        slides.forEach((slide, index) => {
            if (index === this.currentIndex) {
                slide.classList.add('active');
                slide.style.display = 'flex';
            } else {
                slide.classList.remove('active');
                slide.style.display = 'none';
            }
        });
        
        // Update navigation dots
        const dots = document.querySelectorAll('.slider-nav-btn');
        dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // Reset auto-play timer
        this.resetAutoPlay();
    }
    
    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                this.prevSlide();
                this.resetAutoPlay();
            });
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                this.nextSlide();
                this.resetAutoPlay();
            });
        }
        
        // Pause auto-play on hover
        const sliderWrapper = document.querySelector('.slide-wrapper');
        if (sliderWrapper) {
            sliderWrapper.addEventListener('mouseenter', () => this.stopAutoPlay());
            sliderWrapper.addEventListener('mouseleave', () => this.startAutoPlay());
        }
    }
    
    startAutoPlay() {
        if (this.autoPlayInterval) return;
        this.autoPlayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoPlayDelay);
    }
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    resetAutoPlay() {
        this.stopAutoPlay();
        this.startAutoPlay();
    }
}

// Initialize slider when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for PocketBase to be available
    const checkPB = setInterval(() => {
        if (window.pb) {
            clearInterval(checkPB);
            window.dynamicSlider = new DynamicSlider();
        }
    }, 100);
});

// Also try to initialize search after components load
window.addEventListener('load', () => {
    console.log("Window fully loaded");
    setTimeout(() => {
        if (document.getElementById('search-input')) {
            initSearch();
        }
    }, 500);
});