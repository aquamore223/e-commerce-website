class CartPage {

constructor(){

this.cart = JSON.parse(localStorage.getItem("cart")) || []

this.container = document.querySelector("#cart-items")

this.render()

this.events()



document.addEventListener("click", (e)=>{

const btn = e.target.closest(".add-to-cart-btn");

if(btn){

e.preventDefault();
e.stopPropagation();

const id = btn.dataset.id;

addToCart(id);

/* BUTTON ANIMATION */

const originalText = btn.textContent;

btn.textContent = "✔ Added";
btn.classList.add("added");

setTimeout(()=>{
btn.textContent = originalText;
btn.classList.remove("added");
},1000);

}

});


}

render(){

if(!this.container) return

if(this.cart.length === 0){

this.container.innerHTML = "<p>Your cart is empty</p>"
return

}

this.container.innerHTML = this.cart.map(item => this.row(item)).join("")

this.updateTotals()

}

row(item){

const subtotal = item.price * item.qty

return `

<div class="cart-flex cart-item" data-id="${item.id}">

<div class="cart-product">

<img src="${item.img}" width="50">

<span>${item.name}</span>

<button class="remove-item">🗑</button>

</div>

<p>$${item.price}</p>

<input type="number" class="qty-input" value="${item.qty}" min="1">

<p class="subtotal">$${subtotal}</p>

</div>

`

}

updateTotals(){

const subtotal = this.cart.reduce((sum,item)=>
sum + item.price * item.qty ,0)

document.querySelector("#cart-subtotal").textContent = "$"+subtotal
document.querySelector("#cart-total").textContent = "$"+subtotal

}

events(){

document.addEventListener("change",(e)=>{

if(e.target.classList.contains("qty-input")){

const row = e.target.closest(".cart-item")

const id = row.dataset.id

const qty = Number(e.target.value)

const item = this.cart.find(p => p.id == id)

if(item){

item.qty = qty

this.save()

}

}

})

document.addEventListener("click",(e)=>{

if(e.target.classList.contains("remove-item")){

const row = e.target.closest(".cart-item")

const id = row.dataset.id

this.cart = this.cart.filter(p => p.id != id)

this.save()

}

})

}

save(){

localStorage.setItem("cart",JSON.stringify(this.cart))

this.render()


if(window.cartSystem){
cartSystem.updateCartCount()
}

}

}

new CartPage()