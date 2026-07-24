

const APP_VERSION = "v1.1.43";

// Crée un bouton "Afficher plus" avec un style forcé en JS,
// identique à 100% partout où il est utilisé (bibliothèque, écoutes
// récentes, playlists, titres de playlist), peu importe le CSS parent.
function createMoreButton(onClickHandler) {
    const moreBtn = document.createElement('button');
    moreBtn.innerText = "➕ Afficher plus (+10)";
    moreBtn.style.cssText = `
        background: none;
        border: 1px solid var(--spotify-green);
        color: var(--spotify-green);
        border-radius: 20px;
        padding: 8px 15px;
        margin-top: 10px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: bold;
        width: 100%;
        box-sizing: border-box;
        display: block;
        transition: all 0.2s;
    `;
    moreBtn.onmouseenter = () => {
        moreBtn.style.background = 'var(--spotify-green)';
        moreBtn.style.color = 'white';
    };
    moreBtn.onmouseleave = () => {
        moreBtn.style.background = 'none';
        moreBtn.style.color = 'var(--spotify-green)';
    };
    moreBtn.onclick = onClickHandler;
    return moreBtn;
}

// Ajoute un titre à la file d'attente Spotify (POST /me/player/queue)
async function addToQueue(uri, btnEl) {
    if (!currentToken) return;
    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (response.ok) {
            // Retour visuel simple et fiable : bascule immédiate en ✅ avec un léger effet de rebond,
            // maintien 1 seconde, puis retour à 📥
            if (btnEl) {
                const original = btnEl.innerText;
                btnEl.dataset.busy = 'true'; // bloque les re-clics sans utiliser "disabled" (qui assombrit le bouton)
                btnEl.innerText = '✅';
                btnEl.style.transform = 'scale(1.4)';
                btnEl.style.opacity = '1'; // s'assure que l'icône reste bien visible au premier plan

                setTimeout(() => {
                    btnEl.style.transform = 'scale(1)';
                }, 150);

                setTimeout(() => {
                    btnEl.innerText = original;
                    btnEl.dataset.busy = '';
                }, 1200);
            }
        } else if (response.status === 404) {
            alert("Ouvrez Spotify et lancez une lecture sur l'un de vos appareils avant d'ajouter à la file.");
        } else if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            alert(`Trop de requêtes envoyées à Spotify${retryAfter ? `, réessaie dans ${retryAfter} secondes.` : ', réessaie dans quelques secondes.'}`);
        }
    } catch (e) {
        console.error(e);
    }
}

// Crée le bouton 📥 à placer à droite de chaque titre, partout où il est utilisé
function buildQueueButton(uri) {
    const btn = document.createElement('button');
    btn.innerText = '📥';
    btn.title = "Ajouter à la file d'attente";
    btn.style.cssText = `
        background: none;
        border: none;
        font-size: 1rem;
        cursor: pointer;
        margin-left: auto;
        padding: 4px 8px;
        flex-shrink: 0;
        opacity: 1;
        position: relative;
        z-index: 5;
        transition: transform 0.13s ease;
    `;
    btn.onclick = (e) => {
        e.stopPropagation(); // empêche de déclencher la lecture du titre en cliquant sur 📥
        if (btn.dataset.busy === 'true') return; // ignore les clics pendant l'animation en cours
        addToQueue(uri, btn);
    };
    return btn;
}

