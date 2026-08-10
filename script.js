const APP_VERSION = "v1.1.30";

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
                initSpotlightsState();
                initGarlandState();
                initRainbowBgState();
                initFlamesState();
                initFireworksState();
                initNeonBorderState();
                initStarrySkyState();
                initShootingStarsState();
                requestWakeLock();
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
    console.log("seekTrack() appelée", { currentToken: !!currentToken, trackDurationMs, event });
    if (!currentToken || !trackDurationMs) {
        console.warn("seekTrack() : sortie anticipée —", !currentToken ? "pas de token" : "trackDurationMs = 0 (aucun titre chargé ?)");
        return;
    }
    if (!event || !event.currentTarget) {
        console.error("seekTrack() : 'event' ou 'event.currentTarget' manquant — vérifie que le HTML appelle bien onclick=\"seekTrack(event)\" (avec le mot event en paramètre).");
        return;
    }
    
    // Calcule la position du clic en pixels par rapport à la largeur totale de la barre
    const rect = event.currentTarget.getBoundingClientRect();
    const clickPositionRatio = (event.clientX - rect.left) / rect.width;
    
    // Convertit ce ratio en millisecondes selon la durée totale du morceau
    const targetPositionMs = Math.floor(clickPositionRatio * trackDurationMs);
    console.log("seekTrack() : position ciblee =", targetPositionMs, "ms sur", trackDurationMs, "ms");

    // Mise à jour INSTANTANÉE et locale, sans attendre le réseau — évite que la barre
    // locale (qui avance toute seule chaque seconde) écrase visuellement ton clic
    // pendant le court délai avant la confirmation de Spotify.
    currentProgressMs = targetPositionMs;
    const progressPercent = (targetPositionMs / trackDurationMs) * 100;
    const fillEl = document.getElementById('progress-fill');
    const timeEl = document.getElementById('time-current');
    if (fillEl) fillEl.style.width = `${progressPercent}%`;
    if (timeEl) timeEl.innerText = formatTime(targetPositionMs);

    // Le déplacement manuel change le temps restant réel : il faut reprogrammer
    // le minuteur DJ en conséquence, sinon il reste calé sur l'ancienne planification.
    if (djModeEnabled) {
        console.log("seekTrack() : reprogrammation du minuteur DJ apres deplacement manuel");
        scheduleDjAnnouncement(trackDurationMs - targetPositionMs);
    }

    try {
        console.log("seekTrack() : envoi PUT /me/player/seek...");
        const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${targetPositionMs}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        console.log("seekTrack() : reponse Spotify statut =", response.status);

        // Resynchronise avec la vraie position Spotify peu après (corrige toute dérive)
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
    const linesHtml = currentLyrics.map((l, i) => `<div id="line-${i}" class="lyric-line" onclick="seekToLyricLine(${i})" style="cursor: pointer;">${l.text}</div>`).join('');
    
    document.getElementById('lyrics-content').innerHTML = titleHeader + linesHtml;
}

