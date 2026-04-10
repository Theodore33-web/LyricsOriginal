const clientId = "91d4165085fd4ed3bd281f16667d64bc"; // 🔥 remplace ici
const redirectUri = window.location.origin + window.location.pathname;

// 🔐 LOGIN SPOTIFY
function login() {
  const scope = "user-read-playback-state user-read-currently-playing";

  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

  window.location = url;
}

function getCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code");
}

const code = getCode();

if (code) {
  document.getElementById("title").innerText =
    "Connecté à Spotify ✅ (mais token manquant)";
}

// 🎯 TOKEN
function getToken() {
  const hash = window.location.hash;
  if (!hash) return null;
  return hash.split("&")[0].split("=")[1];
}

const accessToken = getToken();

// 🎧 TRACK EN COURS
async function getCurrentTrack() {
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (res.status === 204) return null;

  const data = await res.json();

  return {
    artist: data.item.artists[0].name,
    track: data.item.name,
    progress: data.progress_ms / 1000
  };
}

// 📜 LYRICS
async function loadLyrics(artist, track) {
  const res = await fetch(
    `https://lrclib.net/api/get?artist_name=${artist}&track_name=${track}`
  );

  const data = await res.json();
  return data.syncedLyrics;
}

// 🧠 PARSE LRC
let lyrics = [];

function parseLyrics(lrc) {
  const lines = lrc.split("\n");

  lyrics = lines.map(line => {
    const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!match) return null;

    const minutes = parseInt(match[1]);
    const seconds = parseFloat(match[2]);

    return {
      time: minutes * 60 + seconds,
      text: match[3]
    };
  }).filter(Boolean);

  displayLyrics();
}

// 🖥️ DISPLAY
function displayLyrics() {
  const lyricsDiv = document.getElementById("lyrics");

  lyricsDiv.innerHTML = lyrics
    .map((l, i) => `<div class="line" id="line-${i}">${l.text}</div>`)
    .join("");
}

// ⏱ SYNC
function updateLyrics(currentTime) {
  lyrics.forEach((line, i) => {
    const next = lyrics[i + 1];

    if (
      currentTime >= line.time &&
      (!next || currentTime < next.time)
    ) {
      document.querySelectorAll(".line").forEach(el => el.classList.remove("active"));

      const el = document.getElementById(`line-${i}`);
      if (el) {
        el.classList.add("active");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });
}

// 🚀 INIT
let startTime = 0;

async function init() {
  if (!accessToken) return;

  const trackData = await getCurrentTrack();

  if (!trackData) {
    document.getElementById("title").innerText = "Lance une musique sur Spotify 🎧";
    return;
  }

  document.getElementById("title").innerText =
    `${trackData.artist} - ${trackData.track}`;

  const lrc = await loadLyrics(trackData.artist, trackData.track);

  if (!lrc) {
    document.getElementById("lyrics").innerText = "Paroles non trouvées 😢";
    return;
  }

  parseLyrics(lrc);

  startTime = Date.now() - trackData.progress * 1000;

  syncLoop();
}

// 🔁 LOOP
function syncLoop() {
  const currentTime = (Date.now() - startTime) / 1000;
  updateLyrics(currentTime);
  requestAnimationFrame(syncLoop);
}

init();