const clientId = "91d4165085fd4ed3bd281f16667d64bc"; 
        const redirectUri = window.location.origin + window.location.pathname;
        let currentToken = "";
        let lastTrackId = "";
        let currentLyrics = [];
        let trackDurationMs = 0; 
        let currentProgressMs = 0;
        let isCurrentlyPlaying = false;
        let localProgressInterval = null;
        let queueRefreshInterval = null;

        // Stoppe le rafraîchissement automatique de la file d'attente (à appeler dès qu'on quitte ce panneau)
        function stopQueueAutoRefresh() {
            if (queueRefreshInterval) {
                clearInterval(queueRefreshInterval);
                queueRefreshInterval = null;
            }
        }
        let libraryItems = [];
        let displayedCount = 10;
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        let recentItems = [];        
        let displayedRecentCount = 10; 
        let recommendedItems = [];
        let displayedRecommendedCount = 10;
     
        // --- CONFIGURATION GOOGLE DRIVE (via Apps Script, sans connexion utilisateur) ---
        const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUHHl2qp1kLzl3rF5rkHb-qpGiajuYmXJvNsvFzhRHsHz613CmRSknswkXR0ijVJg7Ig/exec";
        const APPS_SCRIPT_SECRET = "fkgnekscihyn39cjr59zcf"; // doit être identique à SECRET_KEY dans le script Apps Script

        let driveRecorder = null;
        let driveAudioChunks = [];
        let driveTimerInterval = null;
        let driveSecondsElapsed = 0;
        let finalAudioBlob = null;
        
        // --- EASTER EGG : couleur des paroles aléatoire, tirée au clic sur "Se connecter à Spotify" ---
        // 9 fois sur 10 : blanc (couleur actuelle). 1 fois sur 10 : vert clair façon Spotify.
        // Le tirage est mémorisé dans localStorage puis appliqué après le retour de Spotify,
        // pour éviter tout effet de cache/rechargement qui fausserait la probabilité perçue.
        function rollLyricsColorChoice() {
            const isGreen = Math.random() < 0.10; // 10% de chances
            localStorage.setItem('lyricsColorChoice', isGreen ? 'green' : 'white');
        }

        function applyLyricsColorEasterEgg() {
            const choice = localStorage.getItem('lyricsColorChoice');
            // Cas "blanc" (90%) : on ne touche à RIEN, la couleur d'origine du site (gris/blanc sombre) reste intacte.
            // Cas "vert" (10%) : on injecte une surcharge avec le vrai vert Spotify (plus foncé que la version précédente).
            if (choice === 'green') {
                const styleTag = document.createElement('style');
                styleTag.id = 'lyrics-easter-egg-style';
                // La ligne active (.lyric-line.active) est plus spécifique et garde donc sa propre couleur de surbrillance
                styleTag.textContent = `.lyric-line { color: #1DB954 !important; }`;
                document.head.appendChild(styleTag);
            }
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const scope = "user-read-private user-read-email user-modify-playback-state user-read-playback-state user-library-read user-library-modify playlist-read-private user-read-recently-played user-read-currently-playing";
        if (code) {
            document.getElementById('login-section').style.display = 'none';
            applyLyricsColorEasterEgg(); // applique le choix tiré avant la redirection
            handleCallback(code);
        } else {
            document.getElementById('login-btn').onclick = () => {
                rollLyricsColorChoice(); // tirage au moment exact du clic
                redirectToSpotify();
            };
        }


        function toggleProfileCard() {
            const profileZone = document.getElementById('profile-card-zone');
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = ""; 
            resultsContainer.dataset.view = '';
            resultsContainer.dataset.topTracksOpen = '';
            stopQueueAutoRefresh();
            document.getElementById('device-control-zone').style.display = 'none';
            document.getElementById('volume-control-zone').style.display = 'none';
            const driveZone = document.getElementById('drive-record-zone');
            if (driveZone) driveZone.style.display = 'none';

            if (profileZone.style.display === 'none') {
                profileZone.style.display = 'block';
            } else {
                profileZone.style.display = 'none';
            }
        }
        
        async function redirectToSpotify() {
            const verifier = generateCodeVerifier(128);
            const challenge = await generateCodeChallenge(verifier);
            localStorage.setItem("verifier", verifier);

            const authUrl = new URL("https://accounts.spotify.com/authorize");
            const args = { response_type: 'code', client_id: clientId, scope: scope, redirect_uri: redirectUri, code_challenge_method: 'S256', code_challenge: challenge };
            authUrl.search = new URLSearchParams(args).toString();
            window.location.href = authUrl.toString();
        }

        async function handleCallback(code) {
            const verifier = localStorage.getItem("verifier");
            const body = new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code: code, redirect_uri: redirectUri, code_verifier: verifier });
            
            try {
                const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
                const data = await response.json();
                if (data.access_token) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    getUserData(data.access_token);
                }
            } catch (e) {
                console.error("Erreur d'authentification : ", e);
            }
        }

        async function getUserData(token) {
            currentToken = token;
            try {
                const response = await fetch('https://api.spotify.com/v1/me', { headers: { 'Authorization': 'Bearer ' + token } });
                const user = await response.json();
                
                document.getElementById('dashboard').style.display = 'flex';
                
                setTimeout(() => {
                    if (document.getElementById('profile-card-name')) {
                        document.getElementById('profile-card-name').innerText = user.display_name || "Théo";
                    }
                    if (document.getElementById('profile-card-avatar')) {
                        document.getElementById('profile-card-avatar').src = user.images && user.images.length > 0 ? user.images[0].url : "https://via.placeholder.com/50";
                    }
                }, 100);
                
                updateNowPlaying();
                initSpectrum();
                initDiscoBallState();
                initPartyPopperState();
                initVoiceCommand();
            } catch (e) {
                console.error("Impossible de récupérer le profil : ", e);
            }
        }

    async function getUserLibrary() {
    document.getElementById('profile-card-zone').style.display = 'none';
    if (!currentToken) return;
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.dataset.view = '';
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();
    resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de la bibliothèque...</p>";

    try {
        let allItems = [];
        let offset = 0;
        const limit = 50;
        let total = Infinity;

        while (offset < total) {
            const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`, {
                headers: { 'Authorization': 'Bearer ' + currentToken }
            });
            const data = await response.json();

            if (!data.items) break;

            allItems = allItems.concat(data.items);
            total = data.total;
            offset += limit;

            resultsContainer.innerHTML = `<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de la bibliothèque... (${allItems.length}/${total})</p>`;
        }

        resultsContainer.innerHTML = "";

        if (allItems.length > 0) {
            libraryItems = allItems;
            displayedCount = 10; 
            renderLibrarySection();
        } else {
            resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Aucun morceau favori trouvé.</p>";
        }
    } catch (e) { 
        console.error(e); 
        resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement de la bibliothèque.</p>";
    }
}
        function renderLibrarySection() {
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = "";

            const titleHeader = document.createElement('p');
            titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
            titleHeader.innerText = "VOS TITRES LIKÉS";
            resultsContainer.appendChild(titleHeader);

            const itemsToDisplay = libraryItems.slice(0, displayedCount);
            const allUris = libraryItems.map(obj => obj.track.uri);

            itemsToDisplay.forEach((obj, index) => {
                const track = obj.track;
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${track.album.images && track.album.images.length > 2 ? track.album.images[2].url : 'https://via.placeholder.com/30'}" alt="">
                    <div>
                        <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.name}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-grey);">${track.artists[0].name}</span>
                    </div>
                `;
                item.onclick = () => playTrackList(allUris, index);
                item.appendChild(buildQueueButton(track.uri));
                resultsContainer.appendChild(item);
            });

            if (libraryItems.length > displayedCount) {
                const moreBtn = createMoreButton(() => {
                    displayedCount += 10;
                    renderLibrarySection();
                });
                resultsContainer.appendChild(moreBtn);
            }
        }

        async function startDriveRecording() {
            document.getElementById('profile-card-zone').style.display = 'none';
            const statusMsg = document.getElementById('drive-status-msg');
            const recordZone = document.getElementById('drive-record-zone');
            const saveZone = document.getElementById('drive-save-zone');
            
            if (driveTimerInterval) {
                clearInterval(driveTimerInterval);
                driveTimerInterval = null;
            }
            
            recordZone.style.display = 'block';
            saveZone.style.display = 'none';
            statusMsg.innerText = "Initialisation du micro...";
            driveAudioChunks = [];
            driveSecondsElapsed = 0;
            document.getElementById('record-timer').innerText = "00:00";

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                driveRecorder = new MediaRecorder(stream);

                driveRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) driveAudioChunks.push(event.data);
                };

                driveRecorder.onstart = () => {
                    statusMsg.innerText = "Enregistrement en cours...";
                    driveTimerInterval = setInterval(() => {
                        driveSecondsElapsed++;
                        const mins = String(Math.floor(driveSecondsElapsed / 60)).padStart(2, '0');
                        const secs = String(driveSecondsElapsed % 60).padStart(2, '0');
                        document.getElementById('record-timer').innerText = `${mins}:${secs}`;
                    }, 1000);
                };

                driveRecorder.onstop = () => {
                    clearInterval(driveTimerInterval);
                    driveTimerInterval = null; 
                    statusMsg.innerText = "Enregistrement stoppé. Choisissez un titre.";
                    finalAudioBlob = new Blob(driveAudioChunks, { type: 'audio/mp3' });
                    stream.getTracks().forEach(track => track.stop()); 
                    saveZone.style.display = 'block'; 
                };

                driveRecorder.start();
            } catch (err) {
                statusMsg.style.color = '#ef4444';
                statusMsg.innerText = "Microphone inaccessible.";
            }
        }

        function stopDriveRecording() {
            if (driveRecorder && driveRecorder.state !== "inactive") driveRecorder.stop();
        }

        // Convertit le Blob audio en base64 et l'envoie au script relais (aucune connexion Google requise)
        function prepareUploadToDrive() {
            const inputName = document.getElementById('audio-filename').value.trim();
            const statusMsg = document.getElementById('drive-status-msg');

            if (!inputName) { alert("Veuillez donner un titre !"); return; }
            if (!finalAudioBlob) { alert("Aucun audio détecté."); return; }

            statusMsg.style.color = 'var(--text-grey)';
            statusMsg.innerText = "Préparation de l'audio...";

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1]; // retire le préfixe "data:audio/mp3;base64,"
                executeActualUpload(base64Audio);
            };
            reader.onerror = () => {
                statusMsg.style.color = '#ef4444';
                statusMsg.innerText = "Erreur de lecture de l'audio.";
            };
            reader.readAsDataURL(finalAudioBlob);
        }

        async function executeActualUpload(base64Audio) {
            const inputName = document.getElementById('audio-filename').value.trim();
            const fileName = inputName.endsWith('.mp3') ? inputName : `${inputName}.mp3`;
            const statusMsg = document.getElementById('drive-status-msg');

            statusMsg.innerText = "Téléversement sur Google Drive...";

            try {
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    // Content-Type "text/plain" évite le préflight CORS bloqué par Apps Script
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        audioBase64: base64Audio,
                        fileName: fileName,
                        mimeType: 'audio/mp3',
                        secret: APPS_SCRIPT_SECRET
                    })
                });

                const result = await response.json();

                if (result.success) {
                    statusMsg.style.color = 'var(--spotify-green)';
                    statusMsg.innerText = "Audio enregistré avec succès sur Google Drive !";
                    setTimeout(() => { document.getElementById('drive-record-zone').style.display = 'none'; }, 3000);
                } else {
                    statusMsg.style.color = '#ef4444';
                    statusMsg.innerText = "Erreur Drive : " + (result.error || "Échec");
                }
            } catch (error) {
                statusMsg.style.color = '#ef4444';
                statusMsg.innerText = "Erreur réseau lors du téléversement.";
                console.error(error);
            }
        }

        async function toggleMicrophoneListen() {
            document.getElementById('profile-card-zone').style.display = 'none';
            const micBtn = document.getElementById('mic-btn');
            const resultsContainer = document.getElementById('search-results');

            if (isRecording) {
                if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunks.push(event.data);
                };

                mediaRecorder.onstart = () => {
                    isRecording = true;
                    micBtn.classList.add('recording');
                    micBtn.innerText = "🛑";
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>ACRCloud vous écoute (10s)...</p>";
                };

                mediaRecorder.onstop = async () => {
                    isRecording = false;
                    micBtn.classList.remove('recording');
                    micBtn.innerText = "🎙️";
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Analyse de l'empreinte audio...</p>";

                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                    stream.getTracks().forEach(track => track.stop());

                    if (audioBlob.size > 1000) {
                        identifyWithACRCloud(audioBlob);
                    } else {
                        resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur : Enregistrement vide.</p>";
                    }
                };

                mediaRecorder.start();
                setTimeout(() => {
                    if (isRecording && mediaRecorder.state !== "inactive") mediaRecorder.stop();
                }, 10000);

            } catch (err) {
                resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Microphone inaccessible (HTTPS requis).</p>";
            }
        }

        async function identifyWithACRCloud(blob) {
            const GlassContainer = document.getElementById('search-results');

            try {
                // Convertit le blob audio en base64 pour l'envoyer au relais Apps Script
                const base64Audio = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'identify_song',
                        secret: APPS_SCRIPT_SECRET,
                        audioBase64: base64Audio,
                        mimeType: blob.type || 'audio/webm'
                    })
                });

                const relayResult = await response.json();

                if (!relayResult.success) {
                    GlassContainer.innerHTML = `<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur : ${relayResult.error || 'échec du relais.'}</p>`;
                    return;
                }

                const acrData = relayResult.result;
                const music = acrData && acrData.metadata && acrData.metadata.music && acrData.metadata.music.length > 0
                    ? acrData.metadata.music[0]
                    : null;

                if (!music) {
                    GlassContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Aucune correspondance trouvée par ACRCloud.</p>";
                    return;
                }

                const title = music.title || 'Titre inconnu';
                const artist = music.artists && music.artists.length > 0 ? music.artists.map(a => a.name).join(', ') : 'Artiste inconnu';

                GlassContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Recherche sur Spotify...</p>";

                // ACRCloud ne donne pas toujours un lien Spotify direct : on résout via une recherche,
                // comme pour "Top Titres", pour garantir un lien de lecture fiable
                const entry = { lastfmName: title, lastfmArtist: artist, spotifyUri: null, spotifyImage: null, resolved: false, notFound: false };
                await resolveTrackOnSpotify(entry);

                GlassContainer.innerHTML = "";
                const item = document.createElement('div');
                item.className = 'search-item';
                const coverImg = entry.spotifyImage || 'https://via.placeholder.com/30';

                item.innerHTML = `
                    <img src="${coverImg}" alt="">
                    <div>
                        <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-grey);">${artist}${entry.notFound ? ' — indisponible sur Spotify' : ''}</span>
                    </div>
                `;

                if (entry.spotifyUri) {
                    item.onclick = () => playTrack(entry.spotifyUri);
                } else {
                    item.onclick = () => {
                        document.getElementById('search-input').value = `${title} ${artist}`;
                        searchTrack();
                    };
                }
                GlassContainer.appendChild(item);

            } catch (err) {
                console.error(err);
                GlassContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Échec de communication avec ACRCloud.</p>";
            }
        }

        async function searchTrack() {
            document.getElementById('profile-card-zone').style.display = 'none';
            const query = document.getElementById('search-input').value;
            if (!query || !currentToken) return;

            try {
                const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
                    headers: { 'Authorization': 'Bearer ' + currentToken }
                });
                const data = await response.json();
                const resultsContainer = document.getElementById('search-results');
                resultsContainer.innerHTML = "";
                resultsContainer.dataset.view = '';
                resultsContainer.dataset.topTracksOpen = '';
                stopQueueAutoRefresh();

                if (data.tracks && data.tracks.items.length > 0) {
                    data.tracks.items.forEach(track => {
                        const item = document.createElement('div');
                        item.className = 'search-item';
                        item.innerHTML = `
                            <img src="${track.album.images && track.album.images.length > 2 ? track.album.images[2].url : 'https://via.placeholder.com/30'}" alt="">
                            <div>
                                <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.name}</strong>
                                <span style="font-size: 0.8rem; color: var(--text-grey);">${track.artists[0].name}</span>
                            </div>
                        `;
                        item.onclick = () => playTrack(track.uri);
                        item.appendChild(buildQueueButton(track.uri));
                        resultsContainer.appendChild(item);
                    });
                } else {
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Aucun résultat sur Spotify.</p>";
                }
            } catch (e) { console.error(e); }
        }

        async function playTrack(trackUri) {
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uris: [trackUri] })
                });
                if (response.ok) {
                    document.getElementById('search-results').innerHTML = "";
                    document.getElementById('search-input').value = "";
                    setTimeout(updateNowPlaying, 600);
                } else if (response.status === 404) {
                    alert("Ouvrez Spotify et lancez une lecture sur l'un de vos appareils.");
                }
            } catch (e) { console.error(e); }
        }

        async function playTrackList(urisArray, startIndex = 0) {
            if (!currentToken || urisArray.length === 0) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: { 
                        'Authorization': 'Bearer ' + currentToken, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        uris: urisArray,
                        offset: { position: startIndex } 
                    })
                });
                if (response.ok) {
                    document.getElementById('search-results').innerHTML = "";
                    document.getElementById('search-input').value = "";
                    setTimeout(updateNowPlaying, 600);
                } else if (response.status === 404) {
                    alert("Ouvrez Spotify et lancez une lecture sur l'un de vos appareils.");
                }
            } catch (e) { console.error(e); }
        }

        document.getElementById('search-input')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') searchTrack();
        });

   async function seekTrack(event) {
    if (!currentToken || !trackDurationMs) return;
    
    // Calcule la position du clic en pixels par rapport à la largeur totale de la barre
    const rect = event.currentTarget.getBoundingClientRect();
    const clickPositionRatio = (event.clientX - rect.left) / rect.width;
    
    // Convertit ce ratio en millisecondes selon la durée totale du morceau
    const targetPositionMs = Math.floor(clickPositionRatio * trackDurationMs);

    try {
        // ✅ Version sans proxy : On contacte directement l'API officielle de Spotify
        // Le paramètre ?position_ms= est requis par Spotify pour savoir où aller.
        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${targetPositionMs}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        
        // Force la mise à jour visuelle juste après le saut dans le morceau
        setTimeout(updateNowPlaying, 300);
    } catch (e) { 
        console.error("Erreur de navigation dans le morceau :", e); 
    }
}
        function formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

