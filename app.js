
// Vérifie si une piste est déjà likée et met à jour le bouton like (retourne true/false/null)
async function checkIfTrackIsLiked(trackId) {
    if (!currentToken || !trackId) return null;
    try {
        const resp = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${encodeURIComponent(trackId)}`, {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (!resp.ok) {
            const text = await resp.text();
            console.error('checkIfTrackIsLiked: HTTP', resp.status, text);
            return null;
        }

        const arr = await resp.json();
        const isLiked = !!arr[0];

        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
            likeBtn.innerText = isLiked ? '❤️' : '🤍';
            likeBtn.setAttribute('data-liked', String(isLiked));
        }

        return isLiked;
    } catch (err) {
        console.error('Erreur lors de la vérification du favori :', err);
        return null;
    }
}

// Bascule l'état "like" pour la piste courante (PUT pour ajouter, DELETE pour retirer)
// Renvoie le nouvel état (true/false) ou null en cas d'erreur
async function toggleLikeCurrentTrack() {
    if (!currentToken || !lastTrackId) return null;

    const likeBtn = document.getElementById('like-btn');
    if (!likeBtn) return null;

    const isCurrentlyLiked = likeBtn.getAttribute('data-liked') === 'true';
    const method = isCurrentlyLiked ? 'DELETE' : 'PUT';
    const url = `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(lastTrackId)}`;

    try {
        const resp = await fetch(url, {
            method,
            headers: { 'Authorization': 'Bearer ' + currentToken }
            // NOTE: Spotify expects no body for these endpoints
        });

        if (!resp.ok) {
            const text = await resp.text();
            console.error('toggleLikeCurrentTrack: HTTP', resp.status, text);
            // Si 401/403, token/permissions probablement en cause
            if (resp.status === 401) console.warn('Token invalide ou expiré.');
            if (resp.status === 403) console.warn('Scope manquant : assurez-vous d\'avoir user-library-modify.');
            return null;
        }

        const newState = !isCurrentlyLiked;
        likeBtn.innerText = newState ? '❤️' : '🤍';
        likeBtn.setAttribute('data-liked', String(newState));

        // Si la liste affichée est la bibliothèque, la rafraîchir
        const sr = document.getElementById('search-results');
        if (sr && sr.innerHTML.includes('VOS TITRES LIKÉS')) {
            getUserLibrary();
        }

        return newState;
    } catch (err) {
        console.error('Erreur lors du changement d\'état du favori :', err);
        return null;
    }
}
async function updateNowPlaying() {
    if (!currentToken) return;
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        if (response.status === 204 || response.status === 401) return;
        const data = await response.json();

        if (data && data.item) {
            trackDurationMs = data.item.duration_ms || 0;

            const titleEl = document.getElementById('track-title');
            const artistEl = document.getElementById('track-artist');
            const timeCurrentEl = document.getElementById('time-current');
            const timeMaxEl = document.getElementById('time-max');
            const progressFill = document.getElementById('progress-fill');
            const art = document.getElementById('track-art');
            const playBtn = document.getElementById('play-pause-btn');

            if (titleEl) titleEl.innerText = data.item.name || '';
            if (artistEl) artistEl.innerText = (data.item.artists || []).map(a => a.name).join(", ");

            const progressMs = data.progress_ms || 0;
            if (timeCurrentEl) timeCurrentEl.innerText = formatTime(progressMs);
            if (timeMaxEl) timeMaxEl.innerText = formatTime(trackDurationMs);

            const progressPercent = trackDurationMs ? (progressMs / trackDurationMs) * 100 : 0;
            if (progressFill) progressFill.style.width = `${progressPercent}%`;

            if (art) {
                const oldSrc = art.src || "";
                art.src = (data.item.album && data.item.album.images && data.item.album.images.length > 0) ? data.item.album.images[0].url : "";
                art.style.display = art.src ? "block" : "none";
            }

            if (playBtn) playBtn.innerText = data.is_playing ? "⏸" : "▶️";

            highlightLyrics((progressMs) / 1000);

            if (art && art.onload && art.src) {
                // si la source a changé, on met à jour l'arrière-plan quand l'image est chargée
                const oldSrc = art.getAttribute('data-old-src') || "";
                if (art.src !== oldSrc) {
                    art.setAttribute('data-old-src', art.src);
                    art.onload = () => updateDynamicBackground();
                }
            }

            if (data.item.id && data.item.id !== lastTrackId) {
                lastTrackId = data.item.id;
                const artistName = data.item.artists && data.item.artists[0] ? data.item.artists[0].name : "";
                const albumName = data.item.album ? data.item.album.name : "";
                fetchLyrics(artistName, data.item.name || "", albumName, (data.item.duration_ms || 0) / 1000);

                // mise à jour du statut "like" du bouton (pas besoin d'attendre)
                checkIfTrackIsLiked(data.item.id);
            }
        }
    } catch (e) {
        console.error("updateNowPlaying error:", e);
    }
}
