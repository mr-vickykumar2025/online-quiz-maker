const usersKey = "oqm_users";
const sessionKey = "oqm_session";

const card = document.querySelector(".auth-card");
const mode = card?.dataset.mode;
const form = document.getElementById("authForm");
const statusEl = document.getElementById("authStatus");

function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type ? `auth-status ${type}` : "auth-status";
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const users = readLocal(usersKey, []);
  const existingUser = users.find(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );

  if (mode === "signup") {
    if (existingUser) {
      setStatus("Username already exists.", "error");
      return;
    }

    users.push({ username, password });
    writeLocal(usersKey, users);
    setStatus("Account created. Redirecting to login...", "success");
    setTimeout(() => {
      location.href = "login.html";
    }, 900);
    form.reset();
    return;
  }

  if (mode === "login") {
    if (!existingUser || existingUser.password !== password) {
      setStatus("Invalid username or password.", "error");
      return;
    }

    writeLocal(sessionKey, existingUser.username);
    setStatus(`Welcome ${existingUser.username}. Redirecting...`, "success");
    setTimeout(() => {
      location.href = "index.html";
    }, 800);
    return;
  }

  setStatus("Unsupported authentication mode.", "error");
});