async function fetchLyrics(artist, title, album, duration) {
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&album_name=${encodeURIComponent(album)}&duration=${Math.round(duration)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.syncedLyrics) {
            parseLyrics(data.syncedLyrics);
        } else if (data.plainLyrics) {
            const plainLines = data.plainLyrics.split('\n');
            
            // On crée le titre en vert avec le même style que tes autres sections
            const titleHeader = `<p style="color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;">PAROLES</p>`;
            
            // ✅ STRUCTURE CONSERVÉE : On garde STRICTEMENT tes divs d'origine avec ton style inline d'origine
            const linesHtml = plainLines
                .map(line => `<div class="lyric-line" style="opacity: 1; transform: scale(1);">${line.trim()}</div>`)
                .join('');
                
            document.getElementById('lyrics-content').innerHTML = titleHeader + linesHtml;
            currentLyrics = []; 
        } else {
            // ✅ STRUCTURE CONSERVÉE : On garde ton style inline ici aussi avec le titre vert devant
            document.getElementById('lyrics-content').innerHTML = `
                <p style="color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;">PAROLES</p>
                <div class="lyric-line" style="opacity: 1;">Paroles indisponibles.</div>
            `;
            currentLyrics = [];
        }
    } catch (e) {
        document.getElementById('lyrics-content').innerText = "Erreur de chargement des paroles.";
    }
}

function parseLyrics(lrc) {
    const lines = lrc.split('\n');
    currentLyrics = lines.map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (match) {
            return { time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: match[3].trim() };
        }
        return null;
    }).filter(l => l && l.text !== "");
    
    // On ajoute aussi le titre en vert pour le mode synchronisé
    const titleHeader = `<p style="color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;">PAROLES</p>`;
    const linesHtml = currentLyrics.map((l, i) => `<div id="line-${i}" class="lyric-line">${l.text}</div>`).join('');
    
    document.getElementById('lyrics-content').innerHTML = titleHeader + linesHtml;
}

