// Ensure DOM is loaded before accessing elements
document.addEventListener("DOMContentLoaded", () => {

  const signupForm = document.getElementById("signup-form");
  const signinForm = document.getElementById("signin-form");
  const showSignin = document.getElementById("show-signin");
  const showSignup = document.getElementById("show-signup");

  // Toggle forms
  if (showSignin) {
    showSignin.addEventListener("click", () => {
      if (signupForm) signupForm.style.display = "none";
      if (signinForm) signinForm.style.display = "flex";
    });
  }

  if (showSignup) {
    showSignup.addEventListener("click", () => {
      if (signinForm) signinForm.style.display = "none";
      if (signupForm) signupForm.style.display = "flex";
    });
  }

  // Fix password autocomplete warnings dynamically
  const passwordInputs = document.querySelectorAll("input[type='password']");
  passwordInputs.forEach((input, index) => {
    if (!input.hasAttribute("autocomplete")) {
      // If it's in signup form, use new-password
      if (signupForm && signupForm.contains(input)) {
        input.setAttribute("autocomplete", "new-password");
      } else {
        // Otherwise (signin), use current-password
        input.setAttribute("autocomplete", "current-password");
      }
    }
  });

});