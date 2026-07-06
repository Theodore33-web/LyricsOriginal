
const APP_VERSION = "v1.0.48";

const clientId = "91d4165085fd4ed3bd281f16667d64bc"; 
        const redirectUri = window.location.origin + window.location.pathname;
        let currentToken = "";
        let lastTrackId = "";
        let currentLyrics = [];
        let trackDurationMs = 0; 
        let libraryItems = [];
        let displayedCount = 10;
        const auddApiToken = "187ef3238849ff75583d237fa40dbb48"; 
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        let recentItems = [];        
        let displayedRecentCount = 10; 
     
        // --- CONFIGURATION GOOGLE DRIVE API ---
    

        let tokenClient;
        let gapiInited = false;
        let gisiInited = false;
        let googleAccessToken = null;
        let driveRecorder = null;
        let driveAudioChunks = [];
        let driveTimerInterval = null;
        let driveSecondsElapsed = 0;
        let finalAudioBlob = null;
        
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const scope = "user-read-private user-read-email user-modify-playback-state user-read-playback-state user-library-read user-library-modify playlist-read-private user-read-recently-played user-read-currently-playing";
        if (code) {
            document.getElementById('login-section').style.display = 'none';
            handleCallback(code);
        } else {
            document.getElementById('login-btn').onclick = () => redirectToSpotify();
        }

        function gapiLoad() {
            gapi.load('client', async () => {
                await gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] });
                gapiInited = true;
            });
        }

        function gisInit() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse.error !== undefined) throw (tokenResponse);
                    googleAccessToken = tokenResponse.access_token;
                    executeActualUpload(); 
                },
            });
            gisiInited = true;
        }

        window.onload = function() {
            gapiLoad();
            gisInit();
        };

        function toggleProfileCard() {
            const profileZone = document.getElementById('profile-card-zone');
            document.getElementById('search-results').innerHTML = ""; 
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
            } catch (e) {
                console.error("Impossible de récupérer le profil : ", e);
            }
        }

        async function getUserLibrary() {
            document.getElementById('profile-card-zone').style.display = 'none';
            if (!currentToken) return;
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de la bibliothèque...</p>";
            
            try {
                const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
                    headers: { 'Authorization': 'Bearer ' + currentToken }
                });
                const data = await response.json();
                resultsContainer.innerHTML = "";

                if (data.items && data.items.length > 0) {
                    libraryItems = data.items;
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
                resultsContainer.appendChild(item);
            });

            if (libraryItems.length > displayedCount) {
                const moreBtn = document.createElement('button');
                moreBtn.className = 'lib-btn';
                moreBtn.style.marginTop = '10px';
                moreBtn.innerText = "➕ Afficher plus (+10)";
                moreBtn.onclick = () => {
                    displayedCount += 10;
                    renderLibrarySection();
                };
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

        function prepareUploadToDrive() {
            const inputName = document.getElementById('audio-filename').value.trim();
            const statusMsg = document.getElementById('drive-status-msg');
            
            if (!inputName) { alert("Veuillez donner un titre !"); return; }
            if (!finalAudioBlob) { alert("Aucun audio détecté."); return; }

            statusMsg.style.color = 'var(--text-grey)';
            statusMsg.innerText = "Authentification Google...";

            if (googleAccessToken === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                executeActualUpload();
            }
        }

        async function executeActualUpload() {
            const inputName = document.getElementById('audio-filename').value.trim();
            const fileName = inputName.endsWith('.mp3') ? inputName : `${inputName}.mp3`;
            const statusMsg = document.getElementById('drive-status-msg');

            statusMsg.innerText = "Téléversement sur Google Drive...";

            const metadata = { name: fileName, mimeType: 'audio/mp3' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', finalAudioBlob);

            try {
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + googleAccessToken },
                    body: form
                });

                if (response.ok) {
                    statusMsg.style.color = 'var(--spotify-green)';
                    statusMsg.innerText = "Audio enregistré avec succès sur Google Drive !";
                    setTimeout(() => { document.getElementById('drive-record-zone').style.display = 'none'; }, 3000);
                } else {
                    const errData = await response.json();
                    statusMsg.style.color = '#ef4444';
                    statusMsg.innerText = "Erreur Drive : " + (errData.error.message || "Échec");
                }
            } catch (error) {
                statusMsg.style.color = '#ef4444';
                statusMsg.innerText = "Erreur de connexion Google API.";
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
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>AudD vous écoute (10s)...</p>";
                };

                mediaRecorder.onstop = async () => {
                    isRecording = false;
                    micBtn.classList.remove('recording');
                    micBtn.innerText = "🎙️";
                    resultsContainer.innerHTML = "<p style='font-size:0.9rem; color:var(--text-grey); margin:5px;'>Analyse de l'empreinte audio...</p>";

                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                    stream.getTracks().forEach(track => track.stop());

                    if (audioBlob.size > 1000) {
                        recognizeAudioWithAudD(audioBlob);
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

        async function recognizeAudioWithAudD(blob) {
            const GlassContainer = document.getElementById('search-results');
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('api_token', auddApiToken);
            formData.append('return', 'spotify');

            try {
                const response = await fetch('https://api.audd.io/', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === "success" && result.result) {
                    GlassContainer.innerHTML = "";
                    const track = result.result;
                    let spotifyUri = track.spotify && track.spotify.id ? `spotify:track:${track.spotify.id}` : null;

                    const item = document.createElement('div');
                    item.className = 'search-item';
                    const coverImg = (track.spotify && track.spotify.album && track.spotify.album.images.length > 0) ? track.spotify.album.images[2].url : "https://via.placeholder.com/30";

                    item.innerHTML = `
                        <img src="${coverImg}" alt="">
                        <div>
                            <strong style="display:block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${track.title}</strong>
                            <span style="font-size: 0.8rem; color: var(--text-grey);">${track.artist}</span>
                        </div>
                    `;
                    
                    item.onclick = () => {
                        if (spotifyUri) {
                            playTrack(spotifyUri);
                        } else {
                            document.getElementById('search-input').value = `${track.title} ${track.artist}`;
                            searchTrack();
                        }
                    };
                    GlassContainer.appendChild(item);
                } else {
                    GlassContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Aucune correspondance trouvée par AudD.</p>";
                }
            } catch (err) {
                GlassContainer.innerHTML = "<p style='font-size:0.9rem; color:red; margin:5px;'>Échec de communication avec AudD.</p>";
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
                if (response.status === 204) {
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
                if (response.status === 204) {
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
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                const oldSrc = art.getAttribute('data-old-src') || "";
                if (art.src !== oldSrc) {
                    art.setAttribute('data-old-src', art.src);
                    art.onload = () => updateDynamicBackground();
                }
            }

            // C'EST ICI : Si le morceau a changé, on vérifie immédiatement s'il est liké
            if (data.item.id && data.item.id !== lastTrackId) {
                lastTrackId = data.item.id;
                const artistName = data.item.artists && data.item.artists[0] ? data.item.artists[0].name : "";
                const albumName = data.item.album ? data.item.album.name : "";
                fetchLyrics(artistName, data.item.name || "", albumName, (data.item.duration_ms || 0) / 1000);

                // ✅ Appel de la fonction de vérification avec le bon ID de morceau
                checkIfTrackIsLiked(data.item.id);
            }
        }
    } catch (e) {
        console.error("updateNowPlaying error:", e);
    }
}
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

        setInterval(updateNowPlaying, 1000);
        
        async function getRecentlyPlayed() {
            document.getElementById('profile-card-zone').style.display = 'none'; 
            if (!currentToken) return;
            
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = "<p style='font-size:0.85rem; color:var(--text-grey); margin:5px;'>Chargement de l'historique...</p>";

            try {
                const response = await fetch('https://api.spotify.com/v1/me/player/recently-played', {
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
                resultsContainer.appendChild(item);
            });

            if (recentItems.length > displayedRecentCount) {
                const moreBtn = document.createElement('button');
                moreBtn.className = 'lib-btn'; 
                moreBtn.style.marginTop = '10px';
                moreBtn.innerText = "➕ Afficher plus (+10)";
                moreBtn.onclick = () => {
                    displayedRecentCount += 10; 
                    renderRecentPlayedSection(); 
                };
                resultsContainer.appendChild(moreBtn);
            }
        }
// Fonction pour afficher/masquer la barre de volume
// Fonction pour afficher/masquer la réglette du volume
function toggleVolumeControl() {
    // On ferme les autres panneaux pour éviter les superpositions
    document.getElementById('profile-card-zone').style.display = 'none';
    document.getElementById('device-control-zone').style.display = 'none';
    document.getElementById('search-results').innerHTML = "";

    const volumeZone = document.getElementById('volume-control-zone');
    if (volumeZone.style.display === 'none' || volumeZone.style.display === '') {
        volumeZone.style.display = 'flex';
    } else {
        volumeZone.style.display = 'none';
    }
}

// Fonction principale du volume liée à ton slider range
async function changeVolume(value) {
    const percentLabel = document.getElementById('volume-percent');
    if (percentLabel) percentLabel.innerText = value + '%';
    
    if (!currentToken) return;

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
        }
    } catch (error) {
        console.error("Erreur lors du changement de volume :", error);
    }
}
// Fonction pour modifier le volume (et mettre à jour le texte du pourcentage)
async function changeVolume(value) {
    document.getElementById('volume-percent').innerText = value + '%';
    
    // 🔍 On vérifie si currentToken existe bien avant de lancer la requête
    if (!currentToken) {
        console.error("Aucun jeton de connexion (currentToken) trouvé.");
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${value}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + currentToken, // ✅ Utilisation du bon token
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log("✅ Volume modifié avec succès à :", value);
        } else {
            console.error("❌ Erreur API Spotify (Statut):", response.status);
        }
    } catch (error) {
        console.error("🚨 Erreur réseau ou JS :", error);
    }
}