// Clic sur une ligne de paroles = navigue directement à ce moment du titre (comme la barre de progression)
async function seekToLyricLine(lineIndex) {
    if (!clickableLyricsEnabled) return; // fonctionnalité désactivée par défaut, via les réglages
    if (!currentToken || !trackDurationMs || !currentLyrics[lineIndex]) return;

    const targetPositionMs = Math.floor(currentLyrics[lineIndex].time * 1000);

    // Mise à jour instantanée et locale, même logique que le clic sur la barre de progression
    currentProgressMs = targetPositionMs;
    const progressPercent = (targetPositionMs / trackDurationMs) * 100;
    const fillEl = document.getElementById('progress-fill');
    const timeEl = document.getElementById('time-current');
    if (fillEl) fillEl.style.width = `${progressPercent}%`;
    if (timeEl) timeEl.innerText = formatTime(targetPositionMs);
    highlightLyrics(currentLyrics[lineIndex].time);

    // Reprogramme le Mode DJ avec le nouveau temps restant, comme pour la barre de progression
    if (djModeEnabled) {
        scheduleDjAnnouncement(trackDurationMs - targetPositionMs);
    }

    try {
        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${targetPositionMs}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        setTimeout(updateNowPlaying, 300);
    } catch (e) {
        console.error("Erreur de navigation via les paroles :", e);
    }
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

                        // Nouveau titre : reprogramme l'annonce DJ sur la durée du titre qui vient de démarrer
                        if (djModeEnabled) {
                            djLastKnownPlayingState = data.is_playing;
                            scheduleDjAnnouncement(data.item.duration_ms - data.progress_ms);
                        }
                    }
                }
            } catch (e) {}
        }

        // Fait avancer la barre de progression et le chrono chaque seconde, SANS appeler l'API.
        // La vraie valeur est resynchronisée par updateNowPlaying() toutes les 3s.
        function tickLocalProgress() {
            checkDjPauseState(); // doit tourner même en pause, donc placé AVANT le return anticipé

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

        // Mise à jour immédiate et locale (sans attendre le réseau), pour que le Mode DJ
        // détecte la pause/reprise instantanément au lieu d'attendre le prochain sondage.
        isCurrentlyPlaying = (endpoint === 'play');

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
let spotlightsEnabled = localStorage.getItem('spotlightsEnabled') === 'true'; // désactivé par défaut
let garlandEnabled = localStorage.getItem('garlandEnabled') === 'true'; // désactivé par défaut
let clickableLyricsEnabled = localStorage.getItem('clickableLyricsEnabled') === 'true'; // désactivé par défaut
let rainbowBgEnabled = localStorage.getItem('rainbowBgEnabled') === 'true'; // désactivé par défaut
let flamesEnabled = localStorage.getItem('flamesEnabled') === 'true'; // désactivé par défaut
let fireworksEnabled = localStorage.getItem('fireworksEnabled') === 'true'; // désactivé par défaut
let neonBorderEnabled = localStorage.getItem('neonBorderEnabled') === 'true'; // désactivé par défaut
let starrySkyEnabled = localStorage.getItem('starrySkyEnabled') === 'true'; // désactivé par défaut
let shootingStarsEnabled = localStorage.getItem('shootingStarsEnabled') === 'true'; // désactivé par défaut

function toggleSettings() {
    // Force le panneau réglages à défiler verticalement plutôt que de prendre toute la hauteur
    if (!document.getElementById('settings-scroll-inline-style')) {
        const scrollStyle = document.createElement('style');
        scrollStyle.id = 'settings-scroll-inline-style';
        scrollStyle.textContent = `
            #settings-zone {
                max-height: 260px !important;
                overflow-y: auto !important;
            }
        `;
        document.head.appendChild(scrollStyle);
    }

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
        const spotlightsToggle = document.getElementById('spotlights-toggle');
        if (spotlightsToggle) spotlightsToggle.checked = spotlightsEnabled;
        const garlandToggle = document.getElementById('garland-toggle');
        if (garlandToggle) garlandToggle.checked = garlandEnabled;
        const clickableLyricsToggle = document.getElementById('clickable-lyrics-toggle');
        if (clickableLyricsToggle) clickableLyricsToggle.checked = clickableLyricsEnabled;
        const rainbowToggle = document.getElementById('rainbow-bg-toggle');
        if (rainbowToggle) rainbowToggle.checked = rainbowBgEnabled;
        const flamesToggle = document.getElementById('flames-toggle');
        if (flamesToggle) flamesToggle.checked = flamesEnabled;
        const fireworksToggle = document.getElementById('fireworks-toggle');
        if (fireworksToggle) fireworksToggle.checked = fireworksEnabled;
        const neonToggle = document.getElementById('neon-border-toggle');
        if (neonToggle) neonToggle.checked = neonBorderEnabled;
        const starrySkyToggle = document.getElementById('starry-sky-toggle');
        if (starrySkyToggle) starrySkyToggle.checked = starrySkyEnabled;
        const shootingStarsToggle = document.getElementById('shooting-stars-toggle');
        if (shootingStarsToggle) shootingStarsToggle.checked = shootingStarsEnabled;
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
// PROJECTEURS 🔦 — deux projecteurs RGB (haut gauche / haut droite), faisceaux orientés vers
// le bas, couleur qui change en boucle, léger balancement. Désactivé par défaut.
// ==========================================
function injectSpotlightsStyles() {
    if (document.getElementById('spotlights-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'spotlights-inline-style';
    styleTag.textContent = `
        .spotlight-wrapper {
            position: fixed;
            top: 0;
            width: 0;
            height: 0;
            z-index: 400;
            pointer-events: none;
        }
        #spotlight-left { left: 20px; }
        #spotlight-right { right: 20px; }

        .spotlight-housing {
            position: absolute;
            top: 0;
            width: 66px;
            height: 48px;
            background: #222;
            border-radius: 8px;
            transform: translateX(-50%);
        }
        #spotlight-left .spotlight-housing { transform-origin: top center; }
        #spotlight-right .spotlight-housing { transform-origin: top center; }

        .spotlight-beam {
            position: absolute;
            top: 42px;
            left: 50%;
            width: 0;
            height: 0;
            border-left: 180px solid transparent;
            border-right: 180px solid transparent;
            border-top: 720px solid hsl(0, 90%, 60%);
            transform: translateX(-50%) rotate(0deg);
            transform-origin: top center;
            opacity: 0.28;
            filter: blur(6px);
            mix-blend-mode: screen;
            animation: spotlight-color-cycle 6s linear infinite, spotlight-sway 3.5s ease-in-out infinite;
        }
        #spotlight-right .spotlight-beam {
            animation: spotlight-color-cycle 6s linear infinite reverse, spotlight-sway-right 3.5s ease-in-out infinite;
        }

        @keyframes spotlight-color-cycle {
            0%   { border-top-color: hsl(0, 90%, 60%); }
            16%  { border-top-color: hsl(60, 90%, 60%); }
            33%  { border-top-color: hsl(120, 90%, 55%); }
            50%  { border-top-color: hsl(180, 90%, 55%); }
            66%  { border-top-color: hsl(240, 90%, 60%); }
            83%  { border-top-color: hsl(300, 90%, 60%); }
            100% { border-top-color: hsl(360, 90%, 60%); }
        }
        @keyframes spotlight-sway {
            0%, 100% { transform: translateX(-50%) rotate(-10deg); }
            50%      { transform: translateX(-50%) rotate(8deg); }
        }
        @keyframes spotlight-sway-right {
            0%, 100% { transform: translateX(-50%) rotate(10deg); }
            50%      { transform: translateX(-50%) rotate(-8deg); }
        }
    `;
    document.head.appendChild(styleTag);
}
injectSpotlightsStyles();

function ensureSpotlightsElements() {
    let left = document.getElementById('spotlight-left');
    if (!left) {
        left = document.createElement('div');
        left.id = 'spotlight-left';
        left.className = 'spotlight-wrapper';
        left.innerHTML = `<div class="spotlight-housing"></div><div class="spotlight-beam"></div>`;
        document.body.appendChild(left);
    }
    let right = document.getElementById('spotlight-right');
    if (!right) {
        right = document.createElement('div');
        right.id = 'spotlight-right';
        right.className = 'spotlight-wrapper';
        right.innerHTML = `<div class="spotlight-housing"></div><div class="spotlight-beam"></div>`;
        document.body.appendChild(right);
    }
    return { left, right };
}

function toggleSpotlightsSetting(checked) {
    spotlightsEnabled = checked;
    localStorage.setItem('spotlightsEnabled', checked ? 'true' : 'false');
    const { left, right } = ensureSpotlightsElements();
    left.style.display = checked ? 'block' : 'none';
    right.style.display = checked ? 'block' : 'none';
}

function initSpotlightsState() {
    const { left, right } = ensureSpotlightsElements();
    left.style.display = spotlightsEnabled ? 'block' : 'none';
    right.style.display = spotlightsEnabled ? 'block' : 'none';
}

// ==========================================
// GUIRLANDE 🪔 — ampoules jaune chaud sur câble noir, en haut de l'écran, scintillement doux.
// Désactivée par défaut.
// ==========================================
function injectGarlandStyles() {
    if (document.getElementById('garland-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'garland-inline-style';
    styleTag.textContent = `
        #garland-wrapper {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 60px;
            z-index: 400;
            pointer-events: none;
        }
        #garland-cable {
            position: absolute;
            top: 6px;
            left: 0;
            width: 100%;
            height: 3.6px;
            background: #1a1a1a;
        }
        .garland-bulb {
            position: absolute;
            top: 8px;
            width: 20px;
            height: 28px;
            background: radial-gradient(circle at 50% 35%, #fff6d5 0%, #ffd45e 55%, #e8a832 100%);
            border-radius: 50% 50% 45% 45%;
            box-shadow: 0 0 16px 4px rgba(255, 212, 94, 0.75);
            animation: garland-twinkle 2.4s ease-in-out infinite;
        }
        @keyframes garland-twinkle {
            0%, 100% { opacity: 1; box-shadow: 0 0 16px 4px rgba(255, 212, 94, 0.75); }
            50%      { opacity: 0.55; box-shadow: 0 0 8px 2px rgba(255, 212, 94, 0.4); }
        }
    `;
    document.head.appendChild(styleTag);
}
injectGarlandStyles();

function ensureGarlandElement() {
    let wrapper = document.getElementById('garland-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'garland-wrapper';

        const cable = document.createElement('div');
        cable.id = 'garland-cable';
        wrapper.appendChild(cable);

        // Espacement physique cible entre 2 ampoules (~55px) — le nombre d'ampoules
        // s'adapte à la largeur réelle de l'écran pour garder cet espacement constant.
        const TARGET_SPACING_PX = 55;
        const BULB_COUNT = Math.max(6, Math.round(window.innerWidth / TARGET_SPACING_PX) + 1);
        for (let i = 0; i < BULB_COUNT; i++) {
            const bulb = document.createElement('div');
            bulb.className = 'garland-bulb';
            bulb.style.left = `${(i / (BULB_COUNT - 1)) * 100}%`;
            bulb.style.animationDelay = `${Math.random() * 2.4}s`; // scintillement décalé, pas synchronisé
            wrapper.appendChild(bulb);
        }

        document.body.appendChild(wrapper);
    }
    return wrapper;
}

function toggleGarlandSetting(checked) {
    garlandEnabled = checked;
    localStorage.setItem('garlandEnabled', checked ? 'true' : 'false');
    const wrapper = ensureGarlandElement();
    wrapper.style.display = checked ? 'block' : 'none';
}

function initGarlandState() {
    const wrapper = ensureGarlandElement();
    wrapper.style.display = garlandEnabled ? 'block' : 'none';
}

// ==========================================
// PAROLES CLIQUABLES ⏱️ — activer/désactiver la navigation dans le titre au clic sur une ligne
// ==========================================
function toggleClickableLyricsSetting(checked) {
    clickableLyricsEnabled = checked;
    localStorage.setItem('clickableLyricsEnabled', checked ? 'true' : 'false');
}

// ==========================================
// 🌈 FOND ARC-EN-CIEL ANIMÉ
// ==========================================
function injectRainbowBgStyles() {
    if (document.getElementById('rainbow-bg-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'rainbow-bg-inline-style';
    styleTag.textContent = `
        #rainbow-bg {
            display: none;
            position: fixed;
            inset: 0;
            z-index: -1;
            background: linear-gradient(270deg, #ff0040, #ff8a00, #ffe600, #21d19f, #00aeff, #7b2ff7, #ff0040);
            background-size: 1400% 1400%;
            animation: rainbow-shift 18s ease infinite;
        }
        @keyframes rainbow-shift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectRainbowBgStyles();

function ensureRainbowBgElement() {
    let el = document.getElementById('rainbow-bg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'rainbow-bg';
        document.body.appendChild(el);
    }
    return el;
}

function toggleRainbowBgSetting(checked) {
    rainbowBgEnabled = checked;
    localStorage.setItem('rainbowBgEnabled', checked ? 'true' : 'false');
    ensureRainbowBgElement().style.display = checked ? 'block' : 'none';
}

function initRainbowBgState() {
    ensureRainbowBgElement().style.display = rainbowBgEnabled ? 'block' : 'none';
}

// ==========================================
// 🔥 FLAMMES EN BAS D'ÉCRAN
// ==========================================
function injectFlamesStyles() {
    if (document.getElementById('flames-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'flames-inline-style';
    styleTag.textContent = `
        #flames-wrapper {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 60px;
            z-index: 400;
            pointer-events: none;
            overflow: hidden;
        }
        .flame-item {
            position: absolute;
            bottom: -10px;
            font-size: 2.4rem;
            transform-origin: bottom center;
            animation: flame-flicker 0.6s ease-in-out infinite alternate;
            filter: drop-shadow(0 0 8px rgba(255,120,0,0.7));
        }
        @keyframes flame-flicker {
            0%   { transform: scaleY(1) scaleX(1) rotate(-2deg); opacity: 0.9; }
            50%  { transform: scaleY(1.15) scaleX(0.95) rotate(1deg); opacity: 1; }
            100% { transform: scaleY(0.95) scaleX(1.05) rotate(-1deg); opacity: 0.85; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFlamesStyles();

function ensureFlamesElement() {
    let wrapper = document.getElementById('flames-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'flames-wrapper';
        const FLAME_COUNT = 14;
        for (let i = 0; i < FLAME_COUNT; i++) {
            const flame = document.createElement('div');
            flame.className = 'flame-item';
            flame.innerText = '🔥';
            flame.style.left = `${(i / (FLAME_COUNT - 1)) * 100}%`;
            flame.style.animationDelay = `${Math.random() * 0.6}s`;
            flame.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
            wrapper.appendChild(flame);
        }
        document.body.appendChild(wrapper);
    }
    return wrapper;
}

function toggleFlamesSetting(checked) {
    flamesEnabled = checked;
    localStorage.setItem('flamesEnabled', checked ? 'true' : 'false');
    ensureFlamesElement().style.display = checked ? 'block' : 'none';
}

function initFlamesState() {
    ensureFlamesElement().style.display = flamesEnabled ? 'block' : 'none';
}

// ==========================================
// 🎆 FEU D'ARTIFICE PÉRIODIQUE (déclenché seul, à intervalles aléatoires)
// ==========================================
let fireworksIntervalId = null;

function injectFireworksStyles() {
    if (document.getElementById('fireworks-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'fireworks-inline-style';
    styleTag.textContent = `
        .firework-spark {
            position: fixed;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 600;
            animation: firework-burst 1.1s ease-out forwards;
        }
        @keyframes firework-burst {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: var(--fw-end-transform); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFireworksStyles();

function launchAutoFirework() {
    const colors = ['#ff5252', '#ffd452', '#52ff8a', '#52c8ff', '#c452ff', '#ffffff'];
    const originX = 15 + Math.random() * 70; // % de la largeur d'écran
    const originY = 15 + Math.random() * 40; // % de la hauteur d'écran
    const sparkCount = 20;

    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'firework-spark';
        spark.style.left = `${originX}vw`;
        spark.style.top = `${originY}vh`;
        spark.style.background = colors[Math.floor(Math.random() * colors.length)];

        const angle = (i / sparkCount) * 2 * Math.PI;
        const distance = 132 + Math.random() * 110;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        spark.style.setProperty('--fw-end-transform', `translate(${x}px, ${y}px) scale(0.3)`);

        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 1200);
    }
}

function scheduleNextAutoFirework() {
    if (!fireworksEnabled) return;
    const delay = 4000 + Math.random() * 8000; // entre 4 et 12s
    fireworksIntervalId = setTimeout(() => {
        if (fireworksEnabled) launchAutoFirework();
        scheduleNextAutoFirework();
    }, delay);
}

function toggleFireworksSetting(checked) {
    fireworksEnabled = checked;
    localStorage.setItem('fireworksEnabled', checked ? 'true' : 'false');
    if (fireworksIntervalId) { clearTimeout(fireworksIntervalId); fireworksIntervalId = null; }
    if (checked) scheduleNextAutoFirework();
}

function initFireworksState() {
    if (fireworksEnabled) scheduleNextAutoFirework();
}

// ==========================================
// 🟩 BORDURE NÉON ANIMÉE (tout autour de l'écran)
// ==========================================
function injectNeonBorderStyles() {
    if (document.getElementById('neon-border-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'neon-border-inline-style';
    styleTag.textContent = `
        #neon-border {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 450;
            pointer-events: none;
            box-shadow: inset 0 0 18px 4px hsl(140, 100%, 55%), inset 0 0 34px 10px hsla(140, 100%, 55%, 0.4);
            animation: neon-border-cycle 5s linear infinite;
        }
        @keyframes neon-border-cycle {
            0%   { box-shadow: inset 0 0 18px 4px hsl(0, 100%, 55%), inset 0 0 34px 10px hsla(0, 100%, 55%, 0.4); }
            25%  { box-shadow: inset 0 0 18px 4px hsl(90, 100%, 55%), inset 0 0 34px 10px hsla(90, 100%, 55%, 0.4); }
            50%  { box-shadow: inset 0 0 18px 4px hsl(180, 100%, 55%), inset 0 0 34px 10px hsla(180, 100%, 55%, 0.4); }
            75%  { box-shadow: inset 0 0 18px 4px hsl(270, 100%, 55%), inset 0 0 34px 10px hsla(270, 100%, 55%, 0.4); }
            100% { box-shadow: inset 0 0 18px 4px hsl(360, 100%, 55%), inset 0 0 34px 10px hsla(360, 100%, 55%, 0.4); }
        }
    `;
    document.head.appendChild(styleTag);
}
injectNeonBorderStyles();

function ensureNeonBorderElement() {
    let el = document.getElementById('neon-border');
    if (!el) {
        el = document.createElement('div');
        el.id = 'neon-border';
        document.body.appendChild(el);
    }
    return el;
}

function toggleNeonBorderSetting(checked) {
    neonBorderEnabled = checked;
    localStorage.setItem('neonBorderEnabled', checked ? 'true' : 'false');
    ensureNeonBorderElement().style.display = checked ? 'block' : 'none';
}

function initNeonBorderState() {
    ensureNeonBorderElement().style.display = neonBorderEnabled ? 'block' : 'none';
}

// ==========================================
// ⭐ CIEL ÉTOILÉ SCINTILLANT
// ==========================================
function injectStarrySkyStyles() {
    if (document.getElementById('starry-sky-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'starry-sky-inline-style';
    styleTag.textContent = `
        #starry-sky {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }
        .sky-star {
            position: absolute;
            width: 5px;
            height: 5px;
            background: #fff;
            border-radius: 50%;
            box-shadow: 0 0 4px 1px rgba(255,255,255,0.6);
            animation: star-twinkle 3s ease-in-out infinite;
        }
        @keyframes star-twinkle {
            0%, 100% { opacity: 0.2; }
            50%      { opacity: 1; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectStarrySkyStyles();

function ensureStarrySkyElement() {
    let sky = document.getElementById('starry-sky');
    if (!sky) {
        sky = document.createElement('div');
        sky.id = 'starry-sky';
        const STAR_COUNT = 60;
        for (let i = 0; i < STAR_COUNT; i++) {
            const star = document.createElement('div');
            star.className = 'sky-star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            star.style.animationDuration = `${2 + Math.random() * 2}s`;
            sky.appendChild(star);
        }
        document.body.appendChild(sky);
    }
    return sky;
}

function toggleStarrySkySetting(checked) {
    starrySkyEnabled = checked;
    localStorage.setItem('starrySkyEnabled', checked ? 'true' : 'false');
    ensureStarrySkyElement().style.display = checked ? 'block' : 'none';
}

function initStarrySkyState() {
    ensureStarrySkyElement().style.display = starrySkyEnabled ? 'block' : 'none';
}

// ==========================================
// 🌟 ÉTOILES FILANTES (périodiques, à intervalles aléatoires)
// ==========================================
let shootingStarsIntervalId = null;

function injectShootingStarsStyles() {
    if (document.getElementById('shooting-stars-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'shooting-stars-inline-style';
    styleTag.textContent = `
        .shooting-star {
            position: fixed;
            width: 4px;
            height: 4px;
            background: #fff;
            border-radius: 50%;
            z-index: 450;
            pointer-events: none;
            box-shadow: 0 0 8px 3px #fff;
            animation: shooting-star-fly 1.6s linear forwards;
        }
        .shooting-star::before {
            content: '';
            position: absolute;
            top: 50%;
            right: 0;
            width: 130px;
            height: 2px;
            background: linear-gradient(to left, rgba(255,255,255,0.95), transparent);
            transform-origin: right center;
            /* Angle aligné avec la trajectoire (2:1, diagonale bas-droite) : la traînée
               pointe donc vers le haut-gauche, c'est-à-dire "derrière" l'étoile qui file vers la droite. */
            transform: translateY(-50%) rotate(26.6deg);
        }
        @keyframes shooting-star-fly {
            0%   { transform: translate(0, 0); opacity: 0; }
            8%   { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: var(--shoot-end); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectShootingStarsStyles();

function launchShootingStar() {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    // Départ côté gauche de l'écran, zone haute — trajectoire vers le bas-droit (gauche → droite)
    star.style.top = `${Math.random() * 30}%`;
    star.style.left = `${-5 + Math.random() * 15}%`;

    // Distance de vol variable d'une étoile à l'autre, en gardant le même ratio d'angle (2:1)
    const distance = 300 + Math.random() * 140;
    star.style.setProperty('--shoot-end', `translate(${distance}px, ${distance / 2}px)`);

    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1700);
}

function scheduleNextShootingStar() {
    if (!shootingStarsEnabled) return;
    const delay = 3000 + Math.random() * 7000; // entre 3 et 10s
    shootingStarsIntervalId = setTimeout(() => {
        if (shootingStarsEnabled) launchShootingStar();
        scheduleNextShootingStar();
    }, delay);
}

function toggleShootingStarsSetting(checked) {
    shootingStarsEnabled = checked;
    localStorage.setItem('shootingStarsEnabled', checked ? 'true' : 'false');
    if (shootingStarsIntervalId) { clearTimeout(shootingStarsIntervalId); shootingStarsIntervalId = null; }
    if (checked) scheduleNextShootingStar();
}

function initShootingStarsState() {
    if (shootingStarsEnabled) scheduleNextShootingStar();
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

// ==========================================
// BOUTON CRÉDIT — ouvre une fenêtre d'explication du site
// ==========================================
function injectCreditsStyles() {
    if (document.getElementById('credits-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'credits-inline-style';
    styleTag.textContent = `
        #credits-btn {
            display: block;
            margin: 14px auto 0 auto;
            background-color: #000;
            color: #fff;
            border: none;
            padding: 8px 22px;
            font-size: 0.8rem;
            font-weight: bold;
            border-radius: 25px;
            cursor: pointer;
        }
        #credits-btn:hover {
            background-color: #222;
        }
        #credits-modal-overlay {
            position: fixed;
            top: 24px;
            left: 24px;
            right: 24px;
            bottom: 24px;
            background: #111111;
            border-radius: 20px;
            z-index: 1000;
            padding: 24px;
            box-sizing: border-box;
            overflow-y: auto;
            color: #dddddd;
            display: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        #credits-close-btn {
            position: absolute;
            top: 14px;
            right: 18px;
            background: none;
            border: none;
            color: #ffffff;
            font-size: 1.6rem;
            line-height: 1;
            cursor: pointer;
        }
        #credits-modal-overlay h2 {
            color: var(--spotify-green, #1DB954);
            font-size: 1.3rem;
            margin: 0 0 16px 0;
        }
        #credits-modal-overlay h3 {
            color: var(--spotify-green, #1DB954);
            font-size: 0.95rem;
            margin: 20px 0 8px 0;
        }
        #credits-modal-overlay p, #credits-modal-overlay li {
            font-size: 0.85rem;
            line-height: 1.5;
            color: #cccccc;
        }
        #credits-modal-overlay ul {
            padding-left: 20px;
            margin: 6px 0;
        }
    `;
    document.head.appendChild(styleTag);
}
injectCreditsStyles();

function ensureCreditsModal() {
    let overlay = document.getElementById('credits-modal-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'credits-modal-overlay';
    overlay.innerHTML = `
        <button id="credits-close-btn" onclick="toggleCreditsModal()">✕</button>
        <h2>À propos de Lyrics Original</h2>
        <p>Lyrics Original est une application web compagnon pour Spotify, pensée pour enrichir ton écoute au quotidien avec des paroles synchronisées et des outils pratiques réunis au même endroit.</p>

        <h3>🎵 Fonctionnalités principales</h3>
        <ul>
            <li><strong>Paroles synchronisées</strong> — s'affichent et défilent en rythme avec le titre en cours.</li>
            <li><strong>Recherche</strong> — trouve n'importe quel titre ou artiste sur Spotify.</li>
            <li><strong>Favoris</strong> — ajoute/retire un titre en un clic, retrouve toute ta bibliothèque likée.</li>
            <li><strong>Playlists</strong> — parcours tes playlists et lance un titre directement.</li>
            <li><strong>File d'attente</strong> — consulte et alimente ce qui va être joué ensuite.</li>
            <li><strong>Écoutes récentes</strong> — retrouve les titres que tu as écoutés dernièrement.</li>
            <li><strong>Top titres</strong> — classement France basé sur les tendances Last.fm.</li>
            <li><strong>Lecture aléatoire 🔀</strong> — tire un titre au hasard dans tes favoris ou tes playlists.</li>
            <li><strong>Commande vocale 🗣️</strong> — pilote la lecture à la voix ("chanson suivante", "mets en pause"...).</li>
            <li><strong>Soundboard 📣</strong> — 20 petits sons rigolos synthétisés, juste pour le plaisir.</li>
            <li><strong>Statistiques 📊</strong> — visualise ton temps d'écoute par jour ou par semaine.</li>
            <li><strong>Réglages ⚙️</strong> — spectre audio animé, défilement des paroles, boule à facettes, bouton pétard.</li>
        </ul>

        <h3>🔒 Confidentialité</h3>
        <p>Tes réglages, ton historique d'écoute affiché dans les statistiques, et quelques préférences sont stockés uniquement dans ton navigateur (localStorage) — rien n'est envoyé ni partagé sur un serveur externe, à l'exception des appels nécessaires à l'API Spotify elle-même pour faire fonctionner l'app.</p>

        <h3>⚠️ Avertissement</h3>
        <p>Ce site est un projet personnel non officiel, développé pour un usage personnel. Il n'est ni affilié à, ni approuvé par Spotify AB. Toutes les marques et contenus musicaux appartiennent à leurs ayants droit respectifs.</p>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function toggleCreditsModal() {
    const overlay = ensureCreditsModal();
    overlay.style.display = (overlay.style.display === 'none' || overlay.style.display === '') ? 'block' : 'none';
}

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

// ==========================================
// WAKE LOCK — empêche l'écran de s'éteindre tant que la page reste active
// (nécessaire notamment pour que le Mode DJ continue de fonctionner en arrière-plan)
// ==========================================
let wakeLockSentinel = null;

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
        console.warn("Wake Lock non supporté par ce navigateur.");
        return;
    }
    try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        console.log("Wake Lock actif : l'écran ne s'éteindra pas automatiquement.");
        wakeLockSentinel.addEventListener('release', () => {
            console.log("Wake Lock relâché (page en arrière-plan ou verrouillée manuellement).");
        });
    } catch (e) {
        console.warn("Impossible d'activer le Wake Lock :", e);
    }
}

// Le Wake Lock est automatiquement relâché quand l'onglet passe en arrière-plan —
// il faut le redemander explicitement à chaque retour sur la page.
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && currentToken) {
        await requestWakeLock();
    }
});

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

async function handleVoiceCommand(rawText) {
    const text = rawText.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');

    // Affiche le message ET programme son effacement automatique après 6s,
    // sans effacer un autre panneau que l'utilisateur aurait ouvert entre-temps.
    function feedback(msg, isError) {
        if (!resultsContainer) return;
        resultsContainer.dataset.view = '';
        resultsContainer.dataset.topTracksOpen = '';

        const msgEl = document.createElement('p');
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.color = isError ? '#ef4444' : 'var(--spotify-green)';
        msgEl.style.margin = '5px';
        msgEl.innerText = "Commande : " + rawText + " -> " + msg;

        resultsContainer.innerHTML = "";
        resultsContainer.appendChild(msgEl);

        setTimeout(() => {
            // Ne retire QUE cet élément précis, et seulement s'il est toujours affiché
            // (isConnected = encore présent dans la page). Si l'utilisateur a ouvert un autre
            // panneau entre-temps, msgEl a été détaché du DOM par ce panneau : on ne touche à rien.
            if (msgEl.isConnected) {
                msgEl.remove();
            }
        }, 6000);
    }

    try {
        if (/(chanson|titre|piste)?\s*suivant[e]?/.test(text) || text.indexOf('next') !== -1) {
            await nextTrack();
            feedback("titre suivant");
            return;
        }
        if (/(chanson|titre|piste)?\s*pr[ée]c[ée]dent[e]?/.test(text)) {
            await previousTrack();
            feedback("titre precedent");
            return;
        }
        if (/pause|mets? en pause|arr[êe]te/.test(text)) {
            const newState = await forcePlaybackState('pause');
            feedback(newState ? "mise en pause" : "echec (aucun appareil actif ?)", !newState);
            return;
        }
        if (text === 'joue' || text === 'reprends' || text === 'lecture' || text === 'play') {
            const newState = await forcePlaybackState('play');
            feedback(newState ? "reprise de la lecture" : "echec (aucun appareil actif ?)", !newState);
            return;
        }
        if (/(monte|augmente)\s+(le\s+)?volume/.test(text)) {
            const slider = document.getElementById('volume-slider');
            const newVal = slider ? Math.min(100, parseInt(slider.value, 10) + 15) : 70;
            await changeVolume(newVal);
            if (slider) slider.value = newVal;
            feedback("volume augmente");
            return;
        }
        if (/(baisse|diminue)\s+(le\s+)?volume/.test(text)) {
            const slider = document.getElementById('volume-slider');
            const newVal = slider ? Math.max(0, parseInt(slider.value, 10) - 15) : 30;
            await changeVolume(newVal);
            if (slider) slider.value = newVal;
            feedback("volume baisse");
            return;
        }
        if (/coupe le son|mute|silence/.test(text)) {
            await changeVolume(0);
            const slider = document.getElementById('volume-slider');
            if (slider) slider.value = 0;
            feedback("son coupe");
            return;
        }
        if (/j'aime|like|ajoute.*favoris/.test(text)) {
            await toggleLikeCurrentTrack();
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
            await searchAndPlayFirstResult(query);
            return;
        }

        const searchMatch = text.match(/^(recherche|cherche)\s+(.+)$/);
        if (searchMatch && searchMatch[2]) {
            document.getElementById('search-input').value = searchMatch[2].trim();
            await searchTrack();
            feedback("resultats pour " + searchMatch[2].trim());
            return;
        }

        feedback("commande non reconnue", true);
    } catch (e) {
        console.error("Erreur commande vocale :", e);
        feedback("erreur lors de l'execution", true);
    }
}

// Force explicitement play OU pause (contrairement à togglePlay qui inverse l'état actuel) —
// plus fiable pour une commande vocale où l'intention est explicite ("pause" doit toujours mettre en pause,
// jamais relancer la lecture par erreur si l'état réel diffère de ce qu'on pense).
// Retourne true si la commande a bien été acceptée par Spotify, false sinon.
async function forcePlaybackState(desiredState) {
    if (!currentToken) return false;
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/' + desiredState, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (response.status === 404) {
            return false; // aucun appareil actif
        }
        if (!response.ok && response.status !== 204) {
            return false;
        }

        // Mise à jour immédiate et locale, pour que le Mode DJ réagisse tout de suite
        isCurrentlyPlaying = (desiredState === 'play');

        setTimeout(updateNowPlaying, 500);
        return true;
    } catch (e) {
        console.error("Erreur forcePlaybackState :", e);
        return false;
    }
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
// STATISTIQUES D'ÉCOUTE 📊 — Chart.js, basé sur /me/player/recently-played
// (accumulé en local car Spotify n'expose pas d'historique long terme)
// ==========================================
let statsChartInstance = null;
let statsCurrentMode = 'day'; // 'day' ou 'week'

// Charge Chart.js depuis un CDN si pas déjà présent sur la page
function loadChartJsIfNeeded() {
    if (window.Chart) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Impossible de charger Chart.js"));
        document.head.appendChild(script);
    });
}

// Fusionne les nouvelles écoutes récentes dans l'historique local (dédoublonné par horodatage précis)
function mergeListeningHistory(items) {
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
    } catch (e) {
        history = [];
    }

    const existingTimestamps = new Set(history.map(h => h.playedAt));

    items.forEach(item => {
        const track = item.track;
        if (!track || !item.played_at) return;
        if (existingTimestamps.has(item.played_at)) return; // déjà enregistré

        history.push({
            playedAt: item.played_at,
            durationMs: track.duration_ms || 0
        });
    });

    // Garde un historique raisonnable (1 an max) pour ne pas faire grossir localStorage indéfiniment
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    history = history.filter(h => new Date(h.playedAt).getTime() > oneYearAgo);

    localStorage.setItem('listeningHistory', JSON.stringify(history));
    return history;
}

async function fetchListeningStats() {
    if (!currentToken) return [];
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const data = await response.json();
        return mergeListeningHistory(data.items || []);
    } catch (e) {
        console.error("Erreur recuperation stats :", e);
        try {
            return JSON.parse(localStorage.getItem('listeningHistory') || '[]');
        } catch (e2) {
            return [];
        }
    }
}

