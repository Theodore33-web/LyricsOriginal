<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LyricsOriginal - Player & Favoris</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #121212;
            color: #FFFFFF;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            gap: 40px;
        }
        h1 { color: #1DB954; margin-bottom: 20px; }
        
        .main-wrapper {
            display: flex;
            background: #181818;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            overflow: hidden;
            width: 750px;
            height: 480px;
        }

        /* --- CÔTÉ GAUCHE : LECTEUR --- */
        .player-section {
            flex: 1;
            padding: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #282828;
        }
        
        .track-art {
            width: 180px;
            height: 180px;
            background-color: #282828;
            margin-bottom: 20px;
            border-radius: 8px;
            background-size: cover;
            background-position: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .track-title { font-size: 18px; font-weight: bold; margin: 10px 0 5px 0; text-align: center; }
        .track-artist { font-size: 14px; color: #b3b3b3; margin-bottom: 15px; text-align: center; }

        .like-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .like-btn {
            background: none;
            border: none;
            font-size: 40px;
            cursor: pointer;
            transition: transform 0.2s;
            padding: 0;
            line-height: 1;
        }
        .like-btn:hover { transform: scale(1.1); }
        .like-text { font-size: 14px; font-weight: bold; }

        /* --- CÔTÉ DROIT : PANNEAU DES TITRES LIKÉS --- */
        .favorites-section {
            width: 320px;
            padding: 25px;
            display: flex;
            flex-direction: column;
            background: #1c1c1c;
        }

        .favorites-section h3 {
            margin-top: 0;
            color: #1DB954;
            border-bottom: 2px solid #282828;
            padding-bottom: 10px;
            font-size: 18px;
        }

        .favorites-list {
            flex: 1;
            overflow-y: auto;
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .favorite-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            border-radius: 6px;
            transition: background 0.2s;
            font-size: 13px;
        }
        .favorite-item:hover { background: #282828; }

        .favorite-item img {
            width: 35px;
            height: 35px;
            border-radius: 4px;
            background-color: #333;
        }

        .favorite-details {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            white-space: nowrap;
        }
        .fav-name { font-weight: bold; text-overflow: ellipsis; overflow: hidden; }
        .fav-artist { color: #b3b3b3; font-size: 11px; text-overflow: ellipsis; overflow: hidden; }

        .status { 
            position: absolute;
            bottom: 20px;
            color: #1DB954; 
            font-style: italic; 
            font-size: 13px; 
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="main-wrapper" id="player-box" style="display: none;">
        <div class="player-section">
            <h1>LyricsOriginal</h1>
            <div class="track-art" id="track-img"></div>
            <div class="track-title" id="track-name">Aucun titre</div>
            <div class="track-artist" id="track-author">Inconnu</div>
            
            <div class="like-container">
                <button id="like-button" class="like-btn">🖤</button>
                <span id="like-status-text" class="like-text">...</span>
            </div>
        </div>

        <div class="favorites-section">
            <h3>Mes Titres Likés 📁</h3>
            <ul class="favorites-list" id="favorites-container">
                </ul>
        </div>
    </div>
    
    <p id="status-text" class="status">Initialisation de la connexion...</p>

    <script>
        const clientId = '91d4165085fd4ed3bd281f16667d64bc';
        const redirectUri = 'https://theodore33-web.github.io/LyricsOriginal/';
        
        const scope = 'user-read-currently-playing user-library-read user-library-modify';

        let currentToken = null; 
        let currentTrackId = null;
        let isCurrentTrackLiked = false;
        let currentTrackData = null; // Stocke l'objet complet de la piste en cours (nom, artiste, pochette)

        const statusText = document.getElementById('status-text');
        const playerBox = document.getElementById('player-box');
        const trackImg = document.getElementById('track-img');
        const trackName = document.getElementById('track-name');
        const trackAuthor = document.getElementById('track-author');
        const likeButton = document.getElementById('like-button');
        const likeStatusText = document.getElementById('like-status-text');
        const favoritesContainer = document.getElementById('favorites-container');

        // --- AUTHENTIFICATION PKCE ---
        function generateCodeVerifier(length) {
            let text = '';
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
            for (let i = 0; i < length; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }

        async function generateCodeChallenge(codeVerifier) {
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            const base64String = btoa(String.fromCharCode(...new Uint8Array(digest)));
            return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        async function redirectToSpotify() {
            localStorage.removeItem("verifier");
            const verifier = generateCodeVerifier(128);
            localStorage.setItem("verifier", verifier);
            const challenge = await generateCodeChallenge(verifier);

            const authUrl = new URL("https://accounts.spotify.com/authorize");
            const args = {
                response_type: 'code',
                client_id: clientId,
                scope: scope,
                redirect_uri: redirectUri,
                code_challenge_method: 'S256',
                code_challenge: challenge,
                show_dialog: true 
            };
            authUrl.search = new URLSearchParams(args).toString();
            window.location.href = authUrl.toString();
        }

        async function getAccessToken(code) {
            const codeVerifier = localStorage.getItem('verifier');
            const payload = {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier
                })
            };
            try {
                const response = await fetch('https://accounts.spotify.com/api/token', payload);
                const data = await response.json();
                return data.access_token;
            } catch (error) {
                console.error("Erreur de récupération du Token:", error);
            }
        }

        // --- 1. CHARGEMENT ET AFFICHAGE DES FAVORIS À DROITE ---
        async function fetchAndDisplaySavedTracks() {
            if (!currentToken) return;
            try {
                // CORRECTION : Utilisation de la bonne adresse de récupération spécifiée dans votre document
                const response = await fetch('https://api.spotify.com/v1/me/tracks', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    favoritesContainer.innerHTML = ""; // Réinitialiser le panneau

                    // Structure de réponse de la bibliothèque de favoris : data.items contenant des objets wrapper
                    if (data.items && data.items.length > 0) {
                        data.items.forEach(item => {
                            const track = item.track; // Accès obligatoire à la propriété .track d'après votre doc
                            if (!track) return;

                            const li = document.createElement('li');
                            li.className = 'favorite-item';
                            li.dataset.trackId = track.id;
                            
                            const imgUrl = track.album.images.length > 0 ? track.album.images[0].url : '';
                            
                            li.innerHTML = `
                                <img src="${imgUrl}" alt="pochette">
                                <div class="favorite-details">
                                    <span class="fav-name">${track.name}</span>
                                    <span class="fav-artist">${track.artists.map(a => a.name).join(', ')}</span>
                                </div>
                            `;
                            favoritesContainer.appendChild(li);
                        });
                    } else {
                        favoritesContainer.innerHTML = "<p style='font-size:12px; color:#aaa; text-align:center; padding-top:20px;'>Aucun favori enregistré.</p>";
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des favoris :", error);
            }
        }

        // --- 2. RÉCUPÉRATION DU MORCEAU EN COURS ---
        async function checkCurrentPlayback() {
            if (!currentToken) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });

                if (response.status === 204 || response.status === 404) {
                    statusText.innerHTML = "💡 Aucun titre en cours d'écoute. Activez Spotify !";
                    return;
                }

                const data = await response.json();
                if (data && data.item) {
                    const track = data.item;
                    
                    if (currentTrackId !== track.id) {
                        currentTrackId = track.id;
                        currentTrackData = track;
                        trackName.textContent = track.name;
                        trackAuthor.textContent = track.artists.map(a => a.name).join(', ');
                        trackImg.style.backgroundImage = track.album.images.length > 0 ? `url(${track.album.images[0].url})` : 'none';
                        
                        // Lance la vérification GET pour l'état du cœur
                        await checkIfTrackIsLiked(track.id);
                    }
                    statusText.innerHTML = "Synchronisation active.";
                }
            } catch (error) {
                console.error("Erreur lecture en cours :", error);
            }
        }

        // --- 3. VÉRIFICATION (GET) SUR LA BIBLIOTHÈQUE ---
        async function checkIfTrackIsLiked(trackId) {
            if (!trackId || !currentToken) return;
            try {
                // Utilisation de la nouvelle adresse unifiée /me/library/contains d'après votre document
                const url = `https://api.spotify.com/v1/me/library/contains?uris=spotify:track:${trackId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                
                const [isLiked] = await response.json();
                isCurrentTrackLiked = isLiked;
                updateLikeButtonUI();
            } catch (error) {
                console.error("Erreur de détection :", error);
            }
        }

        // --- 4. MISE À JOUR VISUELLE ---
        function updateLikeButtonUI() {
            if (isCurrentTrackLiked) {
                likeButton.textContent = "❤️";
                likeStatusText.textContent = "Liké";
                likeStatusText.style.color = "#1DB954";
            } else {
                likeButton.textContent = "🖤";
                likeStatusText.textContent = "Non liké";
                likeStatusText.style.color = "#aaaaaa";
            }
        }

        // --- 5a. AJOUT INSTANTANÉ D'UN TITRE DANS LA LISTE DE DROITE ---
        function addTrackToFavoritesUI(track) {
            if (!track) return;
            // Évite les doublons si le titre est déjà présent dans la liste
            if (favoritesContainer.querySelector(`[data-track-id="${track.id}"]`)) return;

            // Supprime le message "Aucun favori enregistré." s'il est affiché
            const emptyMsg = favoritesContainer.querySelector('p');
            if (emptyMsg) emptyMsg.remove();

            const imgUrl = track.album && track.album.images.length > 0 ? track.album.images[0].url : '';

            const li = document.createElement('li');
            li.className = 'favorite-item';
            li.dataset.trackId = track.id;
            li.innerHTML = `
                <img src="${imgUrl}" alt="pochette">
                <div class="favorite-details">
                    <span class="fav-name">${track.name}</span>
                    <span class="fav-artist">${track.artists.map(a => a.name).join(', ')}</span>
                </div>
            `;
            favoritesContainer.prepend(li);
        }

        // --- 5b. RETRAIT INSTANTANÉ D'UN TITRE DE LA LISTE DE DROITE ---
        function removeTrackFromFavoritesUI(trackId) {
            const li = favoritesContainer.querySelector(`[data-track-id="${trackId}"]`);
            if (li) li.remove();

            // Réaffiche le message si la liste est désormais vide
            if (favoritesContainer.children.length === 0) {
                favoritesContainer.innerHTML = "<p style='font-size:12px; color:#aaa; text-align:center; padding-top:20px;'>Aucun favori enregistré.</p>";
            }
        }

        // --- 6. ACTION AU CLIC : PUT (ENREGISTRER) OU DELETE (SUPPRIMER) ---
        async function toggleLikeTrack() {
            if (!currentTrackId || !currentToken) return;

            const methodType = isCurrentTrackLiked ? 'DELETE' : 'PUT';
            // Les URIs doivent être passés en paramètre de requête dans l'URL, pas dans le body
            const trackUri = encodeURIComponent(`spotify:track:${currentTrackId}`);
            const url = `https://api.spotify.com/v1/me/library?uris=${trackUri}`;

            try {
                const response = await fetch(url, {
                    method: methodType,
                    headers: { 
                        'Authorization': `Bearer ${currentToken}`
                    }
                });

                if (response.ok) {
                    isCurrentTrackLiked = !isCurrentTrackLiked;
                    updateLikeButtonUI();

                    // Ajoute ou retire le titre dans la liste de droite sans refaire d'appel API
                    if (isCurrentTrackLiked) {
                        addTrackToFavoritesUI(currentTrackData);
                    } else {
                        removeTrackFromFavoritesUI(currentTrackId);
                    }
                } else if (response.status === 401 || response.status === 403) {
                    statusText.textContent = "Session expirée. Reconnexion...";
                    setTimeout(redirectToSpotify, 1500);
                }
            } catch (error) {
                console.error("Erreur modification bibliothèque :", error);
            }
        }

        // --- ATTACHEMENTS ET CYCLE DE Lancement ---
        likeButton.addEventListener('click', toggleLikeTrack);

        window.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (!code) {
                statusText.textContent = "Redirection vers Spotify...";
                redirectToSpotify();
            } else {
                window.history.pushState({}, document.title, window.location.pathname);
                statusText.textContent = "Analyse des droits...";
                
                const token = await getAccessToken(code);
                if (token) {
                    currentToken = token; 
                    playerBox.style.display = 'flex';
                    
                    // Charge la liste de droite
                    await fetchAndDisplaySavedTracks();
                    
                    // Active la synchronisation de l'écoute à gauche
                    await checkCurrentPlayback();
                    setInterval(checkCurrentPlayback, 3000);
                } else {
                    statusText.textContent = "Échec d'authentification. Relancement...";
                    setTimeout(redirectToSpotify, 2000);
                }
            }
        });
    </script>
</body>
</html>
</body>
</html>
