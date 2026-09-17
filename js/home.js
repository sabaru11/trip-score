import {
  getTripCode,
  setTripCode,
  isConnected,
  subscribePlayers,
  subscribeGames,
  computeLeaderboard,
} from "./trip-data.js";

const tripCode = getTripCode();
document.getElementById("tripCode").textContent = tripCode;
document.querySelector(".trip-code").addEventListener("click", () => {
  const next = prompt("ใส่รหัสทริป", tripCode);
  if (next) setTripCode(next);
});

const leaderboardEl = document.getElementById("leaderboard");
const playerCountEl = document.getElementById("playerCount");
const latestGameEl = document.getElementById("latestGame");
const gameCountEl = document.getElementById("gameCount");
const gameListEl = document.getElementById("gameList");
const statusEl = document.getElementById("connectionStatus");

if (!isConnected()) {
  statusEl.textContent = "● ยังไม่ได้เชื่อมฐานข้อมูล — ดู js/firebase-config.js";
  leaderboardEl.innerHTML = `<div class="empty-state">ใส่ค่า Firebase config ใน js/firebase-config.js ก่อน ถึงจะเห็นคะแนนจริง</div>`;
} else {
  statusEl.textContent = "● เชื่อมต่อแล้ว · เรียลไทม์";

  let players = [];
  let games = [];

  function render() {
    playerCountEl.textContent = `${players.length} คน`;
    gameCountEl.textContent = `${games.length} เกม`;
    renderLeaderboard();
    renderLatestGame();
    renderGameList();
  }

  function renderLeaderboard() {
    if (players.length === 0) {
      leaderboardEl.innerHTML = `<div class="empty-state">ยังไม่มีผู้เล่น — ไปเพิ่มที่หน้า Host</div>`;
      return;
    }
    const ranked = computeLeaderboard(players, games);
    leaderboardEl.innerHTML = ranked
      .map(
        (p, i) => `
      <div class="rank-row rank-${i + 1}">
        <span class="rank-num">${i + 1}</span>
        <span class="rank-name">${escapeHtml(p.name)}</span>
        <span class="rank-score">${p.total}</span>
      </div>`
      )
      .join("");
  }

  function renderLatestGame() {
    if (games.length === 0) {
      latestGameEl.innerHTML = `<div class="empty-state">ยังไม่มีเกม</div>`;
      return;
    }
    const latest = games[games.length - 1];
    const rows = players
      .map((p) => ({ name: p.name, score: latest.scores?.[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    latestGameEl.innerHTML = `
      <div class="game-name">${escapeHtml(latest.name)}</div>
      ${rows
        .map(
          (r) => `<div class="score-line"><span class="pname">${escapeHtml(r.name)}</span><span class="pscore">${r.score}</span></div>`
        )
        .join("")}
    `;
  }

  function renderGameList() {
    if (games.length === 0) {
      gameListEl.innerHTML = `<div class="empty-state">ยังไม่มีเกมที่บันทึกไว้</div>`;
      return;
    }
    gameListEl.innerHTML = [...games]
      .reverse()
      .map((g) => {
        const rows = players
          .map((p) => ({ name: p.name, score: g.scores?.[p.id] || 0 }))
          .sort((a, b) => b.score - a.score);
        const date = g.createdAt?.toDate
          ? g.createdAt.toDate().toLocaleDateString("th-TH", { day: "numeric", month: "short" })
          : "";
        return `
        <div class="game-item">
          <div class="game-item-header">
            <span class="name">${escapeHtml(g.name)}</span>
            <span class="date">${date}</span>
          </div>
          ${rows
            .map(
              (r) => `<div class="score-line"><span class="pname">${escapeHtml(r.name)}</span><span class="pscore">${r.score}</span></div>`
            )
            .join("")}
        </div>`;
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  subscribePlayers(tripCode, (data) => { players = data; render(); });
  subscribeGames(tripCode, (data) => { games = data; render(); });
}