function highlightLyrics(currentTime) {
    currentLyrics.forEach((line, i) => {
        const el = document.getElementById(`line-${i}`);
        if (!el) return;
        const next = currentLyrics[i+1];
        if (currentTime >= line.time && (!next || currentTime < next.time)) {
            if (!el.classList.contains('active')) {
                document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active'));
                el.classList.add('active');
                if (autoScrollLyricsEnabled) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    });
}

        function updateDynamicBackground() {
            const img = document.getElementById('track-art');
            if (!img || img.style.display === "none" || !img.src) return;

            const tempImg = new Image();
            tempImg.crossOrigin = "Anonymous";
            tempImg.src = img.src;

            tempImg.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 10; 
                    canvas.height = 10;
                    
                    ctx.drawImage(tempImg, 0, 0, 10, 10);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    
                    let r1 = imgData[0], g1 = imgData[1], b1 = imgData[2];
                    let r2 = imgData[40], g2 = imgData[41], b2 = imgData[42];

                    if ((r1 + g1 + b1) < 100) { r1 += 60; g1 += 40; b1 += 90; }
                    if ((r2 + g2 + b2) < 100) { r2 += 90; g2 += 50; b2 += 40; }

                    document.documentElement.style.setProperty('--gradient-color-1', `rgb(${r1}, ${g1}, ${b1})`);
                    document.documentElement.style.setProperty('--gradient-color-2', `rgb(${r2}, ${g2}, ${b2})`);
                } catch (e) {
                    console.error("Erreur d'analyse pour l'arrière-plan :", e);
                }
            };
        }

        async function updateNowPlaying() {
            if (!currentToken) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player?additional_types=track,episode', { headers: { 'Authorization': 'Bearer ' + currentToken } });
                if (response.status === 204 || response.status === 401) {
                    isCurrentlyPlaying = false;
                    return;
                }
                const data = await response.json();

                if (data && data.item) {
                    const isEpisode = data.currently_playing_type === 'episode';
                    trackDurationMs = data.item.duration_ms;

                    if (isEpisode) {
                        // --- ÉPISODE DE PODCAST ---
                        document.getElementById('track-title').innerText = data.item.name;
                        document.getElementById('track-artist').innerText = data.item.show ? data.item.show.name : "Podcast";
                    } else {
                        // --- MORCEAU DE MUSIQUE ---
                        document.getElementById('track-title').innerText = data.item.name;
                        document.getElementById('track-artist').innerText = data.item.artists.map(a => a.name).join(", ");
                    }

                    // Resynchronise la progression réelle avec celle de Spotify (corrige toute dérive locale)
                    currentProgressMs = data.progress_ms;
                    isCurrentlyPlaying = data.is_playing;

                    document.getElementById('time-current').innerText = formatTime(data.progress_ms);
                    document.getElementById('time-max').innerText = formatTime(trackDurationMs);
                    const progressPercent = (data.progress_ms / trackDurationMs) * 100;
                    document.getElementById('progress-fill').style.width = `${progressPercent}%`;

                    const art = document.getElementById('track-art');
                    const oldSrc = art.src;
                    // La pochette d'un épisode est directement sur .images, celle d'un morceau est sous .album.images
                    const images = isEpisode ? data.item.images : (data.item.album ? data.item.album.images : null);
                    art.src = images && images.length > 0 ? images[0].url : "";
                    art.style.display = "block";
                    document.getElementById('play-pause-btn').innerText = data.is_playing ? "⏸" : "▶️";

                    if (!isEpisode) {
                        highlightLyrics(data.progress_ms / 1000);
                    }

                    if (art.src !== oldSrc) {
                        art.onload = () => updateDynamicBackground();
                    }

                    if (data.item.id !== lastTrackId) {
                        lastTrackId = data.item.id;
                        if (isEpisode) {
                            // On cible lyrics-content (comme le fait fetchLyrics), PAS lyrics-container,
                            // pour ne jamais détruire la structure DOM que fetchLyrics attend de retrouver
                            currentLyrics = [];
                            const lyricsContent = document.getElementById('lyrics-content');
                            if (lyricsContent) {
                                lyricsContent.innerHTML = "<p style='text-align:center; color:var(--text-grey); font-size:0.85rem;'>Paroles indisponibles pour les podcasts.</p>";
                            }
                        } else {
                            fetchLyrics(data.item.artists[0].name, data.item.name, data.item.album.name, data.item.duration_ms / 1000);
                            checkIfTrackIsLiked(data.item.id);
                        }
                    }
                }
            } catch (e) {}
        }

        // Fait avancer la barre de progression et le chrono chaque seconde, SANS appeler l'API.
        // La vraie valeur est resynchronisée par updateNowPlaying() toutes les 3s.
        function tickLocalProgress() {
            if (!isCurrentlyPlaying || trackDurationMs === 0) return;

            currentProgressMs += 1000;
            if (currentProgressMs > trackDurationMs) currentProgressMs = trackDurationMs;

            const progressPercent = (currentProgressMs / trackDurationMs) * 100;
            const fillEl = document.getElementById('progress-fill');
            const timeEl = document.getElementById('time-current');
            if (fillEl) fillEl.style.width = `${progressPercent}%`;
            if (timeEl) timeEl.innerText = formatTime(currentProgressMs);

            highlightLyrics(currentProgressMs / 1000);
        }
        localProgressInterval = setInterval(tickLocalProgress, 1000);

     async function togglePlay() {
    if (!currentToken) return;

    try {
        // 1. On demande l'état actuel du lecteur
        const res = await fetch('https://api.spotify.com/v1/me/player', { 
            headers: { 'Authorization': 'Bearer ' + currentToken } 
        });
        
        if (res.status === 204) {
            return alert("Activez d'abord votre lecteur Spotify.");
        }
        
        const playback = await res.json();
        
        // 2. Si 'is_playing' est vrai, on veut faire 'pause'. Sinon, on veut faire 'play'.
        const endpoint = playback.is_playing ? 'pause' : 'play';
        
        // 3. Envoi de la commande avec la syntaxe exacte acceptée par votre environnement
        await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, { 
            method: 'PUT', 
            headers: { 'Authorization': 'Bearer ' + currentToken } 
        });
        
        // Rafraîchit l'affichage du bouton (▶️ ou ⏸) juste après
        setTimeout(updateNowPlaying, 500);
        
    } catch (e) { 
        console.error("Erreur Play/Pause :", e); 
    }
}
        async function nextTrack() { 
            if (!currentToken) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/next', { 
                    method: 'POST', 
                    headers: { 'Authorization': 'Bearer ' + currentToken } 
                }); 
                if (response.status === 404) {
                    alert("Aucun appareil actif trouvé. Lancez Spotify sur votre appareil.");
                } else {
                    setTimeout(updateNowPlaying, 600); 
                }
            } catch (e) { console.error(e); }
        }
        
        async function previousTrack() { 
            if (!currentToken) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/previous', { 
                    method: 'POST', 
                    headers: { 'Authorization': 'Bearer ' + currentToken } 
                }); 
                if (response.status === 404) {
                    alert("Aucun appareil actif trouvé. Lancez Spotify sur votre appareil.");
                } else {
                    setTimeout(updateNowPlaying, 600); 
                }
            } catch (e) { console.error(e); }
        }

        function generateCodeVerifier(l) { let t = ''; let p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for (let i = 0; i < l; i++) t += p.charAt(Math.floor(Math.random() * p.length)); return t; }
        async function generateCodeChallenge(v) { const d = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); return btoa(String.fromCharCode.apply(null, new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

        setInterval(updateNowPlaying, 3000);
        
        async function getRecentlyPlayed() {
            document.getElementById('profile-card-zone').style.display = 'none'; 
            if (!currentToken) return;
            
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.dataset.view = '';
            resultsContainer.dataset.topTracksOpen = '';
            stopQueueAutoRefresh();
            resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de l'historique...</p>";

            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
                    headers: { 'Authorization': 'Bearer ' + currentToken }
                });
                const data = await response.json();
                resultsContainer.innerHTML = "";

                if (data.items && data.items.length > 0) {
                    recentItems = data.items; 
                    displayedRecentCount = 10; 
                    renderRecentPlayedSection(); 
                } else {
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Aucun historique trouvé.</p>";
                }
            } catch (e) {
                console.error(e);
                resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur d'historique.</p>";
            }
        }

        function renderRecentPlayedSection() {
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = "";

            const titleHeader = document.createElement('p');
            titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
            titleHeader.innerText = "ÉCOUTES RÉCENTES";
            resultsContainer.appendChild(titleHeader);

            const itemsToDisplay = recentItems.slice(0, displayedRecentCount);

            itemsToDisplay.forEach((itemData) => {
                const track = itemData.track;
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${track.album.images && track.album.images.length > 2 ? track.album.images[2].url : 'https://via.placeholder.com/30'}" alt="">
                    <div>
                        <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.name}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-grey);">${track.artists[0].name}</span>
                    </div>
                `;
                item.onclick = () => { playTrack(track.uri); };
                item.appendChild(buildQueueButton(track.uri));
                resultsContainer.appendChild(item);
            });

            if (recentItems.length > displayedRecentCount) {
                const moreBtn = createMoreButton(() => {
                    displayedRecentCount += 10; 
                    renderRecentPlayedSection(); 
                });
                resultsContainer.appendChild(moreBtn);
            }
        }
// ==========================================
// TOP TITRES — bouton 🪩 (classement Last.fm France + résolution Spotify)
// ==========================================
const LASTFM_API_KEY = "2f76b9d833b38b85b1ec9f9741703e7a";

async function toggleTopTracks() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const plContainer = document.getElementById('playlist-container');
    if (plContainer) { plContainer.style.display = 'none'; plContainer.innerHTML = ''; }

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.dataset.view = '';
    stopQueueAutoRefresh();

    if (resultsContainer.dataset.topTracksOpen === 'true') {
        resultsContainer.innerHTML = '';
        resultsContainer.dataset.topTracksOpen = '';
        return;
    }

    resultsContainer.dataset.topTracksOpen = 'true';
    await fetchTopTracks();
}

// Récupère le classement France depuis Last.fm (titre + artiste, pas d'URI Spotify)
async function fetchTopTracks() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement du Top titres...</p>";

    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=geo.gettoptracks&country=france&api_key=${LASTFM_API_KEY}&format=json&limit=50`;
        const response = await fetch(url);
        const data = await response.json();
        resultsContainer.innerHTML = "";

        if (data.tracks && data.tracks.track && data.tracks.track.length > 0) {
            // On stocke les données brutes Last.fm + un cache pour la résolution Spotify (rempli au fur et à mesure)
            recommendedItems = data.tracks.track.map(t => ({
                lastfmName: t.name,
                lastfmArtist: t.artist && t.artist.name ? t.artist.name : '',
                spotifyUri: null,
                spotifyImage: null,
                resolved: false,
                notFound: false
            }));
            displayedRecommendedCount = 10;
            renderTopTracksSection();
        } else {
            resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Impossible de charger le Top titres.</p>";
        }
    } catch (e) {
        console.error(e);
        resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement du Top titres (Last.fm).</p>";
    }
}

// Cherche le titre correspondant sur Spotify pour récupérer son URI et sa pochette
// File d'attente : garantit qu'une seule recherche Spotify est envoyée à la fois,
// avec un léger espacement entre chacune, pour ne jamais déclencher de rate limit (429)
// même quand on clique plusieurs fois rapidement sur "Afficher plus".
let resolveQueue = [];
let isProcessingResolveQueue = false;

function enqueueResolve(entry, onDone) {
    resolveQueue.push({ entry, onDone });
    if (!isProcessingResolveQueue) {
        processResolveQueue();
    }
}

async function processResolveQueue() {
    isProcessingResolveQueue = true;
    while (resolveQueue.length > 0) {
        const { entry, onDone } = resolveQueue.shift();
        await resolveTrackOnSpotify(entry);
        onDone();
        await new Promise(resolve => setTimeout(resolve, 150)); // espacement entre deux recherches
    }
    isProcessingResolveQueue = false;
}

async function resolveTrackOnSpotify(entry, attempt = 1) {
    if (!currentToken || entry.resolved) return;
    const MAX_ATTEMPTS = 3;

    try {
        // Les valeurs doivent être entre guillemets, sinon Spotify ne comprend que le 1er mot
        // comme faisant partie du champ track:/artist: (cause principale des faux "introuvable")
        const escapedName = entry.lastfmName.replace(/"/g, '\\"');
        const escapedArtist = entry.lastfmArtist.replace(/"/g, '\\"');
        const query = encodeURIComponent(`track:"${escapedName}" artist:"${escapedArtist}"`);
        const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        // Erreur temporaire (rate limit, token expiré, souci serveur) : ne PAS marquer "introuvable",
        // on réessaie après un court délai plutôt que de conclure trop vite.
        if (!response.ok) {
            if (attempt < MAX_ATTEMPTS) {
                const retryAfterHeader = response.headers.get('Retry-After');
                const waitMs = retryAfterHeader ? (parseInt(retryAfterHeader, 10) * 1000) : (attempt * 800);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                return resolveTrackOnSpotify(entry, attempt + 1);
            }
            // Après plusieurs échecs répétés, on abandonne pour ce titre (mais ce n'est pas garanti "introuvable")
            entry.notFound = true;
            entry.resolved = true;
            return;
        }

        const data = await response.json();
        const track = data.tracks && data.tracks.items && data.tracks.items.length > 0 ? data.tracks.items[0] : null;

        if (track) {
            entry.spotifyUri = track.uri;
            entry.spotifyImage = track.album && track.album.images && track.album.images.length > 2 ? track.album.images[2].url : (track.album && track.album.images && track.album.images.length > 0 ? track.album.images[0].url : '');
            entry.resolved = true;
            return;
        }

        // Rien trouvé avec la recherche stricte (champs track:/artist:) : on retente en repli
        // avec une recherche libre, plus tolérante aux variations de titre (Remastered, feat., etc.)
        const fallbackQuery = encodeURIComponent(`${entry.lastfmName} ${entry.lastfmArtist}`);
        const fallbackResponse = await fetch(`https://api.spotify.com/v1/search?q=${fallbackQuery}&type=track&limit=1`, {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackTrack = fallbackData.tracks && fallbackData.tracks.items && fallbackData.tracks.items.length > 0 ? fallbackData.tracks.items[0] : null;
            if (fallbackTrack) {
                entry.spotifyUri = fallbackTrack.uri;
                entry.spotifyImage = fallbackTrack.album && fallbackTrack.album.images && fallbackTrack.album.images.length > 2 ? fallbackTrack.album.images[2].url : (fallbackTrack.album && fallbackTrack.album.images && fallbackTrack.album.images.length > 0 ? fallbackTrack.album.images[0].url : '');
                entry.resolved = true;
                return;
            }
        }

        // Aucune des deux recherches n'a rien donné : là, c'est un vrai "introuvable"
        entry.notFound = true;
        entry.resolved = true;
    } catch (e) {
        // Erreur réseau (pas une réponse HTTP) : on réessaie aussi avant d'abandonner
        if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, attempt * 800));
            return resolveTrackOnSpotify(entry, attempt + 1);
        }
        console.error(e);
        entry.notFound = true;
        entry.resolved = true;
    }
}