// Regroupe l'historique par jour (14 derniers jours) ou par semaine (12 dernières semaines)
function aggregateListeningHistory(history, mode) {
    const buckets = {}; // clé -> minutes cumulées

    history.forEach(entry => {
        const date = new Date(entry.playedAt);
        let key;
        if (mode === 'week') {
            // Numéro de semaine ISO approximatif (lundi comme premier jour)
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = (d.getUTCDay() + 6) % 7;
            d.setUTCDate(d.getUTCDate() - dayNum + 3);
            const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
            const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
            key = d.getUTCFullYear() + '-S' + weekNum;
        } else {
            key = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
        buckets[key] = (buckets[key] || 0) + (entry.durationMs / 60000);
    });

    const sortedKeys = Object.keys(buckets).sort((a, b) => {
        // Tri par date réelle plutôt que par ordre alphabétique du libellé
        const entryA = history.find(h => (mode === 'week' ? aggregateKeyFor(h, 'week') : aggregateKeyFor(h, 'day')) === a);
        const entryB = history.find(h => (mode === 'week' ? aggregateKeyFor(h, 'week') : aggregateKeyFor(h, 'day')) === b);
        return new Date(entryA ? entryA.playedAt : 0) - new Date(entryB ? entryB.playedAt : 0);
    });

    // Limite le nombre de colonnes affichées (14 jours ou 12 semaines max)
    const limit = mode === 'week' ? 12 : 14;
    const limitedKeys = sortedKeys.slice(-limit);

    return {
        labels: limitedKeys,
        values: limitedKeys.map(k => Math.round(buckets[k]))
    };
}

function aggregateKeyFor(entry, mode) {
    const date = new Date(entry.playedAt);
    if (mode === 'week') {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = (d.getUTCDay() + 6) % 7;
        d.setUTCDate(d.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
        const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
        return d.getUTCFullYear() + '-S' + weekNum;
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

async function toggleStats() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const plContainer = document.getElementById('playlist-container');
    if (plContainer) { plContainer.style.display = 'none'; plContainer.innerHTML = ''; }

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();

    if (resultsContainer.dataset.view === 'stats') {
        resultsContainer.innerHTML = '';
        resultsContainer.dataset.view = '';
        return;
    }

    resultsContainer.dataset.view = 'stats';
    resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement des statistiques...</p>";

    try {
        await loadChartJsIfNeeded();
        const history = await fetchListeningStats();
        renderStatsPanel(history);
    } catch (e) {
        console.error(e);
        resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Erreur lors du chargement des statistiques.</p>";
    }
}

function renderStatsPanel(history) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "";
    resultsContainer.style.textAlign = 'left';

    const titleHeader = document.createElement('p');
    titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
    titleHeader.innerText = "STATISTIQUES D'ÉCOUTE";
    resultsContainer.appendChild(titleHeader);

    if (history.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style = "font-size:0.9rem; color:var(--text-grey); margin:5px;";
        emptyMsg.innerText = "Pas encore assez de données. Reviens après avoir écouté de la musique.";
        resultsContainer.appendChild(emptyMsg);
        return;
    }

    // Boutons Jour / Semaine
    const tabWrapper = document.createElement('div');
    tabWrapper.style.cssText = "display:flex; gap:8px; margin: 0 5px 12px 5px;";

    ['day', 'week'].forEach(mode => {
        const tabBtn = document.createElement('button');
        tabBtn.innerText = mode === 'day' ? 'Par jour' : 'Par semaine';
        tabBtn.style.cssText = `
            flex: 1;
            padding: 6px;
            border-radius: 14px;
            border: 1px solid var(--spotify-green);
            background: ${statsCurrentMode === mode ? 'var(--spotify-green)' : 'none'};
            color: ${statsCurrentMode === mode ? '#000' : 'var(--spotify-green)'};
            font-size: 0.75rem;
            font-weight: bold;
            cursor: pointer;
        `;
        tabBtn.onclick = () => {
            statsCurrentMode = mode;
            renderStatsPanel(history);
        };
        tabWrapper.appendChild(tabBtn);
    });
    resultsContainer.appendChild(tabWrapper);

    // Canvas du graphique
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.cssText = "width: 100%; height: 220px; padding: 0 5px; box-sizing: border-box;";
    const canvas = document.createElement('canvas');
    canvas.id = 'stats-chart-canvas';
    canvasWrapper.appendChild(canvas);
    resultsContainer.appendChild(canvasWrapper);

    const { labels, values } = aggregateListeningHistory(history, statsCurrentMode);

    if (statsChartInstance) {
        statsChartInstance.destroy();
        statsChartInstance = null;
    }

    statsChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Minutes écoutées',
                data: values,
                backgroundColor: '#1DB954',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#b3b3b3', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#b3b3b3', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.08)' } }
            }
        }
    });
}

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
// --- LECTURE ALÉATOIRE 🔀 : tire un titre au hasard dans TOUT le catalogue Spotify ---
// --- LECTURE ALÉATOIRE 🔀 : pioche dans TES titres likés OU une de tes playlists (au hasard) ---
// On évite volontairement l'endpoint /search (trop instable / rate-limité), au profit de
// /me/tracks et /playlists/{id}/items qui fonctionnent déjà de façon fiable ailleurs dans l'app.

