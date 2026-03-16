class WishlistPage{

constructor(){

this.wishlist = JSON.parse(localStorage.getItem("wishlist")) || []

this.container = document.querySelector("#wishlist-items")

this.render()

this.events()

}

render(){

document.querySelector("#wish-count").textContent = this.wishlist.length

if(this.wishlist.length === 0){

this.container.innerHTML = "<p>No wishlist items</p>"
return

}

this.container.innerHTML = this.wishlist.map(p=>this.card(p)).join("")

}

card(p){

return `

<div class="scroll" data-id="${p.id}">

<div class="scroll-img-section">

<img src="${p.img}">

<button class="wish-add-cart">Add To Cart</button>

<button class="wish-remove">🗑</button>

</div>

<div class="scroll-text">

<h5>${p.name}</h5>

<p>$${p.price}</p>

</div>

</div>

`

}

events(){

document.addEventListener("click",(e)=>{

if(e.target.classList.contains("wish-remove")){

const id = e.target.closest(".scroll").dataset.id

this.wishlist = this.wishlist.filter(p=>p.id!=id)

this.save()

}

if(e.target.classList.contains("wish-add-cart")){

const id = e.target.closest(".scroll").dataset.id

const item = this.wishlist.find(p=>p.id==id)

let cart = JSON.parse(localStorage.getItem("cart")) || []

const existing = cart.find(p=>p.id==id)

if(existing){

existing.qty++

}else{

cart.push({...item,qty:1})

}

localStorage.setItem("cart",JSON.stringify(cart))

}

})

document.querySelector("#move-all").addEventListener("click",()=>{

let cart = JSON.parse(localStorage.getItem("cart")) || []

this.wishlist.forEach(item=>{

cart.push({...item,qty:1})

})

localStorage.setItem("cart",JSON.stringify(cart))

this.wishlist=[]

this.save()

})

}

save(){

localStorage.setItem("wishlist",JSON.stringify(this.wishlist))

this.render()

}

}

new WishlistPage()