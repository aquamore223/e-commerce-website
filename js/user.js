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
        
        // Update UI based on auth status
        this.updateUI();
        
        // Setup logout handler
        this.setupLogoutHandler();
        
        // Listen for auth status changes
        document.addEventListener('authStatusChanged', () => {
            this.updateUI();
        });
    }

    async checkAuthStatus() {
        try {
            // Check if there's a valid auth token
            if (this.pb && this.pb.authStore.isValid) {
                // Fetch fresh user data from your custom collection
                const userId = this.pb.authStore.model?.id;
                if (userId) {
                    const userRecord = await this.pb.collection(this.COLLECTION_NAME).getOne(userId);
                    this.currentUser = userRecord;
                } else {
                    this.currentUser = null;
                }
                console.log("User logged in:", this.currentUser?.name || this.currentUser?.email);
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
            // Create new user in PocketBase using your custom collection
            const userData = {
                name: name,
                email: email,
                emailVisibility: true,
                password: password,
                passwordConfirm: password
            };
            
            console.log("Attempting signup with:", { name, email });
            
            const user = await this.pb.collection(this.COLLECTION_NAME).create(userData);
            console.log("User created:", user);
            
            // Auto login after signup
            await this.login(email, password);
            
            return { success: true, user: user };
        } catch (error) {
            console.error("Signup error:", error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            // Authenticate user with your custom collection
            const authData = await this.pb.collection(this.COLLECTION_NAME).authWithPassword(email, password);
            this.currentUser = authData.record;
            
            // Force UI update immediately
            this.updateUI();
            
            // Dispatch event for other components
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
            
            // Force UI update immediately
            this.updateUI();
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('authStatusChanged', { 
                detail: { isLoggedIn: false, user: null }
            }));
            
            // Redirect to home page
            window.location.href = "/index.html";
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    }

    setupLogoutHandler() {
        // Find logout button and attach event
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('#logout-btn, .logout-btn, [data-logout]');
            if (logoutBtn) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    setupAuthForms() {
        // Get form elements
        const signupForm = document.getElementById("signup-form-element");
        const signinForm = document.getElementById("signin-form-element");
        const signupContainer = document.getElementById("signup-form");
        const signinContainer = document.getElementById("signin-form");
        const showSignin = document.getElementById("show-signin");
        const showSignup = document.getElementById("show-signup");
        
        console.log("Forms found:", { 
            signupForm: !!signupForm, 
            signinForm: !!signinForm,
            signupContainer: !!signupContainer,
            signinContainer: !!signinContainer
        });
        
        // Toggle between signup and signin forms
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
        
        // Signup form submission
        if (signupForm) {
            signupForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("Signup form submitted");
                
                // Get values using IDs
                const name = document.getElementById("signup-name")?.value;
                const email = document.getElementById("signup-email")?.value;
                const password = document.getElementById("signup-password")?.value;
                
                console.log("Signup values:", { name, email, password: password ? "***" : "empty" });
                
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
        } else {
            console.error("Signup form element with id 'signup-form-element' not found!");
        }
        
        // Signin form submission
        if (signinForm) {
            signinForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("Signin form submitted");
                
                // Get values using IDs
                const email = document.getElementById("login-email")?.value;
                const password = document.getElementById("login-password")?.value;
                
                console.log("Signin values:", { email, password: password ? "***" : "empty" });
                
                if (!email || !password) {
                    alert("Please fill in all fields");
                    return;
                }
                
                const result = await this.login(email, password);
                
                if (result.success) {
                    alert("Login successful!");
                    // Don't redirect immediately, let the UI update first
                    setTimeout(() => {
                        window.location.href = "/index.html";
                    }, 500);
                } else {
                    alert("Login failed: " + result.error);
                }
            });
        } else {
            console.error("Signin form element with id 'signin-form-element' not found!");
        }
        
        // Fix password autocomplete warnings
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
        console.log("Updating UI - Current user:", this.currentUser);
        
        // Find the user icon element - using the correct selector for your header
        const userIcon = document.querySelector('.user-icon');
        const loginLink = document.querySelector('.login-link');
        
        console.log("Elements found:", { 
            userIcon: !!userIcon, 
            loginLink: !!loginLink,
            userIconDisplay: userIcon ? window.getComputedStyle(userIcon).display : 'not found',
            loginLinkDisplay: loginLink ? window.getComputedStyle(loginLink).display : 'not found'
        });
        
        if (this.currentUser) {
            // User is logged in - SHOW the user icon, HIDE login link
            if (userIcon) {
                userIcon.style.display = "block";
                userIcon.style.visibility = "visible";
                userIcon.style.opacity = "1";
                // Make sure it's visible
                userIcon.classList.add('logged-in');
            } else {
                console.warn("User icon element not found in DOM!");
            }
            
            if (loginLink) {
                loginLink.style.display = "none";
            }
            
            // Update user name in dropdown if exists
            const userNameSpan = document.querySelector('.user-name');
            if (userNameSpan && this.currentUser.name) {
                userNameSpan.textContent = this.currentUser.name;
            }
            
            console.log("UI updated: User icon shown, login link hidden");
        } else {
            // User is NOT logged in - HIDE user icon, SHOW login link
            if (userIcon) {
                userIcon.style.display = "none";
                userIcon.style.visibility = "hidden";
                userIcon.style.opacity = "0";
                userIcon.classList.remove('logged-in');
            }
            
            if (loginLink) {
                loginLink.style.display = "flex";
            }
            
            console.log("UI updated: User icon hidden, login link shown");
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
    
    // Wait for PocketBase to be ready
    const checkPB = setInterval(() => {
        if (window.pb) {
            clearInterval(checkPB);
            console.log("PocketBase ready, creating AuthSystem");
            window.authSystem = new AuthSystem();
        }
    }, 100);
    
    // Fallback after 3 seconds
    setTimeout(() => {
        clearInterval(checkPB);
        if (!window.authSystem && window.pb) {
            console.log("Creating AuthSystem (fallback)");
            window.authSystem = new AuthSystem();
        }
    }, 3000);
});

// Also check on page load for existing session
window.addEventListener('load', () => {
    if (window.authSystem) {
        window.authSystem.updateUI();
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