// Tire un titre au hasard dans les titres likés (1 requête pour le total, 1 requête ciblée)
async function getRandomLikedTrack() {
    const countResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    });
    if (!countResponse.ok) return null;
    const countData = await countResponse.json();
    const total = countData.total || 0;
    if (total === 0) return null;

    const randomOffset = Math.floor(Math.random() * total);
    const trackResponse = await fetch(`https://api.spotify.com/v1/me/tracks?limit=1&offset=${randomOffset}`, {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    });
    if (!trackResponse.ok) return null;
    const trackData = await trackResponse.json();
    return trackData.items && trackData.items.length > 0 ? trackData.items[0].track : null;
}

// Tire un titre au hasard dans une playlist choisie au hasard parmi les tiennes
async function getRandomPlaylistTrack() {
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    });
    if (!playlistsResponse.ok) return null;
    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items ? playlistsData.items.filter(p => p) : [];
    if (playlists.length === 0) return null;

    const randomPlaylist = playlists[Math.floor(Math.random() * playlists.length)];
    const totalTracks = (randomPlaylist.tracks && randomPlaylist.tracks.total !== undefined)
        ? randomPlaylist.tracks.total
        : (randomPlaylist.items && randomPlaylist.items.total !== undefined ? randomPlaylist.items.total : 0);
    if (!totalTracks || totalTracks === 0) return null;

    const randomOffset = Math.floor(Math.random() * totalTracks);
    const itemsResponse = await fetch(`https://api.spotify.com/v1/playlists/${randomPlaylist.id}/items?limit=1&offset=${randomOffset}`, {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    });
    if (!itemsResponse.ok) return null;
    const itemsData = await itemsResponse.json();
    const entry = itemsData.items && itemsData.items.length > 0 ? itemsData.items[0] : null;
    return entry ? (entry.item || entry.track) : null;
}

async function playRandomTrack() {
    if (!currentToken) return;
    const randomBtn = document.getElementById('random-track-btn');
    if (randomBtn) randomBtn.disabled = true;

    try {
        // 20% titres likés / 80% une playlist au hasard (tu as bien plus de titres cumulés dans tes playlists)
        const useLiked = Math.random() < 0.2;
        let track = useLiked ? await getRandomLikedTrack() : await getRandomPlaylistTrack();

        // Filet de sécurité : si la première tentative échoue, on essaie l'autre source avant d'abandonner
        if (!track) {
            track = useLiked ? await getRandomPlaylistTrack() : await getRandomLikedTrack();
        }

        if (track && track.uri) {
            await playTrack(track.uri);
        } else {
            alert("Aucun titre trouvé (vérifie que tu as des favoris ou des playlists non vides).");
        }
    } catch (e) {
        console.error("Erreur lecture aleatoire :", e);
        alert("Erreur lors du tirage aléatoire.");
    } finally {
        if (randomBtn) randomBtn.disabled = false;
    }
}

