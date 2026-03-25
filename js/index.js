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

// Also try to initialize search after components load
window.addEventListener('load', () => {
    console.log("Window fully loaded");
    setTimeout(() => {
        if (document.getElementById('search-input')) {
            initSearch();
        }
    }, 500);
});