function renderTopTracksSection() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "";
    resultsContainer.style.textAlign = 'left';

    const titleHeader = document.createElement('p');
    titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
    titleHeader.innerText = "TOP TITRES FRANCE";
    resultsContainer.appendChild(titleHeader);

    const itemsToDisplay = recommendedItems.slice(0, displayedRecommendedCount);

    // Les URIs déjà résolus servent à construire l'ordre de lecture "playTrackList"
    const buildResolvedUris = () => recommendedItems.filter(e => e.spotifyUri).map(e => e.spotifyUri);

    itemsToDisplay.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.dataset.lastfmName = entry.lastfmName;

        const imgUrl = entry.spotifyImage || 'https://via.placeholder.com/30';
        item.innerHTML = `
            <img src="${imgUrl}" alt="">
            <div>
                <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.lastfmName}</strong>
                <span style="font-size: 0.8rem; color: var(--text-grey);">${entry.lastfmArtist}${entry.resolved && entry.notFound ? ' — indisponible sur Spotify' : (!entry.resolved ? ' — recherche...' : '')}</span>
            </div>
        `;

        if (entry.resolved && entry.spotifyUri) {
            item.onclick = () => {
                const uris = buildResolvedUris();
                const index = uris.indexOf(entry.spotifyUri);
                playTrackList(uris, index >= 0 ? index : 0);
            };
            item.appendChild(buildQueueButton(entry.spotifyUri));
        } else if (entry.resolved && entry.notFound) {
            item.style.opacity = '0.5';
            item.style.cursor = 'default';
        }

        resultsContainer.appendChild(item);

        // Résolution mise en file d'attente (une seule requête Spotify à la fois, jamais en rafale)
        if (!entry.resolved && !entry.queued) {
            entry.queued = true;
            enqueueResolve(entry, () => {
                // On ne redessine que si le panneau Top Titres est toujours ouvert
                if (resultsContainer.dataset.topTracksOpen === 'true') {
                    renderTopTracksSection();
                }
            });
        }
    });

    if (recommendedItems.length > displayedRecommendedCount) {
        const moreBtn = createMoreButton(() => {
            displayedRecommendedCount += 10;
            renderTopTracksSection();
        });
        resultsContainer.appendChild(moreBtn);
    }
}

// ==========================================
// PARAMÈTRES — bouton ⚙️ (activer/désactiver le spectre audio animé)
// ==========================================
let spectrumEnabled = localStorage.getItem('spectrumEnabled') === 'true'; // désactivé par défaut
let autoScrollLyricsEnabled = localStorage.getItem('autoScrollLyricsEnabled') !== 'false'; // activé par défaut
let discoBallEnabled = localStorage.getItem('discoBallEnabled') === 'true'; // désactivé par défaut

function toggleSettings() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    resultsContainer.dataset.view = '';
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();
    const plContainer = document.getElementById('playlist-container');
    if (plContainer) { plContainer.style.display = 'none'; plContainer.innerHTML = ''; }

    const settingsZone = document.getElementById('settings-zone');
    if (settingsZone.style.display === 'none' || settingsZone.style.display === '') {
        settingsZone.style.display = 'flex';
        const toggle = document.getElementById('spectrum-toggle');
        if (toggle) toggle.checked = spectrumEnabled;
        const scrollToggle = document.getElementById('autoscroll-lyrics-toggle');
        if (scrollToggle) scrollToggle.checked = autoScrollLyricsEnabled;
        const discoToggle = document.getElementById('discoball-toggle');
        if (discoToggle) discoToggle.checked = discoBallEnabled;
        const popperToggle = document.getElementById('party-popper-toggle');
        if (popperToggle) popperToggle.checked = partyPopperEnabled;
    } else {
        settingsZone.style.display = 'none';
    }
}

function toggleSpectrumSetting(checked) {
    spectrumEnabled = checked;
    localStorage.setItem('spectrumEnabled', checked ? 'true' : 'false');
}

function toggleAutoScrollLyricsSetting(checked) {
    autoScrollLyricsEnabled = checked;
    localStorage.setItem('autoScrollLyricsEnabled', checked ? 'true' : 'false');
}

// Injecte le style de la boule à facettes directement en JS — fonctionne même si le
// fichier CSS séparé n'a pas été correctement copié dans la page.
// La boule elle-même reste totalement fixe (aucune rotation) : seuls les rayons
// lumineux qui l'entourent tournent, via un dégradé conique animé en arrière-plan.
function injectDiscoBallStyles() {
    // On retire toute ancienne version du style (au cas où l'ancien CSS externe traîne encore)
    const oldStyle = document.getElementById('disco-ball-inline-style');
    if (oldStyle) oldStyle.remove();

    const styleTag = document.createElement('style');
    styleTag.id = 'disco-ball-inline-style';
    styleTag.textContent = `
        #disco-ball-wrapper {
            position: fixed !important;
            /* clamp(min, valeur fluide en vw, max) : remonte davantage sur grand écran (tablette),
               reste raisonnable sur petit écran (téléphone) pour ne pas disparaître complètement */
            top: clamp(-70px, -9vw, -42px) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: clamp(140px, 30vw, 230px) !important;
            height: clamp(140px, 30vw, 230px) !important;
            z-index: 500 !important;
            pointer-events: none !important;
        }
        /* Les rayons sont un élément TOTALEMENT séparé de la boule : ils tournent seuls,
           la boule (#disco-ball plus bas) ne fait partie d'aucune animation. */
        #disco-ball-rays {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            width: clamp(320px, 75vw, 560px) !important;
            height: clamp(320px, 75vw, 560px) !important;
            transform: translate(-50%, -50%) rotate(0deg); /* PAS de !important ici : bloquerait l'animation */
            border-radius: 50% !important;
            background: conic-gradient(
                from 0deg,
                transparent 0deg,   rgba(255,255,255,0.6) 8deg,   transparent 18deg,
                transparent 45deg,  rgba(255,255,255,0.6) 53deg,  transparent 63deg,
                transparent 90deg,  rgba(255,255,255,0.6) 98deg,  transparent 108deg,
                transparent 135deg, rgba(255,255,255,0.6) 143deg, transparent 153deg,
                transparent 180deg, rgba(255,255,255,0.6) 188deg, transparent 198deg,
                transparent 225deg, rgba(255,255,255,0.6) 233deg, transparent 243deg,
                transparent 270deg, rgba(255,255,255,0.6) 278deg, transparent 288deg,
                transparent 315deg, rgba(255,255,255,0.6) 323deg, transparent 333deg,
                transparent 360deg
            ) !important;
            filter: blur(3px) !important;
            animation: disco-rays-spin 4s linear infinite !important;
        }
        #disco-ball {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important; /* fixe : aucune rotation, aucun mouvement */
            font-size: clamp(5.5rem, 15vw, 9.5rem) !important;
            line-height: 1 !important;
            animation: none !important; /* neutralise toute ancienne animation résiduelle */
        }
        @keyframes disco-rays-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
    `;
    document.head.appendChild(styleTag);
}
injectDiscoBallStyles();

function toggleDiscoBallSetting(checked) {
    discoBallEnabled = checked;
    localStorage.setItem('discoBallEnabled', checked ? 'true' : 'false');
    ensureDiscoBallElement();
    const wrapper = document.getElementById('disco-ball-wrapper');
    if (wrapper) wrapper.style.display = checked ? 'block' : 'none';
}

// Crée la structure (boule fixe + rayons animés séparés) si elle n'existe pas déjà
function ensureDiscoBallElement() {
    let wrapper = document.getElementById('disco-ball-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'disco-ball-wrapper';
        wrapper.style.display = 'none';

        const rays = document.createElement('div');
        rays.id = 'disco-ball-rays';
        wrapper.appendChild(rays);

        const ball = document.createElement('div');
        ball.id = 'disco-ball';
        ball.innerText = '🪩';
        wrapper.appendChild(ball);

        document.body.appendChild(wrapper);
    }
    return wrapper;
}

// Applique l'état sauvegardé au chargement (utile si la page est ouverte alors que le token est déjà valide)
function initDiscoBallState() {
    const wrapper = ensureDiscoBallElement();
    wrapper.style.display = discoBallEnabled ? 'block' : 'none';
}

// ==========================================
// BOUTON PÉTARD 🎉 — réglage désactivé par défaut, bouton fixe qui lance une animation d'envol au clic
// ==========================================
let partyPopperEnabled = localStorage.getItem('partyPopperEnabled') === 'true'; // désactivé par défaut