// ==========================================
// SOUNDBOARD 🎵 — 8 boutons de sons courts, synthétisés en JS (aucun fichier externe)
// ==========================================
let soundboardAudioCtx = null;

function getSoundboardAudioContext() {
    if (!soundboardAudioCtx) {
        soundboardAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (soundboardAudioCtx.state === 'suspended') {
        soundboardAudioCtx.resume();
    }
    return soundboardAudioCtx;
}

// Joue une note simple (oscillateur + enveloppe de volume)
function playTone(freq, duration, type, startTime, volume) {
    const ctx = getSoundboardAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + (startTime || 0));
    gain.gain.setValueAtTime(0, ctx.currentTime + (startTime || 0));
    gain.gain.linearRampToValueAtTime(volume || 0.3, ctx.currentTime + (startTime || 0) + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (startTime || 0) + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + (startTime || 0));
    osc.stop(ctx.currentTime + (startTime || 0) + duration + 0.05);
}

// Joue un court éclat de bruit blanc (percussions/cymbale)
function playNoiseBurst(duration, volume, filterFreq, startTime) {
    const ctx = getSoundboardAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const t0 = ctx.currentTime + (startTime || 0);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.25, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = filterFreq ? 'highpass' : 'lowpass';
    filter.frequency.value = filterFreq || 800;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
}

// Joue une note dont la fréquence glisse d'un point à un autre (sifflet, laser, boing...)
function playSweep(startFreq, endFreq, duration, type, volume, startTime) {
    const ctx = getSoundboardAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + (startTime || 0);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume || 0.3, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
}

const SOUND_EFFECTS = {
    trompette: () => {
        playTone(440, 0.15, 'sawtooth', 0, 0.35);
        playTone(660, 0.25, 'sawtooth', 0.1, 0.3);
    },
    guitare: () => {
        playTone(330, 0.4, 'triangle', 0, 0.3);
        playTone(494, 0.3, 'triangle', 0.02, 0.15);
    },
    tambour: () => {
        playTone(90, 0.15, 'sine', 0, 0.5);
        playNoiseBurst(0.08, 0.25, 0);
    },
    cloche: () => {
        playTone(880, 0.8, 'sine', 0, 0.25);
        playTone(1320, 0.6, 'sine', 0, 0.12);
    },
    saxophone: () => {
        playTone(220, 0.35, 'sawtooth', 0, 0.3);
        playTone(233, 0.35, 'sawtooth', 0.05, 0.2);
    },
    cymbale: () => {
        playNoiseBurst(0.6, 0.2, 3000);
    },
    corne: () => {
        playTone(150, 0.5, 'square', 0, 0.3);
    },
    piano: () => {
        playTone(523, 0.5, 'triangle', 0, 0.3);
        playTone(659, 0.5, 'sine', 0, 0.15);
    },
    violon: () => {
        playTone(587, 0.45, 'sawtooth', 0, 0.22);
        playTone(590, 0.45, 'sawtooth', 0.03, 0.15); // léger désaccord = effet de vibrato
    },
    flute: () => {
        playTone(784, 0.35, 'sine', 0, 0.22);
    },
    banjo: () => {
        playTone(392, 0.18, 'sawtooth', 0, 0.28);
        playTone(494, 0.15, 'triangle', 0.03, 0.15);
    },
    xylophone: () => {
        playTone(1047, 0.18, 'triangle', 0, 0.3);
    },
    harpe: () => {
        [523, 659, 784, 988].forEach((freq, i) => playTone(freq, 0.3, 'sine', i * 0.06, 0.18));
    },
    orgue: () => {
        playTone(261, 0.5, 'sine', 0, 0.15);
        playTone(392, 0.5, 'sine', 0, 0.12);
        playTone(523, 0.5, 'sine', 0, 0.1);
    },
    maracas: () => {
        playNoiseBurst(0.05, 0.2, 4000);
        playNoiseBurst(0.05, 0.18, 4000, 0.08);
        playNoiseBurst(0.05, 0.15, 4000, 0.16);
    },
    gong: () => {
        playTone(80, 1.4, 'sine', 0, 0.3);
        playNoiseBurst(0.3, 0.1, 0);
    },
    sifflet: () => {
        playSweep(400, 1400, 0.35, 'sine', 0.3, 0);
    },
    laser: () => {
        playSweep(1600, 100, 0.3, 'sawtooth', 0.25, 0);
    },
    boing: () => {
        playSweep(600, 100, 0.15, 'sine', 0.3, 0);
        playSweep(200, 500, 0.2, 'sine', 0.2, 0.15);
    },
    applaudissements: () => {
        for (let i = 0; i < 6; i++) {
            playNoiseBurst(0.04, 0.18, 3500 + Math.random() * 1500, i * 0.09 + Math.random() * 0.02);
        }
    }
};

const SOUND_BUTTONS = [
    { key: 'trompette', label: '🎺 Trompette' },
    { key: 'guitare', label: '🎸 Guitare' },
    { key: 'tambour', label: '🥁 Tambour' },
    { key: 'cloche', label: '🔔 Cloche' },
    { key: 'saxophone', label: '🎷 Sax' },
    { key: 'cymbale', label: '🪘 Cymbale' },
    { key: 'corne', label: '📯 Corne' },
    { key: 'piano', label: '🎹 Piano' },
    { key: 'violon', label: '🎻 Violon' },
    { key: 'flute', label: '🪈 Flûte' },
    { key: 'banjo', label: '🪕 Banjo' },
    { key: 'xylophone', label: '🎼 Xylophone' },
    { key: 'harpe', label: '🎶 Harpe' },
    { key: 'orgue', label: '⛪ Orgue' },
    { key: 'maracas', label: '🪇 Maracas' },
    { key: 'gong', label: '🛎️ Gong' },
    { key: 'sifflet', label: '😙 Sifflet' },
    { key: 'laser', label: '👽 Laser' },
    { key: 'boing', label: '🐸 Boing' },
    { key: 'applaudissements', label: '👏 Clap' }
];

function playSoundEffect(key) {
    const fn = SOUND_EFFECTS[key];
    if (fn) fn();
}

function toggleSoundboard() {
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('volume-control-zone').style.display = 'none';
    const plContainer = document.getElementById('playlist-container');
    if (plContainer) { plContainer.style.display = 'none'; plContainer.innerHTML = ''; }

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.dataset.topTracksOpen = '';
    stopQueueAutoRefresh();

    if (resultsContainer.dataset.view === 'soundboard') {
        resultsContainer.innerHTML = '';
        resultsContainer.dataset.view = '';
        return;
    }

    resultsContainer.dataset.view = 'soundboard';
    renderSoundboard();
}

function renderSoundboard() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    resultsContainer.style.textAlign = 'left';

    const titleHeader = document.createElement('p');
    titleHeader.style = "color: var(--spotify-green); font-weight: bold; font-size: 0.8rem; margin: 5px 0 10px 5px;";
    titleHeader.innerText = "SONS";
    resultsContainer.appendChild(titleHeader);

    const grid = document.createElement('div');
    grid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 5px;";

    SOUND_BUTTONS.forEach(({ key, label }) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.style.cssText = `
            background: none;
            border: 1px solid var(--spotify-green);
            color: var(--spotify-green);
            border-radius: 8px;
            padding: 14px 8px;
            font-size: 0.8rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.15s;
        `;
        btn.onmouseenter = () => { btn.style.background = 'var(--spotify-green)'; btn.style.color = '#000'; };
        btn.onmouseleave = () => { btn.style.background = 'none'; btn.style.color = 'var(--spotify-green)'; };
        btn.onclick = () => {
            playSoundEffect(key);
            btn.style.transform = 'scale(0.92)';
            setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);
        };
        grid.appendChild(btn);
    });

    resultsContainer.appendChild(grid);
}

// ==========================================
// MODE DJ 🎧 — annonce vocale du prochain titre via Gemini TTS (relais Apps Script)
// ==========================================
let djModeEnabled = false;
let djAnnounceTimeoutId = null;
let djLastKnownPlayingState = true;

