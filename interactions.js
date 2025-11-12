// --- GLOBAL STATE VARIABLES ---
let cart = [];
let orderHistory = {};
let currentUser = null; 

// --- DOM ELEMENTS ---
const cartCountElement = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const emptyCartMessage = document.getElementById('empty-cart');
const checkoutButton = document.getElementById('checkout-btn');
const productSearchInput = document.getElementById('productSearch');
const subNavLinks = document.querySelectorAll('.sub-nav a');
const checkoutPopup = document.getElementById('checkout-popup');
const thankYouMessage = document.getElementById('thankyou-message');
const orderIdDisplay = document.getElementById('order-id');
const paymentMethodSelect = document.getElementById('paymentMethod');
const cardDetailsDiv = document.getElementById('card-details');
const trackOrderIdInput = document.getElementById('trackOrderId');
const orderDetailsDiv = document.getElementById('orderDetails');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const storedCart = localStorage.getItem('uneclaireCart');
    if (storedCart){
        cart = JSON.parse(storedCart);
        updateCartDisplay();
    }

    attachEventListeners();
    filterProducts();
    initStarRating();
});

// SAVE CART TO LOCAL STORAGE
function saveCart(){
    localStorage.setItem('uneclaireCart', JSON.stringify(cart));
}

// =======================================================
// === EVENT LISTENERS & FILTERING =======================
// =======================================================

function attachEventListeners(){
    // CATEGORY FILTERING
    subNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            subNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            productSearchInput.value = '';
            
            filterProducts(link.dataset.category); 
        });
    });

    // SEARCH FUNCTION
    productSearchInput.addEventListener('input', () => {
        subNavLinks.forEach(l => l.classList.remove('active'));
        const allLink = document.querySelector('.sub-nav a[data-category="all"]');
        if (allLink) allLink.classList.add('active');

        filterProducts('all', productSearchInput.value.toLowerCase());
    });

    // PAYMENT METHOD CHANGE
    paymentMethodSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Card') {
            cardDetailsDiv.style.display = 'block';
        } else {
            cardDetailsDiv.style.display = 'none';
        }
    });

    // CHECKOUT SUBMISSION
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    document.querySelector('#contact form').addEventListener('submit', handleContactSubmit);
    
    // --- NEW ACCOUNT LISTENERS ---
    const loginButton = document.getElementById('loginBtn');
    const signupButton = document.getElementById('signupBtn');
    
    // Attach handlers to the new buttons
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    if (signupButton) {
        signupButton.addEventListener('click', handleSignUp);
    }
}

// PRODUCT FILTERING & SEARCH
function filterProducts(category = 'all', searchTerm = ''){
    const products = document.querySelectorAll('#products .product');
    products.forEach(product => {
        const productCategory = product.dataset.category;
        const productName = product.dataset.name ? product.dataset.name.toLowerCase() : product.querySelector('h3').textContent.toLowerCase(); 
        let isVisible = true;

        if (category !== 'all' && productCategory !== category) {
            isVisible = false;
        }

        if (searchTerm && !productName.includes(searchTerm)) {
            isVisible = false;
        }

        product.style.display = isVisible ? 'block' : 'none';
    });
}

// =======================================================
// === CART MANAGEMENT ===================================
// =======================================================

function addToCart(name, price) {
    const numericPrice = parseFloat(price);
    const existingItem = cart.find(item => item.name === name);
    
    if(existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({name, price: numericPrice, quantity: 1});
    }

    saveCart();
    updateCartDisplay();
    console.log(`${name} added to cart!`);
}

function updateCartQuantity(name, newQuantity){
    const item = cart.find(i => i.name === name);
    const quantity = parseInt(newQuantity);

    if (item && !isNaN(quantity)) {
        if (quantity <= 0) {
            removeFromCart(name);
            return;
        }
        item.quantity = quantity;
    }
    saveCart();
    updateCartDisplay();
}

function removeFromCart(name){
    cart = cart.filter(item => item.name !== name);
    saveCart();
    updateCartDisplay();
}