function injectPartyPopperStyles() {
    if (document.getElementById('party-popper-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'party-popper-inline-style';
    styleTag.textContent = `
        #party-popper-btn {
            position: fixed !important;
            left: 16px !important;
            bottom: 16px !important;
            width: 60px !important;
            height: 60px !important;
            border-radius: 50% !important;
            background: rgba(0,0,0,0.55) !important;
            border: none !important;
            font-size: 1.8rem !important;
            display: none; /* PAS de !important : sinon le JS ne peut jamais le cacher par défaut */
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 500 !important;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4) !important;
            transition: transform 0.15s ease !important;
        }
        #party-popper-btn.pressed {
            transform: scale(0.82) !important;
        }
        .party-popper-particle {
            position: fixed !important;
            left: 46px !important;
            bottom: 46px !important;
            font-size: 1.4rem !important;
            pointer-events: none !important;
            z-index: 501 !important;
            animation: party-popper-fly 1.3s cubic-bezier(0.25, 0.75, 0.4, 1) forwards;
        }
        @keyframes party-popper-fly {
            0% {
                transform: translate(0, 0) rotate(0deg) scale(0.4);
                opacity: 0;
            }
            12% {
                transform: translate(calc(var(--party-mid-x)), calc(var(--party-mid-y))) rotate(120deg) scale(1.15);
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                transform: var(--party-end-transform);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleTag);
}
injectPartyPopperStyles();

function ensurePartyPopperButton() {
    let btn = document.getElementById('party-popper-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'party-popper-btn';
        btn.innerText = '🎉';
        btn.title = "Lancer un petit feu d'artifice";
        btn.style.display = 'none';
        btn.onclick = launchPartyPopper;
        document.body.appendChild(btn);
    }
    return btn;
}

function togglePartyPopperSetting(checked) {
    partyPopperEnabled = checked;
    localStorage.setItem('partyPopperEnabled', checked ? 'true' : 'false');
    const btn = ensurePartyPopperButton();
    btn.style.display = checked ? 'flex' : 'none';
}

function initPartyPopperState() {
    const btn = ensurePartyPopperButton();
    btn.style.display = partyPopperEnabled ? 'flex' : 'none';
}

// Lance une volée de particules qui s'envolent depuis le bouton, façon feu d'artifice/confettis
function launchPartyPopper() {
    // Petit effet d'appui visuel sur le bouton au clic
    const btn = document.getElementById('party-popper-btn');
    if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
    }

    const emojis = ['🎉', '✨', '🎊', '⭐'];
    const particleCount = 22;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'party-popper-particle';
        particle.innerText = emojis[Math.floor(Math.random() * emojis.length)];

        // Direction aléatoire vers le haut (angle entre -70° et -110°, donc globalement vers le ciel)
        const angleDeg = -90 + (Math.random() * 80 - 40);
        const angleRad = angleDeg * (Math.PI / 180);
        const distance = 150 + Math.random() * 220;
        const x = Math.cos(angleRad) * distance;
        const y = Math.sin(angleRad) * distance;
        const rotation = Math.random() * 720 - 360;

        // Point intermédiaire (12% du trajet) : donne un léger effet de "jaillissement" avant l'envol
        const midX = x * 0.15;
        const midY = y * 0.15;

        particle.style.setProperty('--party-mid-x', `${midX}px`);
        particle.style.setProperty('--party-mid-y', `${midY}px`);
        particle.style.setProperty('--party-end-transform', `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(0.6)`);
        particle.style.animationDelay = `${Math.random() * 0.15}s`;

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1600);
    }
}

// ==========================================
// COMMANDE VOCALE — SpeechRecognition native du navigateur
// ==========================================
let voiceRecognition = null;
let isListeningVoiceCommand = false;

function injectVoiceCommandStyles() {
    if (document.getElementById('voice-command-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'voice-command-inline-style';
    styleTag.textContent = `
        #voice-command-btn.listening {
            animation: voice-command-pulse 1s ease-in-out infinite;
        }
        @keyframes voice-command-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(29,185,84,0.6); }
            70%  { box-shadow: 0 0 0 14px rgba(29,185,84,0); }
            100% { box-shadow: 0 0 0 0 rgba(29,185,84,0); }
        }
    `;
    document.head.appendChild(styleTag);
}
injectVoiceCommandStyles();

function initVoiceCommand() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
        console.warn("SpeechRecognition non supportee par ce navigateur.");
        return;
    }
    voiceRecognition = new SpeechRecognitionAPI();
    voiceRecognition.lang = 'fr-FR';
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = false;
    voiceRecognition.maxAlternatives = 1;

    voiceRecognition.onstart = () => {
        isListeningVoiceCommand = true;
        const btn = document.getElementById('voice-command-btn');
        if (btn) btn.classList.add('listening');
    };
    voiceRecognition.onend = () => {
        isListeningVoiceCommand = false;
        const btn = document.getElementById('voice-command-btn');
        if (btn) btn.classList.remove('listening');
    };
    voiceRecognition.onerror = (event) => {
        console.error("Erreur reconnaissance vocale :", event.error);
        isListeningVoiceCommand = false;
        const btn = document.getElementById('voice-command-btn');
        if (btn) btn.classList.remove('listening');
    };
    voiceRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
    };
}

function toggleVoiceCommand() {
    if (!voiceRecognition) {
        alert("La commande vocale n'est pas supportee par ce navigateur.");
        return;
    }
    if (isListeningVoiceCommand) {
        voiceRecognition.stop();
    } else {
        voiceRecognition.start();
    }
}

function handleVoiceCommand(rawText) {
    const text = rawText.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');

    function feedback(msg) {
        if (resultsContainer) {
            resultsContainer.dataset.view = '';
            resultsContainer.dataset.topTracksOpen = '';
            resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--spotify-green); margin:5px;'>Commande : " + rawText + " -> " + msg + "</p>";
        }
    }

    if (/(chanson|titre|piste)?\s*suivant[e]?/.test(text) || text.indexOf('next') !== -1) {
        nextTrack();
        feedback("titre suivant");
        return;
    }
    if (/(chanson|titre|piste)?\s*pr[ée]c[ée]dent[e]?/.test(text)) {
        previousTrack();
        feedback("titre precedent");
        return;
    }
    if (/pause|mets? en pause|arr[êe]te/.test(text)) {
        togglePlay();
        feedback("mise en pause");
        return;
    }
    if (text === 'joue' || text === 'reprends' || text === 'lecture' || text === 'play') {
        togglePlay();
        feedback("reprise de la lecture");
        return;
    }
    if (/(monte|augmente)\s+(le\s+)?volume/.test(text)) {
        const slider = document.getElementById('volume-slider');
        const newVal = slider ? Math.min(100, parseInt(slider.value, 10) + 15) : 70;
        changeVolume(newVal);
        if (slider) slider.value = newVal;
        feedback("volume augmente");
        return;
    }
    if (/(baisse|diminue)\s+(le\s+)?volume/.test(text)) {
        const slider = document.getElementById('volume-slider');
        const newVal = slider ? Math.max(0, parseInt(slider.value, 10) - 15) : 30;
        changeVolume(newVal);
        if (slider) slider.value = newVal;
        feedback("volume baisse");
        return;
    }
    if (/coupe le son|mute|silence/.test(text)) {
        changeVolume(0);
        const slider = document.getElementById('volume-slider');
        if (slider) slider.value = 0;
        feedback("son coupe");
        return;
    }
    if (/j'aime|like|ajoute.*favoris/.test(text)) {
        toggleLikeCurrentTrack();
        feedback("ajoute aux favoris");
        return;
    }
    if (/playlists?|mes playlists/.test(text)) {
        togglePlaylistsView();
        feedback("ouverture des playlists");
        return;
    }
    if (text.indexOf("file d'attente") !== -1) {
        toggleQueue();
        feedback("ouverture de la file d'attente");
        return;
    }

    let playMatch = text.match(/^joue\s+(.+)$/);
    if (!playMatch) playMatch = text.match(/^mets?\s+(?:de la musique de\s+|du\s+)?(.+)$/);
    if (playMatch && playMatch[1]) {
        const query = playMatch[1].trim();
        document.getElementById('search-input').value = query;
        feedback("recherche de " + query + "...");
        searchAndPlayFirstResult(query);
        return;
    }

    const searchMatch = text.match(/^(recherche|cherche)\s+(.+)$/);
    if (searchMatch && searchMatch[2]) {
        document.getElementById('search-input').value = searchMatch[2].trim();
        searchTrack();
        feedback("resultats pour " + searchMatch[2].trim());
        return;
    }

    feedback("commande non reconnue");
}

async function searchAndPlayFirstResult(query) {
    if (!currentToken) return;
    try {
        const response = await fetch('https://api.spotify.com/v1/search?q=' + encodeURIComponent(query) + '&type=track&limit=1', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const data = await response.json();
        const track = data.tracks && data.tracks.items && data.tracks.items.length > 0 ? data.tracks.items[0] : null;
        if (track) {
            playTrack(track.uri);
        } else {
            const resultsContainer = document.getElementById('search-results');
            if (resultsContainer) resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Aucun resultat pour " + query + ".</p>";
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// SPECTRE AUDIO ANIMÉ (décoratif — voir explication : pas de vraie analyse
// audio possible via l'API Spotify, le flux étant protégé par DRM)
// ==========================================
let spectrumBars = [];
let spectrumAnimId = null;

function initSpectrum() {
    const canvas = document.getElementById('audio-spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const barCount = 48;

    spectrumBars = Array.from({ length: barCount }, () => ({
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.035,
        current: 0.04 // hauteur de départ = petit état plat
    }));

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function draw() {
        spectrumAnimId = requestAnimationFrame(draw);

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Si l'interrupteur est désactivé : RIEN à l'écran, on s'arrête là.
        // (distinct du cas "actif mais en pause" qui garde un petit état plat, voir plus bas)
        if (!spectrumEnabled) {
            spectrumBars.forEach(bar => { bar.current = 0.04; }); // réinitialise pour un redémarrage propre
            return;
        }

        // Actif seulement si l'interrupteur est activé ET qu'un titre est en cours de lecture
        const active = spectrumEnabled && isCurrentlyPlaying;
        const barWidth = w / spectrumBars.length;

        spectrumBars.forEach((bar, i) => {
            bar.phase += bar.speed;

            // Cible : grande amplitude si actif, sinon quasi plat (petit état, uniquement en pause)
            const targetAmplitude = active
                ? (0.25 + 0.75 * Math.abs(Math.sin(bar.phase)))
                : 0.04;

            // Lissage : la barre "monte et descend" progressivement vers sa cible,
            // ça évite les à-coups quand on met en pause/lecture ou qu'on bascule le réglage
            bar.current += (targetAmplitude - bar.current) * 0.08;

            const barHeight = Math.max(2, bar.current * h);
            const hue = 140 + (i / spectrumBars.length) * 220; // dégradé vert → bleu → rose → orange

            const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
            gradient.addColorStop(0, `hsl(${hue}, 90%, 45%)`);
            gradient.addColorStop(1, `hsl(${hue}, 90%, 70%)`);
            ctx.fillStyle = gradient;

            const x = i * barWidth;
            const gap = barWidth * 0.15;
            ctx.fillRect(x + gap, h - barHeight, barWidth - gap * 2, barHeight);
        });
    }
    draw();
}

// Fonction pour afficher/masquer la barre de volume
function toggleVolumeControl() {
    // On ferme les autres panneaux pour éviter les superpositions
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "";
    resultsContainer.dataset.view = '';
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();

    const volumeZone = document.getElementById('volume-control-zone');
    if (volumeZone.style.display === 'none' || volumeZone.style.display === '') {
        volumeZone.style.display = 'flex';
    } else {
        volumeZone.style.display = 'none';
    }
}

// Met à jour l'icône selon le niveau (dégradé 3 états)
function updateVolumeIcon(value) {
    const icon = document.getElementById('volume-icon');
    if (!icon) return;

    if (value == 0) {
        icon.innerText = "🔇";
    } else if (value < 50) {
        icon.innerText = "🔉";
    } else {
        icon.innerText = "🔊";
    }
}

// Fonction principale du volume liée à ton slider range
async function changeVolume(value) {
    const percentLabel = document.getElementById('volume-percent');
    if (percentLabel) percentLabel.innerText = value + '%';
    updateVolumeIcon(value);
    updateVolumeTrack(value);

    if (!currentToken) {
        console.error("Aucun jeton de connexion (currentToken) trouvé.");
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${value}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });

        if (response.status === 403) {
            console.warn("⚠️ Statut 403 : Spotify refuse le contrôle du volume sur cet appareil (ex: Web Player ou restrictions de compte).");
        } else if (response.status === 404) {
            console.warn("⚠️ Statut 404 : Aucun appareil actif trouvé pour modifier le volume.");
        } else if (response.ok) {
            console.log(`✅ Volume réglé sur ${value}%`);
        } else {
            console.error("❌ Erreur API Spotify (Statut):", response.status);
        }
    } catch (error) {
        console.error("🚨 Erreur réseau ou JS :", error);
    }
}
function updateVolumeTrack(value) {
    const slider = document.getElementById('volume-slider');
    if (!slider) return;
    slider.style.background = `linear-gradient(to right, #1DB954 0%, #1DB954 ${value}%, #4d4d4d ${value}%, #4d4d4d 100%)`;
}
// 1. Liaison avec l'ID du bouton (comme demandé pour le profil)
const deviceBtn = document.getElementById('device-toggle-btn');

