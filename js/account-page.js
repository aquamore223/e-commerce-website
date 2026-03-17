// account-page.js - fully dynamic account page with password handling

// Initialize demo user in localStorage if not exists
if (!localStorage.getItem('user')) {
  const user = {
    username: "Rimel",
    firstName: "Md",
    lastName: "Rimel",
    email: "rimel1111@gmail.com",
    address: "Kingston, 5236, United State",
    password: "123456" // default password
  };
  localStorage.setItem('user', JSON.stringify(user));
}

// Account page initialization
document.addEventListener('DOMContentLoaded', initAccountPage);

function initAccountPage() {
  loadUserInfo();
  loadAccountSections();
  setupProfileForm();
}

// Load user info (username & breadcrumb)
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  document.getElementById('acct-username').textContent = user.username || 'Guest';
  document.getElementById('disp-hd').innerHTML = `<a href="/index.html">Home</a> / <a href="#">My Account</a>`;
}

// Dynamic account sections (Manage Account, Orders, Wishlist)
function loadAccountSections() {
  const sections = [
    {
      title: "Manage My Account",
      links: [
        { name: "My Profile", href: "#" },
        { name: "Address Book", href: "#" },
        { name: "My Payment Options", href: "#" }
      ]
    },
    {
      title: "My Orders",
      links: [
        { name: "My Returns", href: "#" },
        { name: "My Cancellations", href: "#" }
      ]
    },
    {
      title: "My Wishlist",
      links: [
        { name: "My Wishlist", href: "/user/wishlist.html" }
      ]
    }
  ];

  const container = document.querySelector('.acct-fd');
  container.innerHTML = '';

  sections.forEach(section => {
    const h4 = document.createElement('h4');
    h4.textContent = section.title;
    container.appendChild(h4);

    const div = document.createElement('div');
    div.classList.add('acct-details');

    section.links.forEach(link => {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.name;
      p.appendChild(a);
      div.appendChild(p);
    });

    container.appendChild(div);
  });

  // Update wishlist count dynamically
  const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  const wishlistLink = container.querySelector('a[href="/user/wishlist.html"]');
  if (wishlistLink) wishlistLink.textContent = `My Wishlist (${wishlist.length})`;
}

// Dynamic edit profile form with password handling
function setupProfileForm() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const container = document.getElementById('profile-form-container');
  container.innerHTML = '';

  // Left and right columns
  const left = document.createElement('div');
  left.classList.add('str-flex');
  left.innerHTML = `
    <label>First Name</label>
    <input type="text" id="firstName" value="${user.firstName || ''}" required>
    <label>Email</label>
    <input type="email" id="email" value="${user.email || ''}" required>
  `;

  const right = document.createElement('div');
  right.classList.add('str-flex');
  right.innerHTML = `
    <label>Last Name</label>
    <input type="text" id="lastName" value="${user.lastName || ''}" required>
    <label>Address</label>
    <input type="text" id="address" value="${user.address || ''}" required>
  `;

  container.appendChild(left);
  container.appendChild(right);

  // Password section
  const pwDiv = document.createElement('div');
  pwDiv.classList.add('str-flex');
  pwDiv.innerHTML = `
    <label>Password Changes</label>
    <input type="password" id="currentPassword" placeholder="Current Password">
    <input type="password" id="newPassword" placeholder="New Password">
    <input type="password" id="confirmPassword" placeholder="Confirm New Password">
  `;
  container.appendChild(pwDiv);

  // Save button
  const saveBtn = document.getElementById('save-profile-btn');
  saveBtn.addEventListener('click', e => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Password validation
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        alert('Please enter your current password to change it.');
        return;
      }
      if (currentPassword !== (user.password || '')) {
        alert('Current password is incorrect!');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match!');
        return;
      }
      user.password = newPassword; // update password
    }

    // Update other fields
    user.firstName = document.getElementById('firstName').value;
    user.lastName = document.getElementById('lastName').value;
    user.email = document.getElementById('email').value;
    user.address = document.getElementById('address').value;

    // Save updated user to localStorage
    localStorage.setItem('user', JSON.stringify(user));

    alert('Profile updated successfully!');
    loadUserInfo(); // refresh displayed username

    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
  });
}