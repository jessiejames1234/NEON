const authGate = document.querySelector("#auth-gate");
const menu = document.querySelector("#menu");
const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authMessage = document.querySelector("#auth-message");
const menuUsername = document.querySelector("#menu-username");
const menuRole = document.querySelector("#menu-role");
const logoutButton = document.querySelector("#logout-button");
const manageUsersButton = document.querySelector("#manage-users-button");
const leaderboardList = document.querySelector("#leaderboard-list");
const leaderboardRefresh = document.querySelector("#leaderboard-refresh");

const authState = {
  ready: false,
  user: null,
};

const VALID_ROLES = new Set(["player", "admin", "owner"]);
let sessionRequest = null;
let sessionRevalidationRequest = null;
let sessionExpiryTimer = 0;

window.neonAuth = authState;

function setAuthMessage(message = "", success = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("success", success);
}

function setAuthBusy(form, busy) {
  form.querySelectorAll("input, button").forEach((element) => {
    element.disabled = busy;
  });
}

function hideVisiblePasswords(root = document) {
  root.querySelectorAll(".password-toggle").forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.passwordTarget);
    if (input) input.type = "password";
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "Show password");
  });
}

function selectAuthTab(mode) {
  const loggingIn = mode === "login";
  loginTab.classList.toggle("active", loggingIn);
  registerTab.classList.toggle("active", !loggingIn);
  loginTab.setAttribute("aria-selected", String(loggingIn));
  registerTab.setAttribute("aria-selected", String(!loggingIn));
  loginForm.classList.toggle("hidden", !loggingIn);
  registerForm.classList.toggle("hidden", loggingIn);
  hideVisiblePasswords();
  setAuthMessage();
  window.setTimeout(() => {
    (loggingIn ? document.querySelector("#login-username") : document.querySelector("#register-username"))?.focus();
  }, 0);
}

function applyRole(role) {
  const staff = role === "admin" || role === "owner";
  document.querySelectorAll(".staff-feature").forEach((element) => {
    element.classList.toggle("hidden", !staff);
  });
  document.querySelectorAll(".owner-feature").forEach((element) => {
    element.classList.toggle("hidden", role !== "owner");
  });
}

function scheduleSessionExpiry(expiresAt) {
  window.clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = 0;
  const expiryMilliseconds = Number(expiresAt) * 1000;
  if (!Number.isFinite(expiryMilliseconds)) return;
  const delay = Math.max(0, expiryMilliseconds - Date.now());
  sessionExpiryTimer = window.setTimeout(() => {
    showAuthGate("YOUR 12-HOUR SESSION EXPIRED. SIGN IN AGAIN.");
  }, delay);
}

function showMenuForUser(user) {
  const role = VALID_ROLES.has(String(user?.role).toLowerCase()) ? String(user.role).toLowerCase() : "player";
  const safeUser = { ...user, role };
  authState.user = safeUser;
  authState.ready = true;
  menuUsername.textContent = safeUser.username;
  menuRole.textContent = role.toUpperCase();
  applyRole(role);
  scheduleSessionExpiry(safeUser.sessionExpiresAt);
  authGate.classList.add("hidden");
  menu.classList.remove("hidden");
  loadLeaderboard();
  window.dispatchEvent(new CustomEvent("neon-auth-changed", { detail: safeUser }));
}

function showAuthGate(message = "") {
  window.clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = 0;
  authState.user = null;
  authState.ready = true;
  applyRole("player");
  menu.classList.add("hidden");
  authGate.classList.remove("hidden");
  selectAuthTab("login");
  setAuthMessage(message);
  window.dispatchEvent(new CustomEvent("neon-auth-changed", { detail: null }));
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...(options.headers || {}) } : options.headers,
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = { error: "The server returned an invalid response." };
  }
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function restoreSession() {
  if (sessionRequest) return sessionRequest;
  sessionRequest = (async () => {
    try {
      const payload = await apiRequest("/api/session");
      if (payload.authenticated && payload.user) showMenuForUser(payload.user);
      else showAuthGate();
    } catch (error) {
      if (/temporarily unavailable|invalid response/i.test(error.message)) {
        showAuthGate(error.message);
      } else {
        showAuthGate();
      }
    }
  })();
  try {
    await sessionRequest;
  } finally {
    sessionRequest = null;
  }
}

async function revalidateSession() {
  if (!authState.user || document.visibilityState === "hidden") return;
  if (sessionRevalidationRequest) return sessionRevalidationRequest;

  sessionRevalidationRequest = (async () => {
    const previousUser = authState.user;
    if (!previousUser) return;

    try {
      const payload = await apiRequest("/api/session");
      if (!payload.authenticated || !payload.user) {
        showAuthGate("YOUR SESSION EXPIRED. SIGN IN AGAIN.");
        return;
      }
      const changed = payload.user.id !== previousUser.id
        || payload.user.username !== previousUser.username
        || payload.user.role !== previousUser.role;
      if (changed) showMenuForUser(payload.user);
    } catch (error) {
      if (error.status === 401) {
        showAuthGate("YOUR SESSION EXPIRED. SIGN IN AGAIN.");
        return;
      }

      // A network interruption or temporary server/database failure does not
      // invalidate the HttpOnly session cookie. Keep the current menu visible
      // and let the next scheduled check retry silently.
      console.warn("Session verification temporarily failed; keeping the current session.", error);
    }
  })();

  try {
    await sessionRevalidationRequest;
  } finally {
    sessionRevalidationRequest = null;
  }
}

