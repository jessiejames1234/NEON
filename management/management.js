const loadingPanel = document.querySelector("#loading-panel");
const deniedPanel = document.querySelector("#denied-panel");
const deniedMessage = document.querySelector("#denied-message");
const managementApp = document.querySelector("#management-app");
const managementMessage = document.querySelector("#management-message");
const refreshButton = document.querySelector("#refresh-management");
const usersTable = document.querySelector("#users-table");
const scoresTable = document.querySelector("#scores-table");
const editModal = document.querySelector("#edit-modal");
const editModalTitle = document.querySelector("#edit-modal-title");
const editForm = document.querySelector("#edit-form");
const editMessage = document.querySelector("#edit-message");
const userEditFields = document.querySelector("#user-edit-fields");
const scoreEditFields = document.querySelector("#score-edit-fields");
const usersPanel = document.querySelector("#users-panel");
const scoresPanel = document.querySelector("#scores-panel");
const usersViewButton = document.querySelector("#users-view-button");
const scoresViewButton = document.querySelector("#scores-view-button");
const usersFilter = document.querySelector("#users-filter");
const scoresFilter = document.querySelector("#scores-filter");
const actionDropdown = document.querySelector("#action-dropdown");

const records = { users: [], scores: [] };
const tableState = { usersPage: 1, scoresPage: 1, activeView: "users" };
const PAGE_SIZE = 10;
let editing = null;
let activeActionToggle = null;
let managerRole = "";