function injectDjModeStyles() {
    if (document.getElementById('dj-mode-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'dj-mode-inline-style';
    styleTag.textContent = `
        #dj-mode-btn.active {
            color: #2b7cff !important;
            filter: drop-shadow(0 0 6px rgba(43,124,255,0.7));
        }
        #dj-visual {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 14px;
            margin-top: 10px;
            padding: 10px;
        }
        #dj-visual .dj-disc {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: radial-gradient(circle, #2b7cff 0%, #111 70%);
            border: 3px solid #2b7cff;
            position: relative;
            animation: dj-spin 1.4s linear infinite;
        }
        #dj-visual .dj-disc::after {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 6px; height: 6px;
            background: #fff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }
        @keyframes dj-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        #dj-visual .dj-bars {
            display: flex;
            align-items: flex-end;
            gap: 3px;
            height: 30px;
        }
        #dj-visual .dj-bars span {
            width: 5px;
            background: #2b7cff;
            border-radius: 2px;
            animation: dj-bar-bounce 0.9s ease-in-out infinite;
        }
        #dj-visual .dj-bars span:nth-child(1) { animation-delay: 0s; }
        #dj-visual .dj-bars span:nth-child(2) { animation-delay: 0.15s; }
        #dj-visual .dj-bars span:nth-child(3) { animation-delay: 0.3s; }
        #dj-visual .dj-bars span:nth-child(4) { animation-delay: 0.45s; }
        @keyframes dj-bar-bounce {
            0%, 100% { height: 6px; }
            50% { height: 28px; }
        }
        #dj-visual.speaking .dj-disc {
            animation-duration: 0.4s;
            box-shadow: 0 0 14px 4px rgba(43,124,255,0.7);
        }
    `;
    document.head.appendChild(styleTag);
}
injectDjModeStyles();

function ensureDjVisual() {
    let visual = document.getElementById('dj-visual');
    if (!visual) {
        visual = document.createElement('div');
        visual.id = 'dj-visual';
        visual.innerHTML = `
            <div class="dj-disc"></div>
            <div class="dj-bars"><span></span><span></span><span></span><span></span></div>
            <div class="dj-disc"></div>
        `;
        const djBtn = document.getElementById('dj-mode-btn');
        if (djBtn && djBtn.parentElement) {
            djBtn.parentElement.insertAdjacentElement('afterend', visual);
        } else {
            document.body.appendChild(visual);
        }
    }
    return visual;
}

function toggleDjMode() {
    djModeEnabled = !djModeEnabled;
    const btn = document.getElementById('dj-mode-btn');
    if (btn) btn.classList.toggle('active', djModeEnabled);

    const visual = ensureDjVisual();
    visual.style.display = djModeEnabled ? 'flex' : 'none';

    if (djModeEnabled) {
        djLastKnownPlayingState = isCurrentlyPlaying; // évite un faux déclenchement pause/reprise juste après activation
        if (trackDurationMs > 0) {
            scheduleDjAnnouncement(trackDurationMs - currentProgressMs, true);
        } else {
            console.warn("Mode DJ activé, mais aucun titre en cours détecté pour le moment.");
        }
    }
    if (!djModeEnabled && djAnnounceTimeoutId) {
        clearTimeout(djAnnounceTimeoutId);
        djAnnounceTimeoutId = null;
    }
}

// Détecte les transitions pause/lecture et gèle/relance le minuteur DJ en conséquence.
// Appelée chaque seconde depuis tickLocalProgress (qui tourne même quand la lecture est en pause).
function checkDjPauseState() {
    if (!djModeEnabled) return;

    if (djLastKnownPlayingState && !isCurrentlyPlaying) {
        // Vient de passer en pause : on gèle le minuteur (annule le setTimeout en cours)
        djLastKnownPlayingState = false;
        if (djAnnounceTimeoutId) {
            clearTimeout(djAnnounceTimeoutId);
            djAnnounceTimeoutId = null;
            console.log("Mode DJ : lecture en pause, minuteur d'annonce gelé.");
        }
    } else if (!djLastKnownPlayingState && isCurrentlyPlaying) {
        // Vient de reprendre : on reprogramme avec le VRAI temps restant actuel
        djLastKnownPlayingState = true;
        if (trackDurationMs > 0) {
            console.log("Mode DJ : lecture reprise, minuteur d'annonce relancé.");
            scheduleDjAnnouncement(trackDurationMs - currentProgressMs);
        }
    }
}

// Programme l'annonce entre 5 et 10 secondes (aléatoire) avant la fin du titre en cours
function scheduleDjAnnouncement(remainingMs, showFeedback) {
    if (djAnnounceTimeoutId) {
        clearTimeout(djAnnounceTimeoutId);
        djAnnounceTimeoutId = null;
    }
    if (!djModeEnabled) return;

    const CALL_LEAD_MS = 15000; // on lance l'appel à Gemini 15s avant la fin
    const PLAY_LEAD_MS = 5000;  // mais on ne LANCE l'audio que 5s avant la fin (effet transition)

    const delay = Math.max(0, remainingMs - CALL_LEAD_MS);
    // Timestamp absolu (horloge réelle) auquel l'audio doit démarrer, calculé une fois pour toutes
    const targetPlayTimestamp = Date.now() + remainingMs - PLAY_LEAD_MS;

    console.log(`Mode DJ : appel programmé dans ${Math.round(delay / 1000)}s, lecture visée ${PLAY_LEAD_MS/1000}s avant la fin`);
    if (showFeedback) {
        showDjFeedback(`🎧 Mode DJ activé — appel dans ~${Math.round(delay / 1000)}s.`, false);
    }

    djAnnounceTimeoutId = setTimeout(() => {
        triggerDjAnnouncement(targetPlayTimestamp);
    }, delay);
}

// Récupère le titre suivant dans la file d'attente au moment précis de l'annonce
async function getNextQueuedTrackInfo() {
    if (!currentToken) return null;
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        if (!response.ok) return null;
        const data = await response.json();
        const next = data.queue && data.queue.length > 0 ? data.queue[0] : null;
        if (!next) return null;
        return {
            name: next.name,
            artist: next.artists && next.artists.length > 0
                ? next.artists.map(a => a.name).join(', ')
                : (next.show ? next.show.name : 'Artiste inconnu')
        };
    } catch (e) {
        console.error("Erreur recuperation prochain titre :", e);
        return null;
    }
}

// Convertit l'audio PCM brut (16 bits, mono, 24kHz) renvoyé par Gemini en son jouable
async function playPcmAudio(base64Data) {
    const ctx = getSoundboardAudioContext();
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    const sampleCount = Math.floor(len / 2);
    const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
    const channelData = audioBuffer.getChannelData(0);
    const dataView = new DataView(bytes.buffer);

    for (let i = 0; i < sampleCount; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
    }

    return new Promise((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Amplifie le volume du DJ (voix superposée à Spotify, sinon trop faible),
        // avec un compresseur pour éviter la saturation/distorsion à fort gain.
        const gainNode = ctx.createGain();
        gainNode.gain.value = 3.2;

        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, ctx.currentTime);
        compressor.knee.setValueAtTime(20, ctx.currentTime);
        compressor.ratio.setValueAtTime(8, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.15, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(ctx.destination);

        source.onended = resolve;
        source.start();
    });
}

async function triggerDjAnnouncement(targetPlayTimestamp) {
    console.log("Mode DJ : declenchement de l'annonce...");
    if (!djModeEnabled) {
        console.log("Mode DJ : annulé, le mode a été désactivé entre-temps.");
        return;
    }

    const nextTrack = await getNextQueuedTrackInfo();
    if (!nextTrack) {
        console.warn("Mode DJ : aucun titre dans la file d'attente, rien à annoncer. Ajoute un titre via 📥 pour tester.");
        showDjFeedback("Aucun titre dans la file d'attente, rien à annoncer.", true);
        return;
    }
    console.log("Mode DJ : prochain titre en file =", nextTrack.name, "-", nextTrack.artist);

    const visual = ensureDjVisual();

    try {
        const callStartedAt = Date.now();
        const MAX_ATTEMPTS = 4; // ~2s par appel Gemini en moyenne, donc jusqu'à ~8s au total
        let result = { success: false };

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            result = await callDjAnnounceRelay(nextTrack);
            if (result.success && result.audioBase64) break;

            console.warn(`Mode DJ : tentative ${attempt}/${MAX_ATTEMPTS} sans audio`, result.error);
            if (attempt < MAX_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        const totalCallDurationMs = Date.now() - callStartedAt;
        console.log(`Mode DJ : duree totale de l'appel (avec tentatives) = ${totalCallDurationMs}ms`);

        if (result.success && result.audioBase64) {
            // On attend le moment précis visé (5s avant la fin) avant de jouer, même si l'audio
            // est arrivé plus tôt — sinon on joue dès que prêt si on a déjà dépassé ce moment.
            const waitMs = targetPlayTimestamp ? Math.max(0, targetPlayTimestamp - Date.now()) : 0;
            if (waitMs > 0) {
                console.log(`Mode DJ : audio pret, attente de ${Math.round(waitMs / 1000)}s avant lecture (pour la transition)`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }
            if (!djModeEnabled) return; // vérifie que le mode n'a pas été désactivé pendant l'attente

            console.log("Mode DJ : lecture en cours.");
            visual.classList.add('speaking');
            showDjFeedback(`🎧 Annonce : ${nextTrack.name} — ${nextTrack.artist}`, false);
            await playPcmAudio(result.audioBase64);
        } else {
            // Indique clairement si l'échec ressemble à un manque de temps (réponse lente) ou autre chose
            const likelyTimeout = totalCallDurationMs > 8000;
            console.error(`Mode DJ : echec apres ${MAX_ATTEMPTS} tentatives (${totalCallDurationMs}ms, ${likelyTimeout ? 'probable manque de temps' : 'pas un souci de délai'}) :`, result.error, result.raw);
            showDjFeedback(
                `Échec après ${MAX_ATTEMPTS} tentatives (${(totalCallDurationMs/1000).toFixed(1)}s${likelyTimeout ? ', probablement trop lent' : ''}) : ` + (result.error || "réponse invalide de Gemini"),
                true
            );
        }
    } catch (e) {
        console.error("Mode DJ : erreur reseau/JS :", e);
        showDjFeedback("Erreur réseau lors de l'annonce.", true);
    } finally {
        visual.classList.remove('speaking');
    }
}

// Un seul appel au relais Apps Script — factorisé pour pouvoir être retenté facilement
async function callDjAnnounceRelay(nextTrack) {
    console.log("Mode DJ : appel du relais Apps Script...");
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'dj_announce',
            secret: APPS_SCRIPT_SECRET,
            trackName: nextTrack.name,
            artistName: nextTrack.artist
        })
    });

    if (!response.ok) {
        console.error("Mode DJ : le relais Apps Script a répondu avec le statut", response.status);
        return { success: false, error: `Erreur relais (statut ${response.status}).` };
    }

    const result = await response.json();
    console.log("Mode DJ : reponse du relais =", result);
    return result;
}

// Petit message temporaire (6s) pour visualiser ce qui se passe sans avoir à ouvrir la console
function showDjFeedback(msg, isError) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    const msgEl = document.createElement('p');
    msgEl.style.cssText = "font-size:0.85rem; color:" + (isError ? '#ef4444' : '#2b7cff') + "; margin:5px;";
    msgEl.innerText = msg;
    resultsContainer.innerHTML = "";
    resultsContainer.appendChild(msgEl);
    setTimeout(() => { if (msgEl.isConnected) msgEl.remove(); }, 6000);
}

// ==========================================
// ANECDOTE DJ 🎭 — le DJ raconte un fait amusant sur le titre EN COURS (pas le suivant)
// Bouton passe en bleu "surveillance" jusqu'à la fin de l'audio ou l'échec après 4 tentatives.
// ==========================================
function injectDjAnecdoteStyles() {
    if (document.getElementById('dj-anecdote-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'dj-anecdote-inline-style';
    styleTag.textContent = `
        #dj-anecdote-btn.watching {
            color: #2b7cff !important;
            filter: drop-shadow(0 0 6px rgba(43,124,255,0.7));
            animation: dj-anecdote-pulse 1.2s ease-in-out infinite;
        }
        @keyframes dj-anecdote-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectDjAnecdoteStyles();

let djAnecdoteInProgress = false;

async function triggerDjAnecdote() {
    if (djAnecdoteInProgress) {
        console.log("Anecdote DJ : deja en cours, ignore le nouveau clic.");
        return;
    }
    if (!currentToken) return;

    const trackName = document.getElementById('track-title') ? document.getElementById('track-title').innerText : null;
    const artistName = document.getElementById('track-artist') ? document.getElementById('track-artist').innerText : null;

    if (!trackName || !artistName || trackName === 'Aucun titre') {
        showDjFeedback("Aucun titre en cours pour générer une anecdote.", true);
        return;
    }

    const btn = document.getElementById('dj-anecdote-btn');
    djAnecdoteInProgress = true;
    if (btn) btn.classList.add('watching'); // passe en bleu "surveillance"

    try {
        const callStartedAt = Date.now();
        const MAX_ATTEMPTS = 4;
        let result = { success: false };

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`Anecdote DJ : tentative ${attempt}/${MAX_ATTEMPTS}...`);
            result = await callDjAnecdoteRelay(trackName, artistName);
            if (result.success && result.audioBase64) break;

            console.warn(`Anecdote DJ : tentative ${attempt}/${MAX_ATTEMPTS} sans audio`, result.error);
            if (attempt < MAX_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        const totalDurationMs = Date.now() - callStartedAt;
        console.log(`Anecdote DJ : duree totale = ${totalDurationMs}ms`);

        if (result.success && result.audioBase64) {
            showDjFeedback(`🎭 Anecdote sur : ${trackName} — ${artistName}`, false);
            await playPcmAudio(result.audioBase64); // le bouton reste bleu jusqu'à la fin de la lecture
        } else {
            const likelyTimeout = totalDurationMs > 8000;
            console.error(`Anecdote DJ : echec apres ${MAX_ATTEMPTS} tentatives :`, result.error, result.raw);
            showDjFeedback(
                `Anecdote : échec après ${MAX_ATTEMPTS} tentatives${likelyTimeout ? ' (probablement trop lent)' : ''}. ${result.error || ''}`,
                true
            );
        }
    } catch (e) {
        console.error("Anecdote DJ : erreur reseau/JS :", e);
        showDjFeedback("Erreur réseau lors de l'anecdote.", true);
    } finally {
        djAnecdoteInProgress = false;
        if (btn) btn.classList.remove('watching'); // fin de la surveillance, qu'il y ait eu succès ou échec
    }
}

async function callDjAnecdoteRelay(trackName, artistName) {
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'dj_anecdote',
            secret: APPS_SCRIPT_SECRET,
            trackName: trackName,
            artistName: artistName
        })
    });

    if (!response.ok) {
        return { success: false, error: `Erreur relais (statut ${response.status}).` };
    }
    return await response.json();
}

// ==========================================
// PUZZLE POCHETTE 🧩 — reconstitue la pochette du titre en cours, découpée en 4x4
// ==========================================
let puzzleGameOpen = false;
let puzzleTrackId = null;
let puzzleBoard = new Array(16).fill(null); // index case -> correctIndex de la pièce posée, ou null
let puzzleTray = []; // correctIndex des pièces encore disponibles à droite
let puzzleSelectedPiece = null; // correctIndex actuellement sélectionné dans le plateau
let puzzleTimerIntervalId = null;
let puzzleImageUrl = '';
let puzzleTrackName = '';

function injectPuzzleStyles() {
    if (document.getElementById('puzzle-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'puzzle-inline-style';
    styleTag.textContent = `
        #puzzle-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #0d0d0d;
            z-index: 2000;
            flex-direction: column;
            padding: 14px;
            box-sizing: border-box;
        }
        #puzzle-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
        }
        #puzzle-score {
            color: var(--spotify-green, #1DB954);
            font-weight: bold;
            font-size: 0.95rem;
        }
        #puzzle-timer {
            color: #fff;
            font-weight: bold;
            font-size: 0.95rem;
        }
        #puzzle-close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.6rem;
            cursor: pointer;
            line-height: 1;
        }
        #puzzle-main {
            display: flex;
            flex: 1;
            gap: 12px;
            align-items: flex-start;
            justify-content: center;
            position: relative;
            flex-wrap: wrap;
        }
        #puzzle-board-wrapper {
            position: relative;
            width: 260px;
            height: 260px;
            flex-shrink: 0;
        }
        #puzzle-board {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 1fr);
            width: 100%;
            height: 100%;
            gap: 2px;
            background: #222;
            border: 2px solid var(--spotify-green, #1DB954);
            box-sizing: border-box;
        }
        .puzzle-slot {
            background-color: #1a1a1a;
            background-repeat: no-repeat;
            background-size: 400% 400%; /* pourcentage = relatif à la taille de CETTE case, indépendant des pixels réels */
            cursor: pointer;
        }
        .puzzle-slot.filled.correct {
            outline: 2px solid var(--spotify-green, #1DB954);
        }
        .puzzle-slot.filled.wrong {
            outline: 2px solid #ef4444;
        }
        #puzzle-tray {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            width: 140px;
            flex-shrink: 0;
        }
        .puzzle-piece {
            width: 100%;
            aspect-ratio: 1 / 1;
            background-repeat: no-repeat;
            background-size: 400% 400%; /* même principe : relatif à la taille de CETTE pièce */
            cursor: pointer;
            border: 2px solid transparent;
            box-sizing: border-box;
        }
        .puzzle-piece.selected {
            border-color: #fff;
            transform: scale(1.05);
        }
        #puzzle-complete-msg {
            display: none;
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            color: var(--spotify-green, #1DB954);
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 0.85rem;
            font-weight: bold;
            padding: 14px;
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(styleTag);
}
injectPuzzleStyles();

