const clientId = "91d4165085fd4ed3bd281f16667d64bc";
const redirectUri = "https://theodore33-web.github.io/LyricsOriginal/";

// 🔐 LOGIN
function login() {
  const scope = "user-read-private user-read-email";

  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&show_dialog=true`;

  window.location = url;
}

// 🎯 TOKEN
function getToken() {
  const hash = window.location.hash;

  if (hash) {
    const token = hash.split("&")[0].split("=")[1];
    localStorage.setItem("spotify_token", token);
    window.location.hash = "";
    return token;
  }

  return localStorage.getItem("spotify_token");
}

let accessToken = getToken();

// 🧪 TEST API
async function testAPI() {
  console.log("TOKEN =", accessToken);

  if (!accessToken) {
    console.log("❌ Pas de token → login nécessaire");
    return;
  }

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  console.log("STATUS =", res.status);

  if (res.status === 401) {
    console.log("❌ Token invalide ou expiré");
    login();
    return;
  }

  const data = await res.json();
  console.log("DATA =", data);

  // affichage simple
  document.body.innerHTML = `
    <h1>✅ Connecté à Spotify</h1>
    <p>Nom : ${data.display_name}</p>
    <p>Email : ${data.email}</p>
  `;
}

// 🚀 START
if (!accessToken) {
  document.body.innerHTML = `<button onclick="login()">Se connecter à Spotify</button>`;
} else {
  testAPI();
}
