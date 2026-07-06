
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
