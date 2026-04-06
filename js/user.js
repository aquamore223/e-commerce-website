// user.js - Auth System (FIXED FORM SWITCHING + STABLE + HASH NAVIGATION)

class AuthSystem {
    constructor() {
        this.pb = window.pb;
        this.currentUser = null;
        this.COLLECTION_NAME = "exclusive_users_collection";

        this.dom = {};

        this.init();
    }

    // ==================== INIT ====================
    async init() {
        try {
            await this.waitForPocketBase();
            await this.checkAuthStatus();

            this.cacheDOM();
            this.setupAuthForms();
            this.setupFormSwitching();
            this.setupGlobalLogout();
            this.setupLoginLink(); // Handle login link click
            this.handleHashNavigation(); // Handle #login hash

            this.updateUI();

            document.addEventListener('authStatusChanged', () => this.updateUI());
            document.addEventListener('headerLoaded', () => {
                this.cacheDOM();
                this.updateUI();
            });

            console.log("✅ Auth ready");
        } catch (err) {
            console.error("Init error:", err);
        }
    }

    // ==================== WAIT PB ====================
    async waitForPocketBase(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            const check = () => {
                if (window.pb) return resolve();
                if (Date.now() - start > timeout) return reject("PB not found");
                requestAnimationFrame(check);
            };

            check();
        });
    }

    // ==================== CACHE DOM ====================
    cacheDOM() {
        this.dom.userIcon = document.querySelector('.user-icon');
        this.dom.loginLink = document.querySelector('.login-link');

        this.dom.signupContainer = document.getElementById("signup-form");
        this.dom.signinContainer = document.getElementById("signin-form");

        this.dom.signUpItem = [...document.querySelectorAll('.menu ul li')]
            .find(li =>
                li.textContent.toLowerCase().includes('sign up') ||
                li.querySelector('a')?.href.includes('signup')
            );
    }

    // ==================== HANDLE HASH NAVIGATION ====================
    handleHashNavigation() {
        // Check if coming from login link with #login hash
        if (window.location.hash === '#login') {
            this.cacheDOM();
            if (this.dom.signupContainer) this.dom.signupContainer.style.display = "none";
            if (this.dom.signinContainer) this.dom.signinContainer.style.display = "flex";
            console.log("🔁 Hash navigation: Showing SIGN IN form");
            
            // Remove the hash from URL without refreshing
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }

    // ==================== SETUP LOGIN LINK ====================
    setupLoginLink() {
        const loginLink = document.querySelector('.login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Check if we're on the signup page
                if (window.location.pathname.includes('signup.html')) {
                    // If on signup page, just switch to sign-in form
                    this.cacheDOM();
                    if (this.dom.signupContainer) this.dom.signupContainer.style.display = "none";
                    if (this.dom.signinContainer) this.dom.signinContainer.style.display = "flex";
                    console.log("🔁 Login link: Switched to SIGN IN form");
                } else {
                    // If on another page, redirect to signup page with login hash
                    window.location.href = '/user/signup.html#login';
                }
            });
        }
    }

    // ==================== ERROR FORMAT ====================
    formatError(err) {
        if (err?.data) {
            return Object.values(err.data).map(e => e.message).join(", ");
        }
        return err.message || "Something went wrong";
    }

    // ==================== AUTH CHECK ====================
    async checkAuthStatus() {
        try {
            if (this.pb?.authStore?.isValid) {
                const userId = this.pb.authStore.model?.id;

                if (userId) {
                    this.currentUser = await this.pb
                        .collection(this.COLLECTION_NAME)
                        .getOne(userId, {
                            $autoCancel: false
                        });

                    console.log("👤 Auth loaded:", this.currentUser?.email);
                }
            } else {
                this.currentUser = null;
            }
        } catch (err) {
            console.error("Auth check error:", err);

            if (this.pb?.authStore?.model) {
                this.currentUser = this.pb.authStore.model;
                console.log("⚠️ Using fallback authStore user");
            } else {
                this.currentUser = null;
            }
        }
    }

    // ==================== SIGNUP ====================
    async signup(name, email, password) {
        try {
            const user = await this.pb.collection(this.COLLECTION_NAME).create({
                name,
                email,
                emailVisibility: true,
                password,
                passwordConfirm: password
            });

            await this.login(email, password);
            return { success: true };

        } catch (err) {
            return { success: false, error: this.formatError(err) };
        }
    }
                       // redirect function
        handleRedirectAfterLogin() {
            const urlParams = new URLSearchParams(window.location.search);
            let redirectUrl = urlParams.get('redirect');
            
            if (!redirectUrl) {
                redirectUrl = sessionStorage.getItem('redirectAfterCheckout');
            }
            
            if (redirectUrl && this.isLoggedIn()) {
                sessionStorage.removeItem('redirectAfterCheckout');
                window.location.href = decodeURIComponent(redirectUrl);
                return true;
            }
            return false;
        }

  // Update your login method
    async login(email, password) {
        try {
            const auth = await this.pb.collection(this.COLLECTION_NAME)
                .authWithPassword(email, password);

            this.currentUser = auth.record;
            sessionStorage.setItem('userLoggedIn', 'true');
            this.updateUI();

            document.dispatchEvent(new CustomEvent('authStatusChanged', {
                detail: { isLoggedIn: true }
            }));

            // Handle redirect after login
            const urlParams = new URLSearchParams(window.location.search);
            let redirectUrl = urlParams.get('redirect');
            
            if (!redirectUrl) {
                redirectUrl = sessionStorage.getItem('redirectAfterCheckout');
            }
            
            if (redirectUrl) {
                sessionStorage.removeItem('redirectAfterCheckout');
                window.location.href = decodeURIComponent(redirectUrl);
            }

            return { success: true };

        } catch (err) {
            return { success: false, error: this.formatError(err) };
        }
    }

    // ==================== LOGIN ====================
    async login(email, password) {
        try {
            const auth = await this.pb.collection(this.COLLECTION_NAME)
                .authWithPassword(email, password);

            this.currentUser = auth.record;

            sessionStorage.setItem('userLoggedIn', 'true');

            this.updateUI();

            document.dispatchEvent(new CustomEvent('authStatusChanged', {
                detail: { isLoggedIn: true }
            }));

            return { success: true };

        } catch (err) {
            return { success: false, error: this.formatError(err) };
        }
    }

    // ==================== LOGOUT ====================
    logout() {
        this.pb.authStore.clear();
        this.currentUser = null;

        sessionStorage.clear();

        this.updateUI();

        document.dispatchEvent(new CustomEvent('authStatusChanged', {
            detail: { isLoggedIn: false }
        }));

        location.href = "/index.html";
    }

    // ==================== GLOBAL LOGOUT ====================
    setupGlobalLogout() {
        document.addEventListener('click', (e) => {
            const logoutEl = e.target.closest(
                '#logout-btn, .logout-btn, [data-logout]'
            );

            if (logoutEl) {
                e.preventDefault();
                e.stopPropagation();  
                this.logout();
            }
        }, true);  
    }

    // ==================== FIXED FORM SWITCHING ====================
    setupFormSwitching() {
        document.addEventListener('click', (e) => {
            const showSignin = e.target.closest('#show-signin');
            const showSignup = e.target.closest('#show-signup');

            if (showSignin) {
                e.preventDefault();
                this.cacheDOM();

                if (this.dom.signupContainer) this.dom.signupContainer.style.display = "none";
                if (this.dom.signinContainer) this.dom.signinContainer.style.display = "flex";

                console.log("🔁 Switched to SIGN IN");
            }

            if (showSignup) {
                e.preventDefault();
                this.cacheDOM();

                if (this.dom.signinContainer) this.dom.signinContainer.style.display = "none";
                if (this.dom.signupContainer) this.dom.signupContainer.style.display = "flex";

                console.log("🔁 Switched to SIGN UP");
            }
        });
    }

    // ==================== FORMS ====================
    setupAuthForms() {
        const signupForm = document.getElementById("signup-form-element");
        const signinForm = document.getElementById("signin-form-element");

        if (signupForm) {
            signupForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const name = document.getElementById("signup-name").value;
                const email = document.getElementById("signup-email").value;
                const password = document.getElementById("signup-password").value;

                const res = await this.signup(name, email, password);

                if (res.success) {
                    alert("Signup successful!");
                    location.href = "/index.html";
                } else {
                    alert(res.error);
                }
            });
        }

        if (signinForm) {
            signinForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const email = document.getElementById("login-email").value;
                const password = document.getElementById("login-password").value;

                const btn = signinForm.querySelector("button");
                btn.disabled = true;
                btn.textContent = "Logging in...";

                const res = await this.login(email, password);

                if (res.success) {
                    location.href = "/index.html";
                } else {
                    alert(res.error);
                    btn.disabled = false;
                    btn.textContent = "Login";
                }
            });
        }
    }

    // ==================== UI ====================
    updateUI() {
        this.cacheDOM();

        const { userIcon, loginLink, signUpItem } = this.dom;

        if (this.currentUser) {
            userIcon && (userIcon.style.display = "block");
            loginLink && (loginLink.style.display = "none");
            signUpItem && (signUpItem.style.display = "none");
        } else {
            userIcon && (userIcon.style.display = "none");
            loginLink && (loginLink.style.display = "flex");
            signUpItem && (signUpItem.style.display = "block");
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getUser() {
        return this.currentUser;
    }
}

    (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            const showLogin = urlParams.get('show') === 'login';
            
            // Store redirect URL for after login
            if (redirectUrl) {
                sessionStorage.setItem('redirectAfterCheckout', redirectUrl);
            }
            
            // Show login form if requested
            if (showLogin) {
                const signupDiv = document.getElementById('signup-form');
                const signinDiv = document.getElementById('signin-form');
                if (signupDiv && signinDiv) {
                    signupDiv.style.display = 'none';
                    signinDiv.style.display = 'flex';
                }
            }
        })();
// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// ==================== GLOBAL ====================
window.auth = {
    login: (email, password) => window.authSystem?.login(email, password),
    signup: (name, email, password) => window.authSystem?.signup(name, email, password),
    logout: () => window.authSystem?.logout(),
    isLoggedIn: () => window.authSystem?.isLoggedIn(),
    getUser: () => window.authSystem?.getUser()
};