// 2. Afficher/Masquer la zone et charger les appareils

async function toggleDeviceSelector() {
    // On cache le volume et le profil
    document.getElementById('volume-control-zone').style.display = 'none';
    document.getElementById('profile-card-zone').style.display = 'none';
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "";
    resultsContainer.dataset.view = '';
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();

    const deviceZone = document.getElementById('device-control-zone');
    if (deviceZone.style.display === 'none' || deviceZone.style.display === '') {
        deviceZone.style.display = 'flex';
        await fetchAvailableDevices(); // Appel de la fonction de récupération
    } else {
        deviceZone.style.display = 'none';
    }
}

// 3. Récupérer les appareils depuis Spotify
  async function fetchAvailableDevices() {
    const select = document.getElementById('device-select');
          const container = document.getElementById('device-list-container');
    if (!container) return;
    if (!currentToken) return;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 
                'Authorization': 'Bearer ' + currentToken
            }
        });
        
        if (!response.ok) throw new Error(`Erreur Spotify: ${response.status}`);

        const data = await response.json();
        container.innerHTML = ''; // On vide la liste précédente

        if (data.devices && data.devices.length > 0) {
            data.devices.forEach(device => {
                // Création d'un bouton pour chaque appareil
                const deviceButton = document.createElement('button');
                
                // Style du bouton (adapter le design à ta charte Spotify)
                deviceButton.style.width = '100%';
                deviceButton.style.padding = '10px 12px';
                deviceButton.style.background = device.is_active ? 'rgba(29, 185, 84, 0.2)' : '#282828';
                deviceButton.style.color = device.is_active ? '#1db954' : '#ffffff';
                deviceButton.style.border = device.is_active ? '1px solid #1db954' : 'none';
                deviceButton.style.borderRadius = '8px';
                deviceButton.style.textAlign = 'left';
                deviceButton.style.fontSize = '0.9rem';
                deviceButton.style.cursor = 'pointer';
                deviceButton.style.display = 'flex';
                deviceButton.style.justifyContent = 'space-between';
                deviceButton.style.alignItems = 'center';

                // Contenu : Nom de l'appareil + icône s'il est actif
                deviceButton.innerHTML = `
                    <span>📱 ${device.name}</span>
                    ${device.is_active ? '<span style="font-size: 0.8rem;">● Actif</span>' : ''}
                `;

                // Événement : au clic, on bascule la lecture sur cet appareil !
                deviceButton.onclick = () => switchDevice(device.id);

                container.appendChild(deviceButton);
            });
        } else {
            container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-grey); text-align: center; margin: 5px 0;">Aucun appareil actif trouvé. Lance Spotify sur ton téléphone !</p>';
        }
    } catch (error) {
        console.error("Erreur appareils :", error);
        container.innerHTML = '<p style="font-size: 0.8rem; color: #ff5555; text-align: center;">Erreur de chargement</p>';
    }
}
async function switchDevice(deviceId) {
    if (!deviceId || !currentToken) return;

    try {
        await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + currentToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ device_ids: [deviceId], play: true })
        });
        
        console.log("✅ Lecture transférée avec succès !");

        // 🔄 Rafraîchissement automatique de la liste après 500ms
        // Le petit délai laisse le temps à Spotify d'enregistrer le changement
        setTimeout(async () => {
            await fetchAvailableDevices();
        }, 500);

    } catch (error) {
        console.error("Erreur lors du transfert :", error);
    }
}
// 1. FONCTION POUR VÉRIFIER SI LE MORCEAU EST DÉJÀ LIKÉ
// --- VÉRIFICATION (GET) SUR LA BIBLIOTHÈQUE ---
async function checkIfTrackIsLiked(trackId) {
    if (!trackId || !currentToken) return;

    try {
        const url = `https://api.spotify.com/v1/me/library/contains?uris=spotify:track:${trackId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const [isLiked] = await response.json();

        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
            likeBtn.innerText = isLiked ? "❤️" : "🤍";
            likeBtn.setAttribute('data-liked', isLiked);
        }
    } catch (error) {
        console.error("Erreur de détection :", error);
    }
}

// --- ACTION AU CLIC : PUT (ENREGISTRER) OU DELETE (SUPPRIMER) ---
async function toggleLikeCurrentTrack() {
    if (!currentToken || !lastTrackId) return;

    const likeBtn = document.getElementById('like-btn');
    const isCurrentlyLiked = likeBtn.getAttribute('data-liked') === 'true';
    const methodType = isCurrentlyLiked ? 'DELETE' : 'PUT';

    const trackUri = encodeURIComponent(`spotify:track:${lastTrackId}`);
    const url = `https://api.spotify.com/v1/me/library?uris=${trackUri}`;

    try {
        const response = await fetch(url, {
            method: methodType,
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const newLikedState = !isCurrentlyLiked;
            likeBtn.innerText = newLikedState ? "❤️" : "🤍";
            likeBtn.setAttribute('data-liked', newLikedState);

            // Rafraîchit la liste des titres likés si elle est affichée
            const results = document.getElementById('search-results');
            if (results && results.innerHTML.includes("VOS TITRES LIKÉS")) {
                getUserLibrary();
            }
        } else if (response.status === 401 || response.status === 403) {
            console.warn("Session expirée ou accès refusé.");
        }
    } catch (error) {
        console.error("Erreur modification bibliothèque :", error);
    }
}
// ==========================================
// VARIABLES GLOBALES
// ==========================================
let userPlaylists = [];
let displayedPlaylistsCount = 10;
let currentPlaylistTracks = [];
let displayedTracksCount = 10;
let currentPlaylistName = "";

// ==========================================
// 1. AFFICHAGE / MASQUAGE AU CLIC SUR LE BOUTON 🎵
// ==========================================
function togglePlaylistsView() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    resultsContainer.dataset.view = '';
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();

    const container = document.getElementById('playlist-container');
    if (container.style.display === 'none' || container.innerHTML === '') {
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.boxSizing = 'border-box';
        fetchUserPlaylists();
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// ==========================================
// 2. RÉCUPÉRATION DE TOUTES LES PLAYLISTS
// ==========================================
async function fetchUserPlaylists() {
    if (!currentToken) return;
    const container = document.getElementById('playlist-container');
    container.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement des playlists...</p>";

    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            userPlaylists = data.items;
            displayedPlaylistsCount = 10;
            renderPlaylistsSection();
        } else {
            container.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Aucune playlist trouvée.</p>";
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement des playlists.</p>";
    }
}

// ==========================================
// 3. LISTE DES PLAYLISTS
// Titre "VOS PLAYLISTS" HORS du cadre défilant
// Cadre défilant = 100% de la largeur du container
// ==========================================
function renderPlaylistsSection() {
    const container = document.getElementById('playlist-container');

    // Mémorise la position de défilement avant de tout reconstruire
    const previousScrollBox = document.getElementById('playlist-scroll-box');
    const savedScrollTop = previousScrollBox ? previousScrollBox.scrollTop : 0;

    container.innerHTML = "";
    container.style.textAlign = 'left';
    container.style.width = '100%';
    container.style.boxSizing = 'border-box';

    // Titre EXTÉRIEUR au cadre de défilement
    const titleHeader = document.createElement('p');
    titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 0; text-align: left; width: 100%;";
    titleHeader.innerText = "VOS PLAYLISTS";
    container.appendChild(titleHeader);

    // Cadre défilant, prend toute la largeur du container
    const scrollBox = document.createElement('div');
    scrollBox.id = 'playlist-scroll-box';
    scrollBox.style = "width: 100%; box-sizing: border-box; max-height: 300px; overflow-y: auto;";
    container.appendChild(scrollBox);

    const itemsToDisplay = userPlaylists.slice(0, displayedPlaylistsCount);

    itemsToDisplay.forEach(pl => {
        if (!pl) return;
        const item = document.createElement('div');
        item.className = 'search-item';
        item.style.width = '100%';
        item.style.boxSizing = 'border-box';
        const imgUrl = pl.images && pl.images.length > 0 ? pl.images[0].url : 'https://via.placeholder.com/30';

        const totalCount = (pl.tracks && pl.tracks.total !== undefined)
            ? pl.tracks.total
            : (pl.items && pl.items.total !== undefined ? pl.items.total : '?');

        item.innerHTML = `
            <img src="${imgUrl}" alt="">
            <div>
                <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pl.name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-grey);">${totalCount} titres</span>
            </div>
        `;
        item.onclick = () => loadPlaylistTracks(pl.id, pl.name);
        scrollBox.appendChild(item);
    });

    // Bouton "Afficher plus" — même style que getUserLibrary (classe lib-btn, rien d'autre)
    if (userPlaylists.length > displayedPlaylistsCount) {
        const moreBtn = createMoreButton(() => {
            displayedPlaylistsCount += 10;
            renderPlaylistsSection();
        });
        scrollBox.appendChild(moreBtn);
    }

    // Restaure la position de défilement (évite que la liste reparte en haut)
    scrollBox.scrollTop = savedScrollTop;
}

// ==========================================
// 4. CHARGEMENT DES TITRES D'UNE PLAYLIST
// ==========================================
async function loadPlaylistTracks(playlistId, playlistName) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement des titres...</p>";

    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const data = await response.json();
        currentPlaylistTracks = data.items || [];
        currentPlaylistName = playlistName;
        displayedTracksCount = 10;

        renderPlaylistTracksSection();
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement des titres.</p>";
    }
}

