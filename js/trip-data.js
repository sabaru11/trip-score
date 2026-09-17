// ระบบข้อมูลกลาง: อ่าน/เขียน "ผู้เล่น" และ "เกม" ใน Firestore แบบเรียลไทม์
// ใช้ร่วมกันทั้งหน้า host.html และ index.html

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const isPlaceholderConfig = firebaseConfig.apiKey === "YOUR_API_KEY";

let app = null;
let db = null;

if (!isPlaceholderConfig) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

/** อ่านรหัสทริปจาก ?trip=XXXX ใน URL หรือจาก localStorage หรือค่าเริ่มต้น DEMO01 */
export function getTripCode() {
  const fromUrl = new URLSearchParams(location.search).get("trip");
  if (fromUrl) {
    localStorage.setItem("tripScore.tripCode", fromUrl.toUpperCase());
    return fromUrl.toUpperCase();
  }
  return localStorage.getItem("tripScore.tripCode") || "DEMO01";
}

/** เปลี่ยนรหัสทริป แล้วรีโหลดหน้า */
export function setTripCode(code) {
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  localStorage.setItem("tripScore.tripCode", clean);
  const url = new URL(location.href);
  url.searchParams.set("trip", clean);
  location.href = url.toString();
}

export function isConnected() {
  return db !== null;
}

function playersRef(tripCode) {
  return collection(db, "trips", tripCode, "players");
}
function gamesRef(tripCode) {
  return collection(db, "trips", tripCode, "games");
}

/** ฟัง players แบบเรียลไทม์ เรียง callback(players[]) ทุกครั้งที่ข้อมูลเปลี่ยน */
export function subscribePlayers(tripCode, callback) {
  const q = query(playersRef(tripCode), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** ฟัง games แบบเรียลไทม์ เรียงเก่า -> ใหม่ */
export function subscribeGames(tripCode, callback) {
  const q = query(gamesRef(tripCode), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addPlayer(tripCode, name) {
  return addDoc(playersRef(tripCode), {
    name,
    createdAt: serverTimestamp(),
  });
}

export async function removePlayer(tripCode, playerId) {
  return deleteDoc(doc(db, "trips", tripCode, "players", playerId));
}

export async function addGame(tripCode, name) {
  return addDoc(gamesRef(tripCode), {
    name,
    scores: {},
    createdAt: serverTimestamp(),
  });
}

export async function updateGameScore(tripCode, gameId, playerId, score) {
  return updateDoc(doc(db, "trips", tripCode, "games", gameId), {
    [`scores.${playerId}`]: score,
  });
}

export async function deleteGame(tripCode, gameId) {
  return deleteDoc(doc(db, "trips", tripCode, "games", gameId));
}

/** รวมคะแนนทุกเกมของผู้เล่นแต่ละคน -> [{id, name, total}] เรียงคะแนนมาก -> น้อย */
export function computeLeaderboard(players, games) {
  return players
    .map((p) => {
      const total = games.reduce((sum, g) => sum + (g.scores?.[p.id] || 0), 0);
      return { id: p.id, name: p.name, total };
    })
    .sort((a, b) => b.total - a.total);
}
