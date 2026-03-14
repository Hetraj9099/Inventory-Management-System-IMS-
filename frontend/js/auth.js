// Login and signup interactions for the CoreInventory auth page.
(function initAuthPage() {
  const session = window.CoreInventoryApi.getSession();
  if (session?.token) {
    window.location.href = "./dashboard.html";
    return;
  }

  const messageId = "auth-message";
  const loginForm = document.getElementById("login-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const signupForm = document.getElementById("signup-form");
  const tabButtons = document.querySelectorAll("[data-auth-tab]");
  const otpDisplay = document.getElementById("otp-display");

  function showAuthSection(section) {
    loginForm.classList.toggle("hidden", section !== "login");
    forgotPasswordForm.classList.toggle("hidden", section !== "forgot");
    signupForm.classList.toggle("hidden", section !== "signup");
    tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.authTab === section));
    document.getElementById(messageId).textContent = "";
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showAuthSection(button.dataset.authTab);
    });
  });

  document.getElementById("show-forgot-password").addEventListener("click", () => {
    showAuthSection("forgot");
  });

  document.getElementById("back-to-login").addEventListener("click", () => {
    otpDisplay.classList.add("hidden");
    otpDisplay.textContent = "";
    forgotPasswordForm.reset();
    showAuthSection("login");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = window.CoreInventoryApi.formToObject(loginForm);
      const response = await window.CoreInventoryApi.request("/auth/login", {
        method: "POST",
        auth: false,
        body: payload,
      });

      window.CoreInventoryApi.setSession({ token: response.token, user: response.user });
      window.location.href = "./dashboard.html";
    } catch (error) {
      document.getElementById(messageId).textContent = error.message;
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = window.CoreInventoryApi.formToObject(signupForm);
      const response = await window.CoreInventoryApi.request("/auth/signup", {
        method: "POST",
        auth: false,
        body: payload,
      });

      window.CoreInventoryApi.setSession({ token: response.token, user: response.user });
      window.location.href = "./dashboard.html";
    } catch (error) {
      document.getElementById(messageId).textContent = error.message;
    }
  });

  document.getElementById("request-otp-button").addEventListener("click", async () => {
    const emailField = forgotPasswordForm.elements.email;
    const email = String(emailField.value || "").trim().toLowerCase();

    if (!email) {
      document.getElementById(messageId).textContent = "Enter your email address to request an OTP.";
      emailField.focus();
      return;
    }

    try {
      const response = await window.CoreInventoryApi.request("/auth/forgot-password/request-otp", {
        method: "POST",
        auth: false,
        body: { email },
      });

      if (response.otp) {
        otpDisplay.innerHTML = `<strong>Your OTP:</strong> ${response.otp}<br><small>Valid for ${response.expires_in_minutes} minutes.</small>`;
        otpDisplay.classList.remove("hidden");
      } else {
        otpDisplay.classList.add("hidden");
        otpDisplay.textContent = "";
      }

      document.getElementById(messageId).textContent = response.message;
    } catch (error) {
      otpDisplay.classList.add("hidden");
      otpDisplay.textContent = "";
      document.getElementById(messageId).textContent = error.message;
    }
  });

  forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = window.CoreInventoryApi.formToObject(forgotPasswordForm);
      payload.email = String(payload.email || "").trim().toLowerCase();

      const response = await window.CoreInventoryApi.request("/auth/forgot-password/reset", {
        method: "POST",
        auth: false,
        body: payload,
      });

      forgotPasswordForm.reset();
      otpDisplay.classList.add("hidden");
      otpDisplay.textContent = "";
      showAuthSection("login");
      document.getElementById(messageId).textContent = response.message;
    } catch (error) {
      document.getElementById(messageId).textContent = error.message;
    }
  });
})();