// ==========================================
// 5. TITRES D'UNE PLAYLIST
// Titre + bouton retour (pleine largeur) HORS du cadre défilant
// ==========================================
function renderPlaylistTracksSection() {
    const container = document.getElementById('playlist-container');

    // Mémorise la position de défilement avant de tout reconstruire
    const previousScrollBox = document.getElementById('playlist-tracks-scroll-box');
    const savedScrollTop = previousScrollBox ? previousScrollBox.scrollTop : 0;

    container.innerHTML = "";
    container.style.textAlign = 'left';
    container.style.width = '100%';
    container.style.boxSizing = 'border-box';

    // Titre EXTÉRIEUR au cadre
    const titleHeader = document.createElement('p');
    titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 0; text-align: left; width: 100%;";
    titleHeader.innerText = currentPlaylistName.toUpperCase();
    container.appendChild(titleHeader);

    // Bouton retour EXTÉRIEUR, pleine largeur
    const backBtn = document.createElement('button');
    backBtn.innerText = "⬅ Retour";
    backBtn.style = "background:#e22134; color:white; border:none; padding:10px; border-radius:4px; font-size:0.85rem; font-weight:bold; cursor:pointer; margin-bottom:15px; width:100%; box-sizing:border-box; display:block; text-align:center;";
    backBtn.onclick = () => renderPlaylistsSection();
    container.appendChild(backBtn);

    if (currentPlaylistTracks.length === 0) {
        container.innerHTML += "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Cette playlist est vide.</p>";
        return;
    }

    // Cadre défilant, prend toute la largeur
    const scrollBox = document.createElement('div');
    scrollBox.id = 'playlist-tracks-scroll-box';
    scrollBox.style = "width: 100%; box-sizing: border-box; max-height: 300px; overflow-y: auto;";
    container.appendChild(scrollBox);

    const allUris = currentPlaylistTracks
        .map(obj => (obj.item || obj.track) ? (obj.item || obj.track).uri : null)
        .filter(uri => uri);

    const itemsToDisplay = currentPlaylistTracks.slice(0, displayedTracksCount);

    itemsToDisplay.forEach((obj, index) => {
        const track = obj.item || obj.track;
        if (!track) return;

        const item = document.createElement('div');
        item.className = 'search-item';
        item.style.width = '100%';
        item.style.boxSizing = 'border-box';
        const imgUrl = track.album && track.album.images && track.album.images.length > 2 ? track.album.images[2].url : 'https://via.placeholder.com/30';
        const artistsNames = track.artists && track.artists.length > 0 ? track.artists.map(a => a.name).join(', ') : 'Artiste inconnu';

        item.innerHTML = `
            <img src="${imgUrl}" alt="">
            <div>
                <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-grey);">${artistsNames}</span>
            </div>
        `;
        item.onclick = () => playTrackList(allUris, index);
        item.appendChild(buildQueueButton(track.uri));
        scrollBox.appendChild(item);
    });

    if (currentPlaylistTracks.length > displayedTracksCount) {
        const moreBtn = createMoreButton(() => {
            displayedTracksCount += 10;
            renderPlaylistTracksSection();
        });
        scrollBox.appendChild(moreBtn);
    }

    // Restaure la position de défilement (évite que la liste reparte en haut)
    scrollBox.scrollTop = savedScrollTop;
}
// ==========================================
// FILE D'ATTENTE — bouton 📋
// ==========================================
async function toggleQueue() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const plContainer = document.getElementById('playlist-container');
    if (plContainer) { plContainer.style.display = 'none'; plContainer.innerHTML = ''; }

    const resultsContainer = document.getElementById('search-results');

    if (resultsContainer.dataset.view === 'queue') {
        resultsContainer.innerHTML = '';
        resultsContainer.dataset.view = '';
        resultsContainer.dataset.topTracksOpen = '';
        stopQueueAutoRefresh();
        lastQueueSnapshot = null; // pour forcer un vrai rendu à la prochaine ouverture
        return;
    }

    resultsContainer.dataset.view = 'queue';
    lastQueueSnapshot = null; // force l'affichage initial même si identique au dernier passage
    await fetchQueue();

    // Rafraîchit automatiquement toutes les 4s tant que le panneau reste ouvert
    // (en arrière-plan : ne redessine que si le contenu a réellement changé)
    stopQueueAutoRefresh(); // sécurité anti-doublon si jamais un intervalle tournait déjà
    queueRefreshInterval = setInterval(() => {
        if (resultsContainer.dataset.view === 'queue') {
            fetchQueue(true);
        } else {
            stopQueueAutoRefresh();
        }
    }, 4000);
}

let lastQueueSnapshot = null;

async function fetchQueue(isBackgroundRefresh = false) {
    if (!currentToken) return;
    const resultsContainer = document.getElementById('search-results');

    // N'affiche "Chargement..." qu'à l'ouverture manuelle, pas lors des rafraîchissements auto en arrière-plan
    if (!isBackgroundRefresh) {
        resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de la file d'attente...</p>";
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (response.status === 401 || response.status === 403) {
            if (!isBackgroundRefresh) {
                resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Session expirée, reconnecte-toi.</p>";
            }
            return;
        }
        if (response.status === 429) {
            if (!isBackgroundRefresh) {
                const retryAfter = response.headers.get('Retry-After');
                resultsContainer.innerHTML = `<p style='font-size:0.9rem; color:orange; margin:5px;'>Trop de requêtes envoyées à Spotify${retryAfter ? `, réessaie dans ${retryAfter} secondes.` : ', réessaie dans quelques secondes.'}</p>`;
            }
            return; // en arrière-plan, on ignore simplement ce cycle et on réessaiera au prochain tick
        }

        const data = await response.json();

        // Compare avec le dernier état connu : ne redessine que si quelque chose a réellement changé
        const snapshot = JSON.stringify({
            current: data.currently_playing ? data.currently_playing.id : null,
            queue: (data.queue || []).map(t => t.id)
        });

        if (snapshot === lastQueueSnapshot) {
            return; // rien de nouveau, on ne touche pas à l'affichage
        }
        lastQueueSnapshot = snapshot;

        renderQueueSection(data);
    } catch (e) {
        console.error(e);
        if (!isBackgroundRefresh) {
            resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement de la file d'attente.</p>";
        }
    }
}

function renderQueueSection(data) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "";
    resultsContainer.style.textAlign = 'left';

    if (data.currently_playing) {
        const currentHeader = document.createElement('p');
        currentHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
        currentHeader.innerText = "EN COURS DE LECTURE";
        resultsContainer.appendChild(currentHeader);
        resultsContainer.appendChild(buildQueueItem(data.currently_playing));
    }

    const queueHeader = document.createElement('p');
    queueHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 15px 0 10px 5px;";
    queueHeader.innerText = "À SUIVRE";
    resultsContainer.appendChild(queueHeader);

    if (!data.queue || data.queue.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style = "font-size:0.9rem; color:var(--text-grey); margin:5px;";
        emptyMsg.innerText = "Aucun titre en attente.";
        resultsContainer.appendChild(emptyMsg);
        return;
    }

    data.queue.forEach(track => {
        resultsContainer.appendChild(buildQueueItem(track));
    });
}

function buildQueueItem(track) {
    const item = document.createElement('div');
    item.className = 'search-item';

    const imgUrl = track.album && track.album.images && track.album.images.length > 0
        ? track.album.images[track.album.images.length > 2 ? 2 : 0].url
        : 'https://via.placeholder.com/30';

    const artistsNames = track.artists && track.artists.length > 0
        ? track.artists.map(a => a.name).join(', ')
        : (track.show ? track.show.name : 'Artiste inconnu');

    item.innerHTML = `
        <img src="${imgUrl}" alt="">
        <div>
            <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.name}</strong>
            <span style="font-size: 0.8rem; color: var(--text-grey);">${artistsNames}</span>
        </div>
    `;
    return item;
}