function ensurePuzzleOverlay() {
    let overlay = document.getElementById('puzzle-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'puzzle-overlay';
    overlay.innerHTML = `
        <div id="puzzle-topbar">
            <span id="puzzle-score">Score : 0/16</span>
            <span id="puzzle-timer">--:--</span>
            <button id="puzzle-close-btn" onclick="togglePuzzleGame()">✕</button>
        </div>
        <div id="puzzle-main">
            <div id="puzzle-board-wrapper">
                <div id="puzzle-board"></div>
                <div id="puzzle-complete-msg"></div>
            </div>
            <div id="puzzle-tray"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function togglePuzzleGame() {
    const overlay = ensurePuzzleOverlay();
    const isCurrentlyClosed = (overlay.style.display === 'none' || overlay.style.display === '');
    puzzleGameOpen = isCurrentlyClosed;

    if (puzzleGameOpen) {
        overlay.style.display = 'flex';
        initPuzzleForCurrentTrack();
        if (puzzleTimerIntervalId) clearInterval(puzzleTimerIntervalId);
        puzzleTimerIntervalId = setInterval(updatePuzzleTimerDisplay, 1000);
        updatePuzzleTimerDisplay();
    } else {
        overlay.style.display = 'none';
        if (puzzleTimerIntervalId) {
            clearInterval(puzzleTimerIntervalId);
            puzzleTimerIntervalId = null;
        }
    }
}

function shufflePuzzleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initPuzzleForCurrentTrack() {
    const artEl = document.getElementById('track-art');
    const titleEl = document.getElementById('track-title');
    puzzleImageUrl = artEl ? artEl.src : '';
    puzzleTrackName = titleEl ? titleEl.innerText : 'ce titre';
    puzzleTrackId = lastTrackId;

    puzzleBoard = new Array(16).fill(null);
    puzzleTray = shufflePuzzleArray([...Array(16).keys()]);
    puzzleSelectedPiece = null;

    const completeMsg = document.getElementById('puzzle-complete-msg');
    if (completeMsg) completeMsg.style.display = 'none';

    renderPuzzleBoard();
    renderPuzzleTray();
    updatePuzzleScore();
}

// Position en % pour chaque pièce (0,1,2,3 en ligne/colonne sur une grille 4x4)
function pieceBackgroundStyle(pieceIndex) {
    const row = Math.floor(pieceIndex / 4);
    const col = pieceIndex % 4;
    const posX = (col / 3) * 100;
    const posY = (row / 3) * 100;
    return `background-image: url('${puzzleImageUrl}'); background-position: ${posX}% ${posY}%;`;
}

function renderPuzzleBoard() {
    const board = document.getElementById('puzzle-board');
    if (!board) return;
    board.innerHTML = '';

    for (let slotIndex = 0; slotIndex < 16; slotIndex++) {
        const slot = document.createElement('div');
        slot.className = 'puzzle-slot';
        const placedPiece = puzzleBoard[slotIndex];

        if (placedPiece !== null) {
            slot.style.cssText += pieceBackgroundStyle(placedPiece);
            slot.classList.add('filled');
            slot.classList.add(placedPiece === slotIndex ? 'correct' : 'wrong');
            slot.onclick = () => removePieceFromSlot(slotIndex);
        } else {
            slot.onclick = () => placeSelectedPieceInSlot(slotIndex);
        }
        board.appendChild(slot);
    }
}

function renderPuzzleTray() {
    const tray = document.getElementById('puzzle-tray');
    if (!tray) return;
    tray.innerHTML = '';

    puzzleTray.forEach(pieceIndex => {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.style.cssText = pieceBackgroundStyle(pieceIndex);
        if (puzzleSelectedPiece === pieceIndex) piece.classList.add('selected');
        piece.onclick = () => selectTrayPiece(pieceIndex);
        tray.appendChild(piece);
    });
}

function selectTrayPiece(pieceIndex) {
    puzzleSelectedPiece = (puzzleSelectedPiece === pieceIndex) ? null : pieceIndex;
    renderPuzzleTray();
}

function placeSelectedPieceInSlot(slotIndex) {
    if (puzzleSelectedPiece === null) return;
    puzzleBoard[slotIndex] = puzzleSelectedPiece;
    puzzleTray = puzzleTray.filter(p => p !== puzzleSelectedPiece);
    puzzleSelectedPiece = null;

    renderPuzzleBoard();
    renderPuzzleTray();
    updatePuzzleScore();
    checkPuzzleCompletion();
}

function removePieceFromSlot(slotIndex) {
    const pieceIndex = puzzleBoard[slotIndex];
    if (pieceIndex === null) return;
    puzzleBoard[slotIndex] = null;
    puzzleTray.push(pieceIndex);

    renderPuzzleBoard();
    renderPuzzleTray();
    updatePuzzleScore();
}

function updatePuzzleScore() {
    const scoreEl = document.getElementById('puzzle-score');
    if (!scoreEl) return;
    const correctCount = puzzleBoard.filter((val, idx) => val === idx).length;
    scoreEl.innerText = `Score : ${correctCount}/16`;
}

function checkPuzzleCompletion() {
    const allCorrect = puzzleBoard.every((val, idx) => val === idx);
    if (!allCorrect) return;

    const completeMsg = document.getElementById('puzzle-complete-msg');
    if (completeMsg) {
        completeMsg.innerText = `Bravo, vous avez réussi à terminer le puzzle de "${puzzleTrackName}" ! Veuillez attendre le titre suivant.`;
        completeMsg.style.display = 'flex';
    }
}

function updatePuzzleTimerDisplay() {
    const timerEl = document.getElementById('puzzle-timer');
    if (!timerEl) return;

    if (!trackDurationMs) {
        timerEl.innerText = '--:--';
        return;
    }
    const remainingMs = Math.max(0, trackDurationMs - currentProgressMs);
    timerEl.innerText = formatTime(remainingMs);

    // Si le titre a changé pendant que le puzzle est ouvert, on regénère automatiquement un nouveau puzzle
    if (puzzleGameOpen && lastTrackId !== puzzleTrackId) {
        initPuzzleForCurrentTrack();
    }
}

// ==========================================
// BLIND TEST EXPRESS 🎯 — devine le titre/artiste via la pochette floutée
// (pas d'extrait audio possible : preview_url est mort côté Spotify pour les nouvelles apps)
// ==========================================
let blindTestOpen = false;
let blindTestScore = 0;
let blindTestCurrentTrack = null;
let blindTestBlurLevel = 20;
let blindTestBlurIntervalId = null;
let blindTestFound = false;

function injectBlindTestStyles() {
    if (document.getElementById('blindtest-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'blindtest-inline-style';
    styleTag.textContent = `
        #blindtest-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #0d0d0d;
            z-index: 2000;
            flex-direction: column;
            align-items: center;
            padding: 14px;
            box-sizing: border-box;
        }
        #blindtest-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 320px;
            margin-bottom: 16px;
        }
        #blindtest-score {
            color: var(--spotify-green, #1DB954);
            font-weight: bold;
            font-size: 0.95rem;
        }
        #blindtest-close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.6rem;
            cursor: pointer;
            line-height: 1;
        }
        #blindtest-cover {
            width: 220px;
            height: 220px;
            border-radius: 8px;
            background-size: cover;
            background-position: center;
            background-color: #222;
            transition: filter 0.5s ease;
            margin-bottom: 18px;
        }
        #blindtest-input-row {
            display: flex;
            gap: 8px;
            width: 100%;
            max-width: 320px;
            margin-bottom: 10px;
        }
        #blindtest-guess-input {
            flex: 1;
            padding: 10px 12px;
            border-radius: 20px;
            border: 1px solid var(--spotify-green, #1DB954);
            background: #1a1a1a;
            color: #fff;
            font-size: 0.9rem;
        }
        #blindtest-submit-btn {
            background: var(--spotify-green, #1DB954);
            color: #000;
            border: none;
            padding: 10px 16px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
            font-size: 0.85rem;
        }
        #blindtest-feedback {
            min-height: 24px;
            font-size: 0.85rem;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
        }
        #blindtest-next-btn {
            background: none;
            border: 1px solid var(--text-grey, #b3b3b3);
            color: var(--text-grey, #b3b3b3);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            cursor: pointer;
        }
    `;
    document.head.appendChild(styleTag);
}
injectBlindTestStyles();

function ensureBlindTestOverlay() {
    let overlay = document.getElementById('blindtest-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'blindtest-overlay';
    overlay.innerHTML = `
        <div id="blindtest-topbar">
            <span id="blindtest-score">Score : 0</span>
            <button id="blindtest-close-btn" onclick="toggleBlindTest()">✕</button>
        </div>
        <div id="blindtest-cover"></div>
        <div id="blindtest-feedback"></div>
        <div id="blindtest-input-row">
            <input type="text" id="blindtest-guess-input" placeholder="Titre ou artiste ?">
            <button id="blindtest-submit-btn" onclick="submitBlindTestGuess()">Valider</button>
        </div>
        <button id="blindtest-next-btn" onclick="startNewBlindTestRound()">Titre suivant ➜</button>
    `;
    document.body.appendChild(overlay);

    // Valider avec la touche Entrée du clavier (mobile ou physique)
    overlay.querySelector('#blindtest-guess-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitBlindTestGuess();
    });

    return overlay;
}

function toggleBlindTest() {
    const overlay = ensureBlindTestOverlay();
    blindTestOpen = (overlay.style.display === 'none' || overlay.style.display === '');

    if (blindTestOpen) {
        overlay.style.display = 'flex';
        startNewBlindTestRound();
    } else {
        overlay.style.display = 'none';
        if (blindTestBlurIntervalId) {
            clearInterval(blindTestBlurIntervalId);
            blindTestBlurIntervalId = null;
        }
    }
}

async function startNewBlindTestRound() {
    if (blindTestBlurIntervalId) {
        clearInterval(blindTestBlurIntervalId);
        blindTestBlurIntervalId = null;
    }

    const feedbackEl = document.getElementById('blindtest-feedback');
    const coverEl = document.getElementById('blindtest-cover');
    const inputEl = document.getElementById('blindtest-guess-input');
    if (feedbackEl) { feedbackEl.innerText = "Chargement..."; feedbackEl.style.color = 'var(--text-grey)'; }
    if (inputEl) inputEl.value = '';
    blindTestFound = false;

    // Réutilise le même tirage que le bouton 🔀 (20% favoris / 80% playlist)
    const useLiked = Math.random() < 0.2;
    let track = useLiked ? await getRandomLikedTrack() : await getRandomPlaylistTrack();
    if (!track) track = useLiked ? await getRandomPlaylistTrack() : await getRandomLikedTrack();

    if (!track) {
        if (feedbackEl) { feedbackEl.innerText = "Impossible de tirer un titre, réessaie."; feedbackEl.style.color = '#ef4444'; }
        return;
    }

    blindTestCurrentTrack = track;
    blindTestBlurLevel = 20;

    const imgUrl = track.album && track.album.images && track.album.images.length > 0 ? track.album.images[0].url : '';
    if (coverEl) {
        coverEl.style.backgroundImage = `url('${imgUrl}')`;
        coverEl.style.filter = `blur(${blindTestBlurLevel}px)`;
    }
    if (feedbackEl) { feedbackEl.innerText = ''; }

    // La pochette se démasque progressivement toutes les 2s si le joueur ne trouve pas
    blindTestBlurIntervalId = setInterval(() => {
        if (blindTestFound) return;
        blindTestBlurLevel = Math.max(0, blindTestBlurLevel - 3);
        if (coverEl) coverEl.style.filter = `blur(${blindTestBlurLevel}px)`;
        if (blindTestBlurLevel === 0) {
            clearInterval(blindTestBlurIntervalId);
            blindTestBlurIntervalId = null;
        }
    }, 2000);
}

function normalizeGuessText(str) {
    return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // retire les accents
}

function submitBlindTestGuess() {
    if (!blindTestCurrentTrack || blindTestFound) return;
    const inputEl = document.getElementById('blindtest-guess-input');
    const feedbackEl = document.getElementById('blindtest-feedback');
    const coverEl = document.getElementById('blindtest-cover');
    if (!inputEl || !inputEl.value.trim()) return;

    const guess = normalizeGuessText(inputEl.value);
    const trackTitle = normalizeGuessText(blindTestCurrentTrack.name || '');
    const artistNames = (blindTestCurrentTrack.artists || []).map(a => normalizeGuessText(a.name));

    const isCorrect = (trackTitle && (guess.includes(trackTitle) || trackTitle.includes(guess)))
        || artistNames.some(a => a && (guess.includes(a) || a.includes(guess)));

    if (isCorrect) {
        blindTestFound = true;
        blindTestScore++;
        if (blindTestBlurIntervalId) { clearInterval(blindTestBlurIntervalId); blindTestBlurIntervalId = null; }
        if (coverEl) coverEl.style.filter = 'blur(0px)';
        const artistDisplay = (blindTestCurrentTrack.artists || []).map(a => a.name).join(', ');
        if (feedbackEl) {
            feedbackEl.innerText = `✅ Bravo ! C'était "${blindTestCurrentTrack.name}" — ${artistDisplay}`;
            feedbackEl.style.color = 'var(--spotify-green)';
        }
        document.getElementById('blindtest-score').innerText = `Score : ${blindTestScore}`;
    } else {
        if (feedbackEl) { feedbackEl.innerText = "❌ Pas encore, réessaie !"; feedbackEl.style.color = '#ef4444'; }
    }
    inputEl.value = '';
}

