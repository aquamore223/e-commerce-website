function loadComponent(id, file) {
    return fetch(file)
        .then(res => res.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
            
            // Initialize menu functionality after component is loaded
            initializeMenu();
            
            // Initialize Lucide icons if they're being used
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        })
        .catch(error => console.error(`Error loading ${file}:`, error));
}

function initializeMenu() {
    const menuIcon = document.getElementById("menu-icon");
    const navLinks = document.getElementById("menu");
    
    if (menuIcon && navLinks) {
        // Remove any existing event listeners to prevent duplicates
        menuIcon.replaceWith(menuIcon.cloneNode(true));
        const newMenuIcon = document.getElementById("menu-icon");
        
        newMenuIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("menu clicked");
            navLinks.classList.toggle("active");
            newMenuIcon.classList.toggle("bx-x");
        });
        
        console.log("Menu initialized successfully");
    } else {
        console.log("Menu elements not found yet");
    }
}

// Load components
Promise.all([
    loadComponent("header", "/header.html"),
    loadComponent("footer", "/footer.html")
]).then(() => {
    console.log("All components loaded");
});

// Also try to initialize after a short delay in case the DOM needs time
setTimeout(initializeMenu, 500);

loadComponent("header", "/header.html");
loadComponent("footer", "/footer.html");

// ---------------------- Slider ----------------------
const slides = document.querySelector(".slider");
if (slides) {
    const slide = document.querySelectorAll(".slides");
    const dots = document.querySelectorAll(".slider-nav-btn");

    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".prev");

    let index = 0;
    let interval;

    function updateSlider() {
        slides.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach(dot => dot.classList.remove("active"));
        dots[index].classList.add("active");
    }

    function nextSlide() {
        index = (index + 1) % slide.length;
        updateSlider();
    }

    function prevSlide() {
        index = (index - 1 + slide.length) % slide.length;
        updateSlider();
    }

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            index = i;
            updateSlider();
        });
    });

    nextBtn.addEventListener("click", nextSlide);
    prevBtn.addEventListener("click", prevSlide);

    function startAutoSlide() {
        interval = setInterval(nextSlide, 3000);
    }

    function stopAutoSlide() {
        clearInterval(interval);
    }

    startAutoSlide();
    slides.addEventListener("mouseenter", stopAutoSlide);
    slides.addEventListener("mouseleave", startAutoSlide);
}