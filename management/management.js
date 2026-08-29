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

const records = { users: [], scores: [] };
let editing = null;

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

function actionCell(entity, record) {
  const wrapper = document.createElement("div");
  const toggle = document.createElement("button");
  const actions = document.createElement("div");
  const edit = document.createElement("button");
  const tableCell = document.createElement("td");

  tableCell.className = "action-cell";
  wrapper.className = "row-actions";
  toggle.className = "action-toggle";
  toggle.type = "button";
  toggle.textContent = "\u2022\u2022\u2022";
  toggle.setAttribute("aria-label", `Show actions for ${entity === "user" ? record.username : record.player_name}`);
  toggle.setAttribute("aria-expanded", "false");
  actions.className = "action-buttons";
  edit.type = "button";
  edit.className = "action-edit";
  edit.dataset.action = "edit";
  edit.dataset.entity = entity;
  edit.dataset.id = String(record.id);
  edit.textContent = "EDIT";
  actions.append(edit);

  if (entity === "user") {
    const status = document.createElement("button");
    const activating = record.status === "inactive";
    status.type = "button";
    status.className = activating ? "action-activate" : "action-deactivate";
    status.dataset.action = "status";
    status.dataset.entity = entity;
    status.dataset.id = String(record.id);
    status.dataset.status = activating ? "active" : "inactive";
    status.textContent = activating ? "ACTIVE" : "INACTIVE";
    actions.append(status);
  }

  toggle.addEventListener("click", () => {
    const opening = !wrapper.classList.contains("open");
    document.querySelectorAll(".row-actions.open").forEach((menu) => {
      menu.classList.remove("open");
      menu.querySelector(".action-toggle")?.setAttribute("aria-expanded", "false");
    });
    wrapper.classList.toggle("open", opening);
    toggle.setAttribute("aria-expanded", String(opening));
  });
  wrapper.append(toggle, actions);
  tableCell.append(wrapper);
  return tableCell;
}

function renderUsers(users) {
  usersTable.replaceChildren();
  if (!users.length) {
    usersTable.append(emptyRow(7, "NO USER RECORDS FOUND"));
    return;
  }
  users.forEach((user) => {
    const row = document.createElement("tr");
    const roleCell = document.createElement("td");
    const statusCell = document.createElement("td");
    roleCell.append(badge(user.role, "role"));
    statusCell.append(badge(user.status, "status"));
    row.append(
      cell(String(user.id), "numeric"),
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

function renderScores(scores) {
  scoresTable.replaceChildren();
  if (!scores.length) {
    scoresTable.append(emptyRow(8, "NO COMBAT SCORES RECORDED"));
    return;
  }
  scores.forEach((score, index) => {
    const row = document.createElement("tr");
    const roleCell = document.createElement("td");
    roleCell.append(badge(score.role, "role"));
    row.append(
      cell(String(index + 1).padStart(2, "0"), "rank numeric"),
      cell(score.player_name, "username"),
      roleCell,
      cell(Number(score.score || 0).toLocaleString(), "points numeric"),
      cell(String(score.wave || 1), "numeric"),
      cell(Number(score.kills || 0).toLocaleString(), "numeric"),
      cell(formatDate(score.updated_at)),
      actionCell("score", score),
    );
    scoresTable.append(row);
  });
}

function renderOverview(payload) {
  const users = Array.isArray(payload.users) ? payload.users : [];
  const scores = Array.isArray(payload.scores) ? payload.scores : [];
  records.users = users;
  records.scores = scores;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const staffUsers = users.filter((user) => user.role === "admin" || user.role === "owner").length;

  setText("#owner-name", payload.owner?.username || "OWNER");
  setText("#total-users", users.length.toLocaleString());
  setText("#active-users", activeUsers.toLocaleString());
  setText("#staff-users", staffUsers.toLocaleString());
  setText("#total-scores", scores.length.toLocaleString());
  setText("#users-count", `${users.length} RECORD${users.length === 1 ? "" : "S"}`);
  setText("#scores-count", `${scores.length} RECORD${scores.length === 1 ? "" : "S"}`);
  renderUsers(users);
  renderScores(scores);
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
  const source = entity === "user" ? records.users : records.scores;
  const record = source.find((item) => Number(item.id) === Number(id));
  if (!record) return;
  editing = { entity, id: Number(id) };
  editMessage.textContent = "";
  userEditFields.classList.toggle("hidden", entity !== "user");
  scoreEditFields.classList.toggle("hidden", entity !== "score");

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

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
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
usersTable.addEventListener("click", handleTableAction);
scoresTable.addEventListener("click", handleTableAction);
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