function isOwner() {
  return managerRole === "owner";
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function formatDate(value) {
  if (!value) return "---";
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function badge(value, kind) {
  const element = document.createElement("span");
  const normalized = String(value || "unknown").toLowerCase();
  element.className = `data-badge ${kind}-${normalized}`;
  element.textContent = normalized.toUpperCase();
  return element;
}

function cell(value, className = "") {
  const element = document.createElement("td");
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function emptyRow(columns, message) {
  const row = document.createElement("tr");
  const item = cell(message, "empty-row");
  item.colSpan = columns;
  row.append(item);
  return row;
}

function closeActionDropdown() {
  activeActionToggle?.setAttribute("aria-expanded", "false");
  activeActionToggle = null;
  actionDropdown.classList.add("hidden");
  actionDropdown.replaceChildren();
}

function dropdownButton(label, className, action, entity, record, status = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  button.dataset.entity = entity;
  button.dataset.id = String(record.id);
  if (status) button.dataset.status = status;
  button.textContent = label;
  button.setAttribute("role", "menuitem");
  return button;
}

function openActionDropdown(toggle, entity, record) {
  if (activeActionToggle === toggle) {
    closeActionDropdown();
    return;
  }
  closeActionDropdown();
  activeActionToggle = toggle;
  toggle.setAttribute("aria-expanded", "true");
  if (isOwner()) actionDropdown.append(dropdownButton("EDIT", "action-edit", "edit", entity, record));
  if (entity === "user") {
    const activating = record.status === "inactive";
    actionDropdown.append(dropdownButton(
      activating ? "SET ACTIVE" : "SET INACTIVE",
      activating ? "action-activate" : "action-deactivate",
      "status",
      entity,
      record,
      activating ? "active" : "inactive",
    ));
  }
  actionDropdown.classList.remove("hidden");

  const anchor = toggle.getBoundingClientRect();
  const menu = actionDropdown.getBoundingClientRect();
  let top = anchor.bottom + 6;
  if (top + menu.height > window.innerHeight - 8) top = anchor.top - menu.height - 6;
  const left = Math.min(window.innerWidth - menu.width - 8, Math.max(8, anchor.right - menu.width));
  actionDropdown.style.top = `${Math.max(8, top)}px`;
  actionDropdown.style.left = `${left}px`;
}

function actionCell(entity, record) {
  const wrapper = document.createElement("div");
  const toggle = document.createElement("button");
  const tableCell = document.createElement("td");

  tableCell.className = "action-cell";
  wrapper.className = "row-actions";
  toggle.className = "action-toggle";
  toggle.type = "button";
  toggle.textContent = "\u2022\u2022\u2022";
  toggle.setAttribute("aria-label", `Show actions for ${entity === "user" ? record.username : record.player_name}`);
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    openActionDropdown(toggle, entity, record);
  });
  wrapper.append(toggle);
  tableCell.append(wrapper);
  return tableCell;
}

function filteredUsers() {
  const filter = usersFilter.value.trim().toLowerCase();
  if (!filter) return records.users;
  return records.users.filter((user) => [user.username, user.email, user.role, user.status]
    .some((value) => String(value ?? "").toLowerCase().includes(filter)));
}

function filteredScores() {
  const filter = scoresFilter.value.trim().toLowerCase();
  if (!filter) return records.scores;
  return records.scores.filter((score) => [score.player_name, score.role, score.score, score.wave, score.kills]
    .some((value) => String(value ?? "").toLowerCase().includes(filter)));
}

function updatePagination(entity, totalRecords, totalPages, currentPage) {
  const prefix = entity === "users" ? "users" : "scores";
  setText(`#${prefix}-page`, `PAGE ${currentPage} / ${totalPages}`);
  setText(`#${prefix}-count`, `${totalRecords} RECORD${totalRecords === 1 ? "" : "S"}`);
  document.querySelector(`#${prefix}-previous`).disabled = currentPage <= 1;
  document.querySelector(`#${prefix}-next`).disabled = currentPage >= totalPages;
}

function renderUsers() {
  closeActionDropdown();
  const users = filteredUsers();
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  tableState.usersPage = Math.min(tableState.usersPage, totalPages);
  const start = (tableState.usersPage - 1) * PAGE_SIZE;
  const pageUsers = users.slice(start, start + PAGE_SIZE);
  usersTable.replaceChildren();
  updatePagination("users", users.length, totalPages, tableState.usersPage);
  if (!pageUsers.length) {
    usersTable.append(emptyRow(7, "NO USER RECORDS FOUND"));
    return;
  }
  pageUsers.forEach((user, index) => {
    const row = document.createElement("tr");
    const roleCell = document.createElement("td");
    const statusCell = document.createElement("td");
    roleCell.append(badge(user.role, "role"));
    statusCell.append(badge(user.status, "status"));
    row.append(
      cell(String(start + index + 1), "rank numeric"),
      cell(user.username, "username"),
      cell(user.email),
      roleCell,
      statusCell,
      cell(formatDate(user.created_at)),
      actionCell("user", user),
    );
    usersTable.append(row);
  });
}

function renderScores() {
  closeActionDropdown();
  const scores = filteredScores();
  const totalPages = Math.max(1, Math.ceil(scores.length / PAGE_SIZE));
  tableState.scoresPage = Math.min(tableState.scoresPage, totalPages);
  const start = (tableState.scoresPage - 1) * PAGE_SIZE;
  const pageScores = scores.slice(start, start + PAGE_SIZE);
  scoresTable.replaceChildren();
  updatePagination("scores", scores.length, totalPages, tableState.scoresPage);
  if (!pageScores.length) {
    scoresTable.append(emptyRow(isOwner() ? 8 : 7, "NO COMBAT SCORES RECORDED"));
    return;
  }
  pageScores.forEach((score, index) => {
    const row = document.createElement("tr");
    const roleCell = document.createElement("td");
    roleCell.append(badge(score.role, "role"));
    row.append(
      cell(String(start + index + 1).padStart(2, "0"), "rank numeric"),
      cell(score.player_name, "username"),
      roleCell,
      cell(Number(score.score || 0).toLocaleString(), "points numeric"),
      cell(String(score.wave || 1), "numeric"),
      cell(Number(score.kills || 0).toLocaleString(), "numeric"),
      cell(formatDate(score.updated_at)),
    );
    if (isOwner()) row.append(actionCell("score", score));
    scoresTable.append(row);
  });
}

function renderOverview(payload) {
  const users = Array.isArray(payload.users) ? payload.users : [];
  const scores = Array.isArray(payload.scores) ? payload.scores : [];
  records.users = users;
  records.scores = scores;
  managerRole = String(payload.manager?.role || "").toLowerCase();
  const activeUsers = users.filter((user) => user.status === "active").length;
  const staffUsers = users.filter((user) => user.role === "admin" || user.role === "owner").length;

  setText("#owner-name", payload.manager?.username || "---");
  document.querySelector("#scores-action-heading").classList.toggle("hidden", !isOwner());
  setText("#total-users", users.length.toLocaleString());
  setText("#active-users", activeUsers.toLocaleString());
  setText("#staff-users", staffUsers.toLocaleString());
  setText("#total-scores", scores.length.toLocaleString());
  renderUsers();
  renderScores();
}

async function requestJson(url) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = { error: "The server returned an invalid response." };
  }
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function updateRecord(body) {
  const response = await fetch("/api/management/overview", {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    throw error;
  }
  return payload;
}

function closeEditModal() {
  editing = null;
  editForm.reset();
  editMessage.textContent = "";
  editModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function openEditModal(entity, id) {
  closeActionDropdown();
  const source = entity === "user" ? records.users : records.scores;
  const record = source.find((item) => Number(item.id) === Number(id));
  if (!record) return;
  editing = { entity, id: Number(id) };
  editMessage.textContent = "";
  userEditFields.classList.toggle("hidden", entity !== "user");
  scoreEditFields.classList.toggle("hidden", entity !== "score");
  userEditFields.querySelectorAll("input, select").forEach((field) => {
    field.disabled = entity !== "user";
  });
  scoreEditFields.querySelectorAll("input, select").forEach((field) => {
    field.disabled = entity !== "score";
  });

  if (entity === "user") {
    editModalTitle.textContent = `EDIT USER // ${record.username}`;
    document.querySelector("#edit-username").value = record.username;
    document.querySelector("#edit-email").value = record.email;
    document.querySelector("#edit-role").value = record.role;
  } else {
    editModalTitle.textContent = `EDIT SCORE // ${record.player_name}`;
    document.querySelector("#edit-points").value = Number(record.score || 0);
    document.querySelector("#edit-wave").value = Number(record.wave || 1);
    document.querySelector("#edit-kills").value = Number(record.kills || 0);
  }

  editModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  (entity === "user" ? document.querySelector("#edit-username") : document.querySelector("#edit-points"))?.focus();
}

async function handleActionButton(button) {
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") {
    openEditModal(button.dataset.entity, id);
    return;
  }
  if (button.dataset.action === "status") {
    button.disabled = true;
    managementMessage.textContent = "UPDATING ACCOUNT STATUS...";
    try {
      const payload = await updateRecord({ entity: "user", action: "set-status", id, status: button.dataset.status });
      await loadManagement();
      managementMessage.textContent = payload.message;
    } catch (error) {
      managementMessage.textContent = error.message;
      button.disabled = false;
    }
  }
}

function switchManagementView(view) {
  const showingUsers = view === "users";
  tableState.activeView = showingUsers ? "users" : "scores";
  setText("#management-view-title", showingUsers ? "USER" : "SCORE");
  usersPanel.classList.toggle("hidden", !showingUsers);
  scoresPanel.classList.toggle("hidden", showingUsers);
  usersViewButton.classList.toggle("active", showingUsers);
  scoresViewButton.classList.toggle("active", !showingUsers);
  usersViewButton.setAttribute("aria-selected", String(showingUsers));
  scoresViewButton.setAttribute("aria-selected", String(!showingUsers));
  closeActionDropdown();
  (showingUsers ? usersFilter : scoresFilter).focus();
}

async function loadManagement() {
  refreshButton.disabled = true;
  managementMessage.textContent = "SYNCHRONIZING SECURE RECORDS...";
  try {
    const payload = await requestJson("/api/management/overview");
    renderOverview(payload);
    loadingPanel.classList.add("hidden");
    deniedPanel.classList.add("hidden");
    managementApp.classList.remove("hidden");
    managementMessage.textContent = `LAST SYNCHRONIZED ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      loadingPanel.classList.add("hidden");
      managementApp.classList.add("hidden");
      deniedMessage.textContent = error.message;
      deniedPanel.classList.remove("hidden");
    } else {
      loadingPanel.classList.add("hidden");
      managementApp.classList.remove("hidden");
      managementMessage.textContent = error.message;
    }
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadManagement);
usersViewButton.addEventListener("click", () => switchManagementView("users"));
scoresViewButton.addEventListener("click", () => switchManagementView("scores"));
usersFilter.addEventListener("input", () => {
  tableState.usersPage = 1;
  renderUsers();
});
scoresFilter.addEventListener("input", () => {
  tableState.scoresPage = 1;
  renderScores();
});
document.querySelector("#users-previous").addEventListener("click", () => {
  tableState.usersPage = Math.max(1, tableState.usersPage - 1);
  renderUsers();
});
document.querySelector("#users-next").addEventListener("click", () => {
  tableState.usersPage += 1;
  renderUsers();
});
document.querySelector("#scores-previous").addEventListener("click", () => {
  tableState.scoresPage = Math.max(1, tableState.scoresPage - 1);
  renderScores();
});
document.querySelector("#scores-next").addEventListener("click", () => {
  tableState.scoresPage += 1;
  renderScores();
});
actionDropdown.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) handleActionButton(button);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("#action-dropdown,.action-toggle")) closeActionDropdown();
});
window.addEventListener("resize", closeActionDropdown);
window.addEventListener("scroll", closeActionDropdown, true);
document.querySelector("#close-edit-modal").addEventListener("click", closeEditModal);
document.querySelector("#cancel-edit").addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) closeEditModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editModal.classList.contains("hidden")) closeEditModal();
});
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editing) return;
  const saveButton = document.querySelector("#save-edit");
  saveButton.disabled = true;
  editMessage.textContent = "SAVING SECURE RECORD...";
  const body = editing.entity === "user"
    ? {
        entity: "user",
        action: "edit",
        id: editing.id,
        username: document.querySelector("#edit-username").value.trim(),
        email: document.querySelector("#edit-email").value.trim(),
        role: document.querySelector("#edit-role").value,
      }
    : {
        entity: "score",
        action: "edit",
        id: editing.id,
        score: Number(document.querySelector("#edit-points").value),
        wave: Number(document.querySelector("#edit-wave").value),
        kills: Number(document.querySelector("#edit-kills").value),
      };
  try {
    const payload = await updateRecord(body);
    closeEditModal();
    await loadManagement();
    managementMessage.textContent = payload.message;
  } catch (error) {
    editMessage.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});
loadManagement();
