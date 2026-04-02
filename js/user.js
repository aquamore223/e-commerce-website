// user.js - Authentication System

// ==================== AUTHENTICATION ====================
class AuthSystem {
    constructor() {
        this.pb = window.pb;
        this.currentUser = null;
        this.COLLECTION_NAME = "exclusive_users_collection";
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
        this.setupAuthForms();
        this.updateUI();
        this.setupLogoutHandler();
        
        document.addEventListener('authStatusChanged', () => {
            this.updateUI();
        });
        
        document.addEventListener('headerLoaded', () => {
            console.log("Header loaded, updating UI");
            this.updateUI();
        });
        
        // Also update when DOM changes (for dynamically loaded content)
        const observer = new MutationObserver(() => {
            this.updateUI();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log("AuthSystem initialized");
    }

    async checkAuthStatus() {
        try {
            if (this.pb && this.pb.authStore.isValid) {
                const userId = this.pb.authStore.model?.id;
                if (userId) {
                    try {
                        const userRecord = await this.pb.collection(this.COLLECTION_NAME).getOne(userId, {
                            $autoCancel: false
                        });
                        this.currentUser = userRecord;
                        console.log("User loaded:", this.currentUser?.name || this.currentUser?.email);
                    } catch (error) {
                        console.error("Error fetching user:", error);
                        this.currentUser = null;
                    }
                } else {
                    this.currentUser = null;
                }
                return true;
            } else {
                this.currentUser = null;
                return false;
            }
        } catch (error) {
            console.error("Auth check error:", error);
            this.currentUser = null;
            return false;
        }
    }

    async signup(name, email, password) {
        try {
            const userData = {
                name: name,
                email: email,
                emailVisibility: true,
                password: password,
                passwordConfirm: password
            };
            
            console.log("Attempting signup with:", { name, email });
            
            const user = await this.pb.collection(this.COLLECTION_NAME).create(userData, {
                $autoCancel: false
            });
            console.log("User created:", user);
            
            await this.login(email, password);
            
            return { success: true, user: user };
        } catch (error) {
            console.error("Signup error:", error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const authData = await this.pb.collection(this.COLLECTION_NAME).authWithPassword(email, password, {
                $autoCancel: false
            });
            this.currentUser = authData.record;
            
            console.log("✅ Login successful for:", this.currentUser?.name || this.currentUser?.email);
            
            // IMMEDIATELY update the UI
            this.updateUI();
            
            document.dispatchEvent(new CustomEvent('authStatusChanged', { 
                detail: { isLoggedIn: true, user: this.currentUser }
            }));
            
            sessionStorage.setItem('userLoggedIn', 'true');
            sessionStorage.setItem('userName', this.currentUser?.name || this.currentUser?.email);
            
            return { success: true, user: authData.record };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            this.pb.authStore.clear();
            this.currentUser = null;
            
            sessionStorage.removeItem('userLoggedIn');
            sessionStorage.removeItem('userName');
            
            this.updateUI();
            
            document.dispatchEvent(new CustomEvent('authStatusChanged', { 
                detail: { isLoggedIn: false, user: null }
            }));
            
            window.location.href = "/index.html";
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    }

    setupLogoutHandler() {
        // Use event delegation for logout button
        document.addEventListener('click', (e) => {
            // Check for logout button by ID or class or text content
            const logoutBtn = e.target.closest('#logout-btn, .logout-btn, [data-logout]');
            if (logoutBtn) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Logout button clicked");
                this.logout();
            }
        });
    }

    setupAuthForms() {
        const signupForm = document.getElementById("signup-form-element");
        const signinForm = document.getElementById("signin-form-element");
        const signupContainer = document.getElementById("signup-form");
        const signinContainer = document.getElementById("signin-form");
        const showSignin = document.getElementById("show-signin");
        const showSignup = document.getElementById("show-signup");
        
        if (showSignin) {
            showSignin.addEventListener("click", () => {
                if (signupContainer) signupContainer.style.display = "none";
                if (signinContainer) signinContainer.style.display = "flex";
            });
        }
        
        if (showSignup) {
            showSignup.addEventListener("click", () => {
                if (signinContainer) signinContainer.style.display = "none";
                if (signupContainer) signupContainer.style.display = "flex";
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                const name = document.getElementById("signup-name")?.value;
                const email = document.getElementById("signup-email")?.value;
                const password = document.getElementById("signup-password")?.value;
                
                if (!name || !email || !password) {
                    alert("Please fill in all fields");
                    return;
                }
                
                const result = await this.signup(name, email, password);
                
                if (result.success) {
                    alert("Account created successfully!");
                    window.location.href = "/index.html";
                } else {
                    alert("Signup failed: " + result.error);
                }
            });
        }
        
        if (signinForm) {
            signinForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                const email = document.getElementById("login-email")?.value;
                const password = document.getElementById("login-password")?.value;
                
                if (!email || !password) {
                    alert("Please fill in all fields");
                    return;
                }
                
                const submitBtn = signinForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = "Logging in...";
                submitBtn.disabled = true;
                
                const result = await this.login(email, password);
                
                if (result.success) {
                    alert("Login successful!");
                    window.location.href = "/index.html";
                } else {
                    alert("Login failed: " + result.error);
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        const passwordInputs = document.querySelectorAll("input[type='password']");
        passwordInputs.forEach((input) => {
            if (!input.hasAttribute("autocomplete")) {
                if (input.id === "signup-password") {
                    input.setAttribute("autocomplete", "new-password");
                } else if (input.id === "login-password") {
                    input.setAttribute("autocomplete", "current-password");
                }
            }
        });
    }

    updateUI() {
        console.log("⚡ Updating UI - Logged in:", !!this.currentUser);
        
        const updateElements = (retries = 0) => {
            // Elements to update
            const userIcon = document.querySelector('.user-icon');
            const loginLink = document.querySelector('.login-link');
            
            // Find Sign Up link - multiple possible selectors
            let signUpLink = null;
            let signUpListItem = null;
            
            // Try different selectors to find the Sign Up link
            const possibleSelectors = [
                '.menu ul li a[href="/user/signup.html"]',
                '.menu ul li a[href*="signup"]',
                '.menu ul li a:contains("Sign Up")',
                'a[href="/user/signup.html"]',
                'a[href*="signup"]'
            ];
            
            // Try to find by href
            const allLinks = document.querySelectorAll('.menu ul li a');
            for (const link of allLinks) {
                const href = link.getAttribute('href');
                if (href && (href.includes('signup') || href.includes('signup.html'))) {
                    signUpLink = link;
                    signUpListItem = link.closest('li');
                    break;
                }
            }
            
            // Also try by text content
            if (!signUpLink) {
                const allNavLinks = document.querySelectorAll('.menu ul li');
                for (const li of allNavLinks) {
                    if (li.textContent.trim().toLowerCase() === 'sign up') {
                        signUpListItem = li;
                        signUpLink = li.querySelector('a');
                        break;
                    }
                }
            }
            
            if (userIcon || loginLink) {
                if (this.currentUser) {
                    // User is logged in
                    if (userIcon) {
                        userIcon.style.display = "block";
                        userIcon.style.visibility = "visible";
                        userIcon.style.opacity = "1";
                        userIcon.classList.add('logged-in');
                        console.log("✅ User icon shown");
                    }
                    if (loginLink) {
                        loginLink.style.display = "none";
                        console.log("Login link hidden");
                    }
                    // Hide Sign Up link in nav menu
                    if (signUpListItem) {
                        signUpListItem.style.display = "none";
                        console.log("✅ Sign Up link hidden");
                    }
                } else {
                    // User is NOT logged in
                    if (userIcon) {
                        userIcon.style.display = "none";
                        userIcon.style.visibility = "hidden";
                    }
                    if (loginLink) {
                        loginLink.style.display = "flex";
                        console.log("Login link shown");
                    }
                    // Show Sign Up link in nav menu
                    if (signUpListItem) {
                        signUpListItem.style.display = "block";
                        console.log("Sign Up link shown");
                    }
                }
            } else if (retries < 10) {
                console.log(`Elements not found, retry ${retries + 1}/10`);
                setTimeout(() => updateElements(retries + 1), 200);
            }
        };
        
        updateElements();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }
}

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing auth...");
    
    const checkPB = setInterval(() => {
        if (window.pb) {
            clearInterval(checkPB);
            console.log("PocketBase ready, creating AuthSystem");
            window.authSystem = new AuthSystem();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkPB);
        if (!window.authSystem && window.pb) {
            console.log("Creating AuthSystem (fallback)");
            window.authSystem = new AuthSystem();
        }
    }, 3000);
});

if (sessionStorage.getItem('userLoggedIn') === 'true') {
    console.log("Session storage shows user was logged in");
}

window.addEventListener('load', () => {
    console.log("Window loaded");
    if (window.authSystem) {
        setTimeout(() => {
            window.authSystem.updateUI();
        }, 200);
    }
});

window.auth = {
    login: (email, password) => window.authSystem?.login(email, password),
    signup: (name, email, password) => window.authSystem?.signup(name, email, password),
    logout: () => window.authSystem?.logout(),
    isLoggedIn: () => window.authSystem?.isLoggedIn() || false,
    getUser: () => window.authSystem?.getUser() || null
};