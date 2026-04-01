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
        // Check if user is already logged in
        await this.checkAuthStatus();
        
        // Setup event listeners for auth forms
        this.setupAuthForms();
        
        // Wait for header to load before updating UI
        await this.waitForHeader();
        
        // Update UI based on auth status
        this.updateUI();
        
        // Setup logout handler
        this.setupLogoutHandler();
        
        // Listen for auth status changes
        document.addEventListener('authStatusChanged', () => {
            this.updateUI();
        });
        
        // Listen for header load event
        document.addEventListener('headerLoaded', () => {
            console.log("Header loaded event received, updating UI");
            this.updateUI();
        });
    }

    async waitForHeader() {
        // Check if header is already loaded
        const header = document.getElementById('header');
        if (header && header.innerHTML && !header.innerHTML.includes('loading')) {
            console.log("Header already loaded");
            return;
        }
        
        // Wait for header to be loaded
        console.log("Waiting for header to load...");
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const header = document.getElementById('header');
                if (header && header.innerHTML && !header.innerHTML.includes('loading')) {
                    clearInterval(checkInterval);
                    console.log("Header loaded");
                    resolve();
                }
            }, 100);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log("Header load timeout, proceeding anyway");
                resolve();
            }, 3000);
        });
    }

    async checkAuthStatus() {
        try {
            // Check if there's a valid auth token
            if (this.pb && this.pb.authStore.isValid) {
                // Fetch fresh user data from your custom collection with auto-cancel disabled
                const userId = this.pb.authStore.model?.id;
                if (userId) {
                    try {
                        const userRecord = await this.pb.collection(this.COLLECTION_NAME).getOne(userId, {
                            $autoCancel: false  // Prevent auto-cancellation
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
            
            // Wait for header then update UI
            await this.waitForHeader();
            this.updateUI();
            
            document.dispatchEvent(new CustomEvent('authStatusChanged', { 
                detail: { isLoggedIn: true, user: this.currentUser }
            }));
            
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
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('#logout-btn, .logout-btn, [data-logout]');
            if (logoutBtn) {
                e.preventDefault();
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
                
                const result = await this.login(email, password);
                
                if (result.success) {
                    alert("Login successful!");
                    setTimeout(() => {
                        window.location.href = "/index.html";
                    }, 500);
                } else {
                    alert("Login failed: " + result.error);
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
        console.log("Updating UI - Current user:", this.currentUser?.name || this.currentUser?.email || 'not logged in');
        
        const userIcon = document.querySelector('.user-icon');
        const loginLink = document.querySelector('.login-link');
        
        console.log("Elements found:", { 
            userIcon: !!userIcon, 
            loginLink: !!loginLink,
            page: window.location.pathname
        });
        
        if (this.currentUser) {
            if (userIcon) {
                userIcon.style.display = "block";
                userIcon.style.visibility = "visible";
                userIcon.style.opacity = "1";
                userIcon.classList.add('logged-in');
                console.log("✅ User icon shown");
            } else {
                console.warn("⚠️ User icon element not found!");
            }
            
            if (loginLink) {
                loginLink.style.display = "none";
                console.log("Login link hidden");
            }
        } else {
            if (userIcon) {
                userIcon.style.display = "none";
                userIcon.style.visibility = "hidden";
                userIcon.style.opacity = "0";
                userIcon.classList.remove('logged-in');
                console.log("User icon hidden");
            }
            
            if (loginLink) {
                loginLink.style.display = "flex";
                console.log("Login link shown");
            }
        }
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }
}

// Initialize auth system when DOM is ready
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

// Also check when page is fully loaded
window.addEventListener('load', () => {
    console.log("Window loaded");
    if (window.authSystem) {
        setTimeout(() => {
            window.authSystem.updateUI();
        }, 200);
    }
});

// Export for use in other files
window.auth = {
    login: (email, password) => window.authSystem?.login(email, password),
    signup: (name, email, password) => window.authSystem?.signup(name, email, password),
    logout: () => window.authSystem?.logout(),
    isLoggedIn: () => window.authSystem?.isLoggedIn() || false,
    getUser: () => window.authSystem?.getUser() || null
};