// ==========================================
// QUIZ MUSICAL 🧠 — devine le titre (+1) ET l'artiste (+1) du titre EN COURS
// ==========================================
let quizOpen = false;
let quizScore = 0;
let quizStep = 'title'; // 'title' puis 'artist'
let quizTitleFound = false;
let quizArtistFound = false;

function injectQuizStyles() {
    if (document.getElementById('quiz-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'quiz-inline-style';
    styleTag.textContent = `
        #quiz-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #0d0d0d;
            z-index: 2000;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 14px;
            box-sizing: border-box;
        }
        #quiz-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 320px;
            position: absolute;
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
        }
        #quiz-score {
            color: var(--spotify-green, #1DB954);
            font-weight: bold;
            font-size: 0.95rem;
        }
        #quiz-close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.6rem;
            cursor: pointer;
            line-height: 1;
        }
        #quiz-icon {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        #quiz-prompt {
            color: #fff;
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 16px;
            text-align: center;
        }
        #quiz-input-row {
            display: flex;
            gap: 8px;
            width: 100%;
            max-width: 320px;
            margin-bottom: 10px;
        }
        #quiz-guess-input {
            flex: 1;
            padding: 10px 12px;
            border-radius: 20px;
            border: 1px solid var(--spotify-green, #1DB954);
            background: #1a1a1a;
            color: #fff;
            font-size: 0.9rem;
        }
        #quiz-submit-btn {
            background: var(--spotify-green, #1DB954);
            color: #000;
            border: none;
            padding: 10px 16px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
            font-size: 0.85rem;
        }
        #quiz-feedback {
            min-height: 24px;
            font-size: 0.85rem;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
        }
        #quiz-next-btn {
            background: none;
            border: 1px solid var(--text-grey, #b3b3b3);
            color: var(--text-grey, #b3b3b3);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            cursor: pointer;
            margin-top: 6px;
        }
    `;
    document.head.appendChild(styleTag);
}
injectQuizStyles();

function ensureQuizOverlay() {
    let overlay = document.getElementById('quiz-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'quiz-overlay';
    overlay.innerHTML = `
        <div id="quiz-topbar">
            <span id="quiz-score">Score : 0</span>
            <button id="quiz-close-btn" onclick="toggleQuiz()">✕</button>
        </div>
        <div id="quiz-icon">🧠</div>
        <div id="quiz-prompt">Quel est le titre en cours d'écoute ?</div>
        <div id="quiz-feedback"></div>
        <div id="quiz-input-row">
            <input type="text" id="quiz-guess-input" placeholder="Ta réponse...">
            <button id="quiz-submit-btn" onclick="submitQuizGuess()">Valider</button>
        </div>
        <button id="quiz-next-btn" onclick="quizGoToNextTrack()">Titre suivant ➜</button>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#quiz-guess-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitQuizGuess();
    });

    return overlay;
}

function toggleQuiz() {
    const overlay = ensureQuizOverlay();
    quizOpen = (overlay.style.display === 'none' || overlay.style.display === '');

    if (quizOpen) {
        overlay.style.display = 'flex';
        startNewQuizRound();
    } else {
        overlay.style.display = 'none';
    }
}

function startNewQuizRound() {
    quizStep = 'title';
    quizTitleFound = false;
    quizArtistFound = false;

    const promptEl = document.getElementById('quiz-prompt');
    const feedbackEl = document.getElementById('quiz-feedback');
    const inputEl = document.getElementById('quiz-guess-input');

    if (promptEl) promptEl.innerText = "Quel est le titre en cours d'écoute ?";
    if (feedbackEl) feedbackEl.innerText = '';
    if (inputEl) { inputEl.value = ''; inputEl.disabled = false; inputEl.focus(); }
}

function submitQuizGuess() {
    const inputEl = document.getElementById('quiz-guess-input');
    const feedbackEl = document.getElementById('quiz-feedback');
    const promptEl = document.getElementById('quiz-prompt');
    if (!inputEl || !inputEl.value.trim()) return;

    const guess = normalizeGuessText(inputEl.value);
    const trackTitleEl = document.getElementById('track-title');
    const trackArtistEl = document.getElementById('track-artist');
    const trackTitle = trackTitleEl ? normalizeGuessText(trackTitleEl.innerText) : '';
    const trackArtists = trackArtistEl ? trackArtistEl.innerText.split(',').map(a => normalizeGuessText(a)) : [];

    if (quizStep === 'title') {
        const isCorrect = trackTitle && (guess.includes(trackTitle) || trackTitle.includes(guess));
        if (isCorrect) {
            quizTitleFound = true;
            quizScore++;
            document.getElementById('quiz-score').innerText = `Score : ${quizScore}`;
            if (feedbackEl) { feedbackEl.innerText = "✅ Bon titre !"; feedbackEl.style.color = 'var(--spotify-green)'; }
        } else {
            if (feedbackEl) { feedbackEl.innerText = "❌ Pas ce titre, mais on passe à l'artiste !"; feedbackEl.style.color = '#ef4444'; }
        }
        quizStep = 'artist';
        if (promptEl) promptEl.innerText = "Et quel est l'artiste ?";
        inputEl.value = '';
        inputEl.focus();

    } else if (quizStep === 'artist') {
        const isCorrect = trackArtists.some(a => a && (guess.includes(a) || a.includes(guess)));
        if (isCorrect) {
            quizArtistFound = true;
            quizScore++;
            document.getElementById('quiz-score').innerText = `Score : ${quizScore}`;
            if (feedbackEl) { feedbackEl.innerText = "✅ Bon artiste ! Tour terminé."; feedbackEl.style.color = 'var(--spotify-green)'; }
        } else {
            const artistDisplay = trackArtistEl ? trackArtistEl.innerText : '';
            if (feedbackEl) { feedbackEl.innerText = `❌ C'était "${artistDisplay}". Tour terminé.`; feedbackEl.style.color = '#ef4444'; }
        }
        quizStep = 'done';
        if (promptEl) promptEl.innerText = "Tour terminé — passe au titre suivant pour continuer.";
        inputEl.value = '';
        inputEl.disabled = true;
    }
}

async function quizGoToNextTrack() {
    await nextTrack();
    setTimeout(() => {
        startNewQuizRound();
    }, 900);
}

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
