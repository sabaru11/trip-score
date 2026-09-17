import {
  getTripCode,
  setTripCode,
  isConnected,
  subscribePlayers,
  subscribeGames,
  addPlayer,
  removePlayer,
  addGame,
  updateGameScore,
  deleteGame,
} from "./trip-data.js";

const tripCode = getTripCode();
document.getElementById("tripCode").textContent = tripCode;
document.querySelector(".trip-code").addEventListener("click", () => {
  const next = prompt("ใส่รหัสทริป", tripCode);
  if (next) setTripCode(next);
});

const playersEl = document.getElementById("players");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const addGameBtn = document.getElementById("addGameBtn");
const currentGameNameEl = document.getElementById("currentGameName");
const scoreControlsEl = document.getElementById("scoreControls");
const gameHistoryEl = document.getElementById("gameHistory");

if (!isConnected()) {
  scoreControlsEl.innerHTML = `<div class="banner">ยังไม่ได้เชื่อมฐานข้อมูล — ใส่ค่า Firebase project ของคุณใน <code>js/firebase-config.js</code> ก่อนเริ่มใช้งานจริง</div>`;
  addPlayerBtn.disabled = true;
  addGameBtn.disabled = true;
} else {
  let players = [];
  let games = [];
  let currentGameId = null;
  const saveTimers = {};

  addPlayerBtn.addEventListener("click", async () => {
    const name = prompt("ชื่อผู้เล่น");
    if (name && name.trim()) await addPlayer(tripCode, name.trim());
  });

  addGameBtn.addEventListener("click", async () => {
    const name = prompt("ชื่อเกม", `เกม ${games.length + 1}`);
    if (!name || !name.trim()) return;
    const ref = await addGame(tripCode, name.trim());
    currentGameId = ref.id;
    renderScoreControls();
  });

  function renderPlayers() {
    if (players.length === 0) {
      playersEl.innerHTML = `<div class="empty-state">ยังไม่มีผู้เล่น กด "+ เพิ่มผู้เล่น" เพื่อเริ่ม</div>`;
      return;
    }
    playersEl.innerHTML = players
      .map(
        (p) => `
      <div class="player-chip" data-id="${p.id}">
        <span>${escapeHtml(p.name)}</span>
        <button data-remove="${p.id}" title="ลบผู้เล่น">×</button>
      </div>`
      )
      .join("");
    playersEl.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("ลบผู้เล่นคนนี้? (คะแนนเก่าจะยังอยู่ในประวัติเกม)")) {
          await removePlayer(tripCode, btn.dataset.remove);
        }
      });
    });
  }

  function renderScoreControls() {
    const game = games.find((g) => g.id === currentGameId);
    if (!game) {
      currentGameNameEl.textContent = "ยังไม่มีเกม";
      scoreControlsEl.innerHTML = `<div class="empty-state">กด "+ เพิ่มเกม" เพื่อเริ่มเกมแรก</div>`;
      return;
    }
    currentGameNameEl.textContent = game.name;
    if (players.length === 0) {
      scoreControlsEl.innerHTML = `<div class="empty-state">เพิ่มผู้เล่นก่อนถึงจะใส่คะแนนได้</div>`;
      return;
    }
    scoreControlsEl.innerHTML =
      players
        .map(
          (p) => `
      <div class="score-row">
        <span class="pname">${escapeHtml(p.name)}</span>
        <input type="number" inputmode="numeric" data-player="${p.id}" value="${game.scores?.[p.id] ?? 0}">
      </div>`
        )
        .join("") + `<div class="save-status" id="saveStatus"></div>`;

    scoreControlsEl.querySelectorAll("input[data-player]").forEach((input) => {
      input.addEventListener("input", () => {
        const playerId = input.dataset.player;
        const value = Number(input.value) || 0;
        clearTimeout(saveTimers[playerId]);
        saveTimers[playerId] = setTimeout(async () => {
          await updateGameScore(tripCode, currentGameId, playerId, value);
          const status = document.getElementById("saveStatus");
          if (status) {
            status.textContent = "บันทึกแล้ว ✓";
            setTimeout(() => { if (status) status.textContent = ""; }, 1200);
          }
        }, 400);
      });
    });
  }

  function renderGameHistory() {
    if (games.length === 0) {
      gameHistoryEl.innerHTML = `<div class="empty-state">ยังไม่มีเกมที่บันทึกไว้</div>`;
      return;
    }
    gameHistoryEl.innerHTML = [...games]
      .reverse()
      .map((g) => {
        const total = Object.values(g.scores || {}).reduce((a, b) => a + b, 0);
        const date = g.createdAt?.toDate
          ? g.createdAt.toDate().toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
          : "";
        return `
        <div class="history-item" data-id="${g.id}">
          <div class="info">
            <span class="name">${escapeHtml(g.name)}</span>
            <span class="meta">${date} · รวม ${total} แต้ม</span>
          </div>
          <div class="actions">
            <button class="btn ghost small" data-edit="${g.id}">แก้ไข</button>
            <button class="btn danger small" data-del="${g.id}">ลบ</button>
          </div>
        </div>`;
      })
      .join("");

    gameHistoryEl.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentGameId = btn.dataset.edit;
        renderScoreControls();
        scoreControlsEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    gameHistoryEl.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("ลบเกมนี้ทั้งหมด? แก้ไขคืนไม่ได้")) {
          await deleteGame(tripCode, btn.dataset.del);
          if (currentGameId === btn.dataset.del) {
            currentGameId = null;
            renderScoreControls();
          }
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  subscribePlayers(tripCode, (data) => {
    players = data;
    renderPlayers();
    renderScoreControls();
  });
  subscribeGames(tripCode, (data) => {
    games = data;
    if (!currentGameId && games.length > 0) currentGameId = games[games.length - 1].id;
    renderScoreControls();
    renderGameHistory();
  });
}