function updateCartDisplay() {
    let total = 0;
    let itemCount = 0;
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
        checkoutButton.style.display = 'none';
        cartTotalElement.textContent = ''; 
    } else {
        emptyCartMessage.style.display = 'none';
        checkoutButton.style.display = 'block';

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemCount += item.quantity;

            const safeName = item.name.replace(/'/g, "\\'"); 

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('cart-item');
            itemDiv.innerHTML = `
                <p><strong>${item.name}</strong> - ₱${item.price.toFixed(2)}</p>
                <div class ="cart-item-controls">
                    <button onclick="updateCartQuantity('${safeName}' , ${item.quantity - 1})">-</button>
                    <input type="number" value="${item.quantity}" min="1" 
                            onchange="updateCartQuantity('${safeName}', parseInt(this.value))" style="width: 40px; text-align: center;">
                    <button onclick="updateCartQuantity('${safeName}', ${item.quantity + 1})">+</button>
                    <button onclick="removeFromCart('${safeName}')" style="margin-left: 10px; color: red;">Remove</button>
                </div>
                <p>Subtotal: ₱${itemTotal.toFixed(2)}</p>
                <hr>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });
    }

    cartTotalElement.textContent = cart.length === 0 ? '' : `Total: ₱${total.toFixed(2)}`;
    cartCountElement.textContent = itemCount;
}

// =======================================================
// === CHECKOUT & ORDER FLOW =============================
// =======================================================

function openCheckout(){
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const checkoutItemsList = document.getElementById('checkout-items');
    const checkoutTotalDisplay = document.getElementById('checkout-total');
    let total = calculateCartTotal();

    checkoutItemsList.innerHTML = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const li = document.createElement('li');
        li.textContent = `${item.name} x ${item.quantity} (₱${itemTotal.toFixed(2)})`;
        checkoutItemsList.appendChild(li);
    });

    checkoutTotalDisplay.textContent = `₱${total.toFixed(2)}`;
    checkoutPopup.style.display = 'flex';
}

function closeCheckout() {
    checkoutPopup.style.display = 'none';
    cardDetailsDiv.style.display = 'none';
    paymentMethodSelect.value = '';
}

function handleCheckout(e){
    e.preventDefault();

    if(cart.length === 0){
        alert('Cannot checkout: Your cart is Empty.');
        return;
    }

    const orderId = generateOrderId();
    const orderTotal = calculateCartTotal();

    const orderDetails = {
        id: orderId,
        customer: document.getElementById('custName').value,
        address: document.getElementById('custAddress').value,
        items: JSON.parse(JSON.stringify(cart)), 
        total: orderTotal,
        status: 'Processing',
        payment: paymentMethodSelect.value,
        date: new Date().toLocaleDateString('en-US')
    };

    orderHistory[orderId] = orderDetails;
    console.log('Order Placed:', orderDetails);

    // Display Thank You Message
    closeCheckout();
    orderIdDisplay.textContent = orderId;
    thankYouMessage.style.display = 'flex';

    // Clear Cart
    cart = [];
    saveCart();
    updateCartDisplay();

    // Reset Form
    document.getElementById('checkout-form').reset();
}

function generateOrderId(){
    const keys = Object.keys(orderHistory);
    let lastIdNum = 0;
    keys.forEach(key => {
        const num = parseInt(key.replace('ORD', ''));
        if (num > lastIdNum) { lastIdNum = num; }
    });
    
    const newIdNum = lastIdNum + 1;
    return `ORD${newIdNum.toString().padStart(5, '0')}`;
}

function calculateCartTotal() {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}

function closeThankYou() {
    thankYouMessage.style.display = 'none';
}

// ADDRESS (GEOLOCATION)
function getLocation() {
    const custAddressInput = document.getElementById('custAddress');
    custAddressInput.value = 'Locating...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                custAddressInput.value = `📍 Coordinates: Lat ${position.coords.latitude.toFixed(4)}, Lon ${position.coords.longitude.toFixed(4)}`;
                alert('Location data retrieved. (In a real app, this would be converted to a readable address)');
            },
            (error) => {
                let message = 'Location access denied or unavailable.';
                custAddressInput.value = '';
                alert(`Location Error: ${message}`);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
        custAddressInput.value = 'Geolocation not supported.';
    }
}

// TRACK ORDER
function trackOrder() {
    const orderId = trackOrderIdInput.value.trim().toUpperCase();
    orderDetailsDiv.innerHTML = '';

    if (!orderId) {
        orderDetailsDiv.innerHTML = '<p style="color: red;">Please enter a valid Order ID.</p>';
        return;
    }

    const order = orderHistory[orderId];

    if (order) {
        let itemsList = order.items.map(item => `<li>${item.name} x ${item.quantity} (₱${(item.price * item.quantity).toFixed(2)})</li>`).join('');

        orderDetailsDiv.innerHTML = `
            <div style="border: 1px solid #e091b1; padding: 15px; border-radius: 10px; background-color: #ffe6f0; text-align: left;">
                <h4 style="color: #e091b1;">Order ID: **${order.id}**</h4>
                <p>Status: **${order.status}** 🚚</p>
                <p>Customer: ${order.customer}</p>
                <p>Address: ${order.address}</p>
                <p>Date: ${order.date}</p>
                <p>Total: **₱${order.total.toFixed(2)}**</p>
                <h5 style="margin-top: 10px; color: #b55f7e;">Items:</h5>
                <ul style="list-style-type: disc; padding-left: 20px;">
                    ${itemsList}
                </ul>
            </div>
        `;
    } else {
        orderDetailsDiv.innerHTML = `<p style="color: orange;">Order ID **${orderId}** not found. Please double-check the ID.</p>`;
    }
}

// =======================================================
// === ACCOUNT MANAGEMENT  =========================
// =======================================================

function handleLogin(e) {
    e.preventDefault(); 
    const loginBox = e.target.closest('.account-box');
    const usernameInput = loginBox.querySelector('input[type="text"]').value.trim();
    const passwordInput = loginBox.querySelector('input[type="password"]').value.trim();

    if (usernameInput === '' || passwordInput === '') {
        alert('Please enter both username and password.');
        return;
    }

    if (usernameInput === '' && passwordInput === '') {
        currentUser = { username: usernameInput, loggedIn: true, email: '@uneclaire.com' };
        alert(`Welcome back, ${usernameInput}! You are now logged in.`);
        displayAccountStatus();
    } else {
        alert('Login failed. Invalid username or password.');
    }
}

function handleSignUp(e) {
    e.preventDefault();

    const signupBox = e.target.closest('.account-box');
    const usernameInput = signupBox.querySelector('input[type="text"]').value.trim();
    const emailInput = signupBox.querySelector('input[type="email"]').value.trim();
    const passwordInput = signupBox.querySelector('input[type="password"]').value.trim();

    if (usernameInput === '' || emailInput === '' || passwordInput === '') {
        alert('Please fill out all fields for registration.');
        return;
    }

    if (passwordInput.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    currentUser = { username: usernameInput, loggedIn: true, email: emailInput };
    
    alert(`Success! Account created for ${usernameInput}. You are now logged in.`);
    displayAccountStatus();
}

function displayAccountStatus() {
    const accountSection = document.getElementById('account');
    if (currentUser && currentUser.loggedIn) {
        accountSection.innerHTML = `
            <h2>👋 Welcome, ${currentUser.username}!</h2>
            <div class="account-box" style="padding: 30px;">
                <p style="text-align: left; margin-bottom: 10px;"><strong>Status:</strong> Logged In</p>
                <p style="text-align: left; margin-bottom: 20px;"><strong>Email:</strong> ${currentUser.email || 'N/A'}</p>
                <button onclick="handleLogout()" style="background: #e26ea2;">Logout</button>
            </div>
        `;
    }
}

function handleLogout() {
    currentUser = null;
    alert('You have been logged out.');
    
    const accountSection = document.getElementById('account');
    accountSection.innerHTML = `
        <h2>Account</h2>
        <div class="account-box" id="loginBox">
            <input type="text" placeholder="Username">
            <input type="password" placeholder="Password">
            <button id="loginBtn">Login</button>
            <div class="toggle" onclick="toggleAccount()">Don't have an account? Sign Up</div>
        </div>
        <div class="account-box" id="signupBox" style="display:none;">
            <input type="text" placeholder="Username">
            <input type="email" placeholder="Email">
            <input type="password" placeholder="Password">
            <button id="signupBtn">Sign Up</button>
            <div class="toggle" onclick="toggleAccount()">Already have an account? Login</div>
        </div>
    `;
    
    const loginButton = document.getElementById('loginBtn');
    const signupButton = document.getElementById('signupBtn');
    
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    if (signupButton) {
        signupButton.addEventListener('click', handleSignUp);
    }
}

// ACCOUNT TOGGLE 
function toggleAccount() {
    const loginBox = document.getElementById('loginBox');
    const signupBox = document.getElementById('signupBox');

    if (loginBox.style.display !== 'none') {
        loginBox.style.display = 'none';
        signupBox.style.display = 'block';
    } else {
        loginBox.style.display = 'block';
        signupBox.style.display = 'none';
    }
}

// STAR RATING 
function initStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingResult = document.querySelector('.rating-result');
    let userRating = 0; 

    stars.forEach(star => {
        star.addEventListener('click', () => {
            userRating = parseInt(star.dataset.value);
            updateStars(userRating);
            updateRatingResult(userRating);
        });

        star.addEventListener('mouseover', () => {
            updateStars(parseInt(star.dataset.value), true);
        });

        star.addEventListener('mouseout', () => {
            updateStars(userRating); 
        });
    });

    function updateStars(rating, isHover = false) {
        stars.forEach(star => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= rating) {
                star.style.color = 'gold'; 
            } else {
                star.style.color = '#d7b1c4'; 
            }
        });
    }

    function updateRatingResult(rating) {
        let text = rating > 0 ? `You rated this shop ${rating} out of 5! Thank you! 🌟` : 'No rating yet';
        ratingResult.textContent = text;
    }

    updateStars(userRating);
}

// CONTACT FORM
function handleContactSubmit(e) {
    e.preventDefault(); 
    const form = e.target;
    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const message = form.querySelector('textarea').value.trim();

    if (!name || !email || !message) {
        alert('Please fill out all required fields.');
        return;
    }

    const submitButton = form.querySelector('button');

    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    submitButton.style.backgroundColor = '#b197c3';

    setTimeout(() => {
        alert(`Thank you for your message, ${name}! We will respond to ${email} shortly.`);

        form.reset();
        submitButton.textContent = 'Send Message';
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#cdb4db'; 
    }, 1500);
}