// 1. Liaison avec l'ID du bouton (comme demandé pour le profil)
const deviceBtn = document.getElementById('device-toggle-btn');

// 2. Afficher/Masquer la zone et charger les appareils

async function toggleDeviceSelector() {
    // On cache le volume et le profil
    document.getElementById('volume-control-zone').style.display = 'none';
    document.getElementById('profile-card-zone').style.display = 'none';

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
// 1. FONCTION DE VÉRIFICATION DE L'ÉTAT DU LIKE (GET)
async function checkIfTrackIsLiked(trackId) {
    if (!currentToken || !trackId) return;

    try {
        // CORRECTION : Ajout du $ pour la variable dans l'URL
        const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=$${encodeURIComponent(trackId)}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        
        if (!response.ok) {
            console.error('checkIfTrackIsLiked: HTTP', response.status, await response.text());
            return;
        }

        const isLikedArray = await response.json();
        const isLiked = !!isLikedArray[0]; // Sécurise le booléen (true ou false)
        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
            likeBtn.innerText = isLiked ? "❤️" : "🤍";
            likeBtn.setAttribute('data-liked', String(isLiked));
        }
    } catch (e) {
        console.error("Erreur lors de la vérification du favori :", e);
    }
}

// 2. FONCTION DE MODIFICATION (PUT / DELETE) VIA LE BOUTON
async function toggleLikeCurrentTrack() {
    if (!currentToken || !lastTrackId) return;

    const likeBtn = document.getElementById('like-btn');
    if (!likeBtn) return;
    const isCurrentlyLiked = likeBtn.getAttribute('data-liked') === 'true';
    const method = isCurrentlyLiked ? 'DELETE' : 'PUT';

    try {
        // CORRECTION : Ajout du $ pour la variable dans l'URL
        const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=$${encodeURIComponent(lastTrackId)}`, {
            method: method,
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (!response.ok) {
            console.error('toggleLikeCurrentTrack: HTTP', response.status, await response.text());
            return;
        }

        const newLikedState = !isCurrentlyLiked;
        likeBtn.innerText = newLikedState ? "❤️" : "🤍";
        likeBtn.setAttribute('data-liked', String(newLikedState));
        
        // Si l'utilisateur est sur l'onglet de sa bibliothèque, on la rafraîchit
        const sr = document.getElementById('search-results');
        if (sr && sr.innerHTML.includes("VOS TITRES LIKÉS")) {
            getUserLibrary();
        }
    } catch (e) {
        console.error("Erreur lors du changement d'état du favori :", e);
    }
}
// L'accolade en trop qui coupait le code a été supprimée ici !
