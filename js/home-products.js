class HomeProductsLoader {

constructor(){

document.addEventListener("DOMContentLoaded", () => {

this.loadFlashSales()
this.loadBestSelling()
this.loadOurProducts()
this.loadCategories()

})

}

/* GET PRODUCTS ARRAY */

getProducts(){

return Object.values(products)

}

/* ---------------- FLASH SALES ---------------- */

loadFlashSales(){

const container = document.querySelector(".first-product-scroll .scroller")

if(!container) return

const flashProducts = this.getProducts().filter(p => p.flashSale)

container.innerHTML = flashProducts.map(p => this.productCard(p)).join("")

this.renderIcons()

}

/* ---------------- BEST SELLING ---------------- */

loadBestSelling(){

const container = document.querySelector(".best-product-scroll .scroller")

if(!container) return

const bestProducts = this.getProducts().filter(p => p.bestSelling)

container.innerHTML = bestProducts.map(p => this.productCard(p)).join("")

this.renderIcons()

}

/* ---------------- OUR PRODUCTS ---------------- */

loadOurProducts(){

const scrollers = document.querySelectorAll(".scroller")

if(scrollers.length < 4) return

const all = this.getProducts()

scrollers[2].innerHTML = all.slice(0,3).map(p=>this.productCard(p)).join("")

scrollers[3].innerHTML = all.slice(2,5).map(p=>this.productCard(p)).join("")

this.renderIcons()

}

/* ---------------- CATEGORIES ---------------- */

loadCategories(){

const container = document.querySelector(".category-tabs")

if(!container) return

const categories = [

{ name:"Phones", icon:"smartphone"},
{ name:"Computers", icon:"monitor"},
{ name:"SmartWatch", icon:"watch"},
{ name:"Headphones", icon:"headphones"},
{ name:"Gaming", icon:"gamepad-2"},
{ name:"Cameras", icon:"camera"},
{ name:"Fashion", icon:"shirt"}

]

container.innerHTML = categories.map(cat => `

<div class="category-tab">

<i data-lucide="${cat.icon}" class="cat-icon"></i>

<p>${cat.name}</p>

</div>

`).join("")

this.renderIcons()

}

/* ---------------- PRODUCT CARD ---------------- */

productCard(product){

const oldPrice = product.oldPrice ? `$${product.oldPrice}` : ""

const tag = product.tag
? `<span class="scroll-tag">${product.tag}</span>`
: ""

return `

<div class="scroll" data-product-id="${product.id}">

<a href="product-details.html?id=${product.id}">

<div class="scroll-img-section">

<img src="${product.img}" alt="${product.name}">

${tag}

<div class="scroll-icon">

<span class="heart-tag">
<i data-lucide="heart"></i>
</span>

<span class="eye-tag">
<i data-lucide="eye"></i>
</span>

</div>

<button class="add-to-cart-btn" data-id="${product.id}">
Add To Cart
</button>

</div>

<div class="scroll-text">

<h5>${product.name}</h5>

<p class="price">

${product.price}

<span>${oldPrice}</span>

</p>

<div class="rating">

${this.stars(product.rating)}

<span>(${product.reviews})</span>

</div>

</div>

</a>

</div>

`

}

/* ---------------- STAR RATING ---------------- */

stars(rating){

let starHTML = ""

for(let i = 1; i <= 5; i++){

if(i <= rating){

starHTML += `<i data-lucide="star" class="full"></i>`

}else{

starHTML += `<i data-lucide="star" class="empty"></i>`

}

}

return starHTML

}

/* ---------------- ICON RENDER ---------------- */

renderIcons(){

if(window.lucide){
lucide.createIcons()
}

}

}

new HomeProductsLoader()