async function login(username, password) {
  const payload = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  showMenuForUser(payload.user);
}

function leaderboardRow(entry, index) {
  const item = document.createElement("li");
  const rank = document.createElement("span");
  const name = document.createElement("span");
  const points = document.createElement("span");
  const wave = document.createElement("span");
  rank.className = "leaderboard-rank";
  name.className = "leaderboard-name";
  points.className = "leaderboard-points";
  wave.className = "leaderboard-wave";
  rank.textContent = String(index + 1).padStart(2, "0");
  const isCurrentUser = String(authState.user?.username || "").trim().toLowerCase() === String(entry.player_name || "").trim().toLowerCase();
  item.classList.toggle("leaderboard-current-user", isCurrentUser);
  name.textContent = entry.player_name;
  const role = String(entry.role || "player").toLowerCase();
  if (role === "admin" || role === "owner") {
    const roleBadge = document.createElement("b");
    roleBadge.className = `leaderboard-role leaderboard-role-${role}`;
    roleBadge.textContent = role.toUpperCase();
    name.append(" ", roleBadge);
  }
  if (isCurrentUser) {
    const currentUserLabel = document.createElement("em");
    currentUserLabel.className = "leaderboard-current-label";
    currentUserLabel.textContent = "(YOU)";
    name.append(" ", currentUserLabel);
  }
  points.textContent = Number(entry.score || 0).toLocaleString();
  wave.textContent = String(entry.wave || 1);
  item.append(rank, name, points, wave);
  return item;
}

async function loadLeaderboard() {
  leaderboardList.innerHTML = '<li class="leaderboard-loading">SYNCING GLOBAL RANKINGS...</li>';
  leaderboardRefresh.disabled = true;
  try {
    const payload = await apiRequest("/api/leaderboard");
    leaderboardList.replaceChildren();
    const entries = Array.isArray(payload.leaderboard) ? payload.leaderboard.slice(0, 100) : [];
    if (entries.length === 0) {
      leaderboardList.innerHTML = '<li class="leaderboard-loading">NO SCORES RECORDED YET.</li>';
      return;
    }
    entries.forEach((entry, index) => leaderboardList.append(leaderboardRow(entry, index)));
  } catch (error) {
    leaderboardList.innerHTML = `<li class="leaderboard-loading">${error.message}</li>`;
  } finally {
    leaderboardRefresh.disabled = false;
  }
}

loginTab.addEventListener("click", () => selectAuthTab("login"));
registerTab.addEventListener("click", () => selectAuthTab("register"));

function validRegistrationEmail(email) {
  if (email.length > 254) return false;
  const [local = "", domain = "", ...extra] = email.split("@");
  if (extra.length || !local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}

function validRegistrationPassword(password) {
  return password.length >= 7 && password.length <= 16 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthBusy(loginForm, true);
  setAuthMessage("VERIFYING OPERATIVE CREDENTIALS...");
  try {
    await login(
      document.querySelector("#login-username").value.trim(),
      document.querySelector("#login-password").value,
    );
    loginForm.reset();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    setAuthBusy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.querySelector("#register-username").value.trim();
  const email = document.querySelector("#register-email").value.trim();
  const password = document.querySelector("#register-password").value;
  const confirmation = document.querySelector("#register-confirm-password").value;
  if (!validRegistrationEmail(email)) {
    setAuthMessage("Enter a complete email such as name@gmail.com, name@yahoo.com, or name@phinmaed.com.");
    return;
  }
  if (password !== confirmation) {
    setAuthMessage("Passwords do not match.");
    return;
  }
  if (!validRegistrationPassword(password)) {
    setAuthMessage("Password must be 7–16 characters and contain at least 1 letter and 1 number.");
    return;
  }

  setAuthBusy(registerForm, true);
  setAuthMessage("CREATING OPERATIVE RECORD...");
  try {
    await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    registerForm.reset();
    hideVisiblePasswords(registerForm);
    setAuthMessage("ACCOUNT SUCCESSFULLY CREATED. YOU CAN LOG IN NOW.", true);
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    setAuthBusy(registerForm, false);
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await apiRequest("/api/logout", { method: "POST" });
  } catch (error) {
    console.error(error);
  } finally {
    logoutButton.disabled = false;
    showAuthGate("SESSION CLOSED.");
  }
});

leaderboardRefresh.addEventListener("click", loadLeaderboard);
window.addEventListener("neon-score-submitted", loadLeaderboard);
document.querySelectorAll(".password-toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const input = document.getElementById(toggle.dataset.passwordTarget);
    if (!input) return;
    const showing = input.type === "password";
    input.type = showing ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(showing));
    toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
    input.focus({ preventScroll: true });
    const cursor = input.value.length;
    input.setSelectionRange(cursor, cursor);
  });
});
manageUsersButton.addEventListener("click", () => {
  window.open("/management/", "_blank", "noopener,noreferrer");
});

window.addEventListener("focus", revalidateSession);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") revalidateSession();
});
window.setInterval(revalidateSession, 60_000);

restoreSession();
