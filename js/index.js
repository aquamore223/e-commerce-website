function loadComponent(id, file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
        });
}

loadComponent("header", "/header.html");
loadComponent("footer", "/footer.html");

const slides = document.querySelector(".slider");
const slide = document.querySelectorAll(".slides");
const dots = document.querySelectorAll(".slider-nav-btn");

const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");

let index = 0;
let interval;

//  Move slider
function updateSlider() {
    slides.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach(dot => dot.classList.remove("active"));
    dots[index].classList.add("active");
}

//   Next
function nextSlide() {
    index = (index + 1) % slide.length;
    updateSlider();
}

//   Prev
function prevSlide() {
    index = (index - 1 + slide.length) % slide.length;
    updateSlider();
}

//   Dot click
dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
        index = i;
        updateSlider();
    });
});

// ⏭ Buttons
nextBtn.addEventListener("click", nextSlide);
prevBtn.addEventListener("click", prevSlide);

//   Auto slide
function startAutoSlide() {
    interval = setInterval(nextSlide, 3000);
}

function stopAutoSlide() {
    clearInterval(interval);
}

//   Start
startAutoSlide();

//   Pause on hover
document.querySelector(".slider").addEventListener("mouseenter", stopAutoSlide);
document.querySelector(".slider").addEventListener("mouseleave", startAutoSlide);