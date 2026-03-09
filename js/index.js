// ---------------------- COMPONENT LOADER ----------------------

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

// target date
const targetDate = new Date("Dec 31, 2026 23:59:59").getTime();

const countdown = setInterval(() => {

    const now = new Date().getTime();

    const distance = targetDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

    const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const minutes = Math.floor(
        (distance % (1000 * 60 * 60)) / (1000 * 60)
    );

    const seconds = Math.floor(
        (distance % (1000 * 60)) / 1000
    );

    document.getElementById("days").textContent = days;
    document.getElementById("hours").textContent = hours;
    document.getElementById("minutes").textContent = minutes;
    document.getElementById("seconds").textContent = seconds;

    if (distance < 0) {
        clearInterval(countdown);
        document.querySelector(".countdown").innerHTML = "EXPIRED";
    }

}, 1000);