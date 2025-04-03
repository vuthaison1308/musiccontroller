const d = document;
const fList = d.getElementById('fList');
const fSel = d.getElementById('fSel');
const fModal = d.getElementById('fModal');
const fName = d.getElementById('fName');
const sBtn = d.getElementById('sBtn');
const cBtn = d.getElementById('cBtn');
const nfBtn = d.getElementById('nfBtn');
const addBtn = d.getElementById('addBtn');
const tName = d.getElementById('tName');
const tType = d.getElementById('tType');
const tUrl = d.getElementById('tUrl');
const pCon = d.getElementById('pCon');
const hiddenPlayer = d.getElementById('hiddenPlayer');
const np = d.getElementById('np');
const hideBtn = d.getElementById('hideBtn');
const nextBtn = d.getElementById('nextBtn');
const prevBtn = d.getElementById('prevBtn');

let lib = {folders: []};
let curTrack = null;
let isHidden = false;
let currentPlaybackTime = 0;
let playbackInterval;

function init() {
    loadLib();
    render();
    updFSel();
    
    nfBtn.addEventListener('click', showModal);
    sBtn.addEventListener('click', saveF);
    cBtn.addEventListener('click', hideModal);
    addBtn.addEventListener('click', addTrack);
    hideBtn.addEventListener('click', toggleHide);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    
    // Check for ended tracks at a regular interval
    setInterval(checkEnded, 1000);
}

function loadLib() {
    const saved = localStorage.getItem('musicLib');
    if (saved) lib = JSON.parse(saved);
}

function saveLib() {
    localStorage.setItem('musicLib', JSON.stringify(lib));
}

function showModal() {
    fName.value = '';
    fModal.style.display = 'flex';
}

function hideModal() {
    fModal.style.display = 'none';
}

function saveF() {
    const name = fName.value.trim();
    if (name) {
        const newF = {
            id: Date.now().toString(),
            name: name,
            tracks: []
        };
        
        lib.folders.push(newF);
        saveLib();
        render();
        updFSel();
        hideModal();
    }
}

function updFSel() {
    fSel.innerHTML = '<option value="">Select folder...</option>';
    
    lib.folders.forEach(f => {
        const opt = d.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        fSel.appendChild(opt);
    });
}

function render() {
    fList.innerHTML = '';
    
    lib.folders.forEach(f => {
        const fEl = d.createElement('div');
        fEl.className = 'fold';
        
        const fTitle = d.createElement('div');
        fTitle.className = 'f-title';
        fTitle.innerHTML = `
            <span>${f.name}</span>
            <button class="btn s-btn red" onclick="delF('${f.id}')">Delete</button>
        `;
        
        const tList = d.createElement('div');
        tList.className = 'tracks';
        
        if (f.tracks && f.tracks.length > 0) {
            f.tracks.forEach(t => {
                const tItem = d.createElement('div');
                tItem.className = 'track';
                
                // Add active class if this is the current track
                if (curTrack && curTrack.fid === f.id && curTrack.tid === t.id) {
                    tItem.classList.add('active');
                }
                
                // Create track label and delete button elements
                const trackLabel = document.createElement('span');
                trackLabel.textContent = t.name;
                trackLabel.className = 'track-label';
                trackLabel.style.cursor = 'pointer';
                trackLabel.style.flex = '1';
                
                // Add click event to the whole track label
                trackLabel.addEventListener('click', function() {
                    play(f.id, t.id);
                });
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn s-btn red';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent track play when clicking delete
                    delT(f.id, t.id);
                });
                
                // Add elements to track item
                tItem.appendChild(trackLabel);
                tItem.appendChild(deleteBtn);
                
                // Make the entire track item clickable
                tItem.addEventListener('click', function(e) {
                    // Only play if we didn't click on the delete button
                    if (e.target !== deleteBtn) {
                        play(f.id, t.id);
                    }
                });
                
                tList.appendChild(tItem);
            });
        } else {
            tList.innerHTML = '<div class="track">No tracks</div>';
        }
        
        fEl.appendChild(fTitle);
        fEl.appendChild(tList);
        fList.appendChild(fEl);
    });
}

function addTrack() {
    const fid = fSel.value;
    const name = tName.value.trim();
    const type = tType.value;
    const url = tUrl.value.trim();
    
    if (!fid) {
        alert('Select a folder');
        return;
    }
    
    if (!name || !url) {
        alert('Enter name and URL');
        return;
    }
    
    const f = lib.folders.find(f => f.id === fid);
    if (f) {
        const newT = {
            id: Date.now().toString(),
            name: name,
            type: type,
            url: url
        };
        
        f.tracks = f.tracks || [];
        f.tracks.push(newT);
        saveLib();
        render();
        
        tName.value = '';
        tUrl.value = '';
    }
}

function delF(fid) {
    if (confirm('Delete this folder and all tracks?')) {
        lib.folders = lib.folders.filter(f => f.id !== fid);
        saveLib();
        render();
        updFSel();
        
        if (curTrack && curTrack.fid === fid) {
            stopPlay();
        }
    }
}

function delT(fid, tid) {
    const f = lib.folders.find(f => f.id === fid);
    if (f) {
        f.tracks = f.tracks.filter(t => t.id !== tid);
        saveLib();
        render();
        
        if (curTrack && curTrack.fid === fid && curTrack.tid === tid) {
            playNext();
        }
    }
}

function stopPlay() {
    clearCurrentPlayer();
    np.textContent = 'No track selected';
    curTrack = null;
    isHidden = false;
    
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

function clearCurrentPlayer() {
    pCon.innerHTML = '';
    hiddenPlayer.innerHTML = '';
    currentPlaybackTime = 0;
}

function play(fid, tid) {
    const f = lib.folders.find(f => f.id === fid);
    if (!f) return;
    
    const t = f.tracks.find(t => t.id === tid);
    if (!t) return;
    
    // Clear any currently playing track first
    clearCurrentPlayer();
    
    curTrack = { fid, tid, f, t };
    np.textContent = `Now Playing: ${t.name}`;
    
    // Reset the hidden state when playing a new track
    isHidden = false;
    hideBtn.textContent = 'Hide Video';
    
    render();
    loadPlayer(isHidden ? hiddenPlayer : pCon, t);
    
    // Start tracking playback
    startPlaybackTracking();
}

function loadPlayer(container, t) {
    container.innerHTML = '';
    
    switch (t.type) {
        case 'yt':
            let vid = '';
            if (t.url.includes('youtu.be/')) {
                vid = t.url.split('youtu.be/')[1].split('?')[0];
            } else if (t.url.includes('watch?v=')) {
                vid = t.url.split('watch?v=')[1].split('&')[0];
            }
            
            if (vid) {
                const iframe = d.createElement('iframe');
                iframe.width = '100%';
                iframe.height = '315';
                iframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&enablejsapi=1`;
                iframe.frameBorder = '0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.id = 'ytPlayer';
                container.appendChild(iframe);
            }
            break;
            
        case 'sc':
            const scIframe = d.createElement('iframe');
            scIframe.width = '100%';
            scIframe.height = '166';
            scIframe.scrolling = 'no';
            scIframe.frameBorder = 'no';
            scIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.url)}&auto_play=true`;
            container.appendChild(scIframe);
            break;
            
        case 'sp':
            let spid = '';
            if (t.url.includes('track/')) {
                spid = t.url.split('track/')[1].split('?')[0];
                const spIframe = d.createElement('iframe');
                spIframe.src = `https://open.spotify.com/embed/track/${spid}`;
                spIframe.width = '100%';
                spIframe.height = '352';
                spIframe.frameBorder = '0';
                spIframe.allow = 'encrypted-media';
                container.appendChild(spIframe);
            }
            break;
            
        case 'audio':
            const audio = d.createElement('audio');
            audio.id = 'aPlayer';
            audio.controls = true;
            audio.autoplay = true;
            audio.style.width = '100%';
            audio.src = t.url;
            
            // Set the current time if we have one saved
            if (currentPlaybackTime > 0) {
                audio.currentTime = currentPlaybackTime;
            }
            
            audio.onended = playNext;
            audio.onerror = function() {
                alert("Cannot play this audio. Check URL.");
            };
            container.appendChild(audio);
            break;
    }
}

function toggleHide() {
    if (!curTrack) return;
    
    // Save current playback position before changing
    updateCurrentPlaybackTime();
    
    isHidden = !isHidden;
    
    if (isHidden) {
        hideBtn.textContent = 'Show Video';
        
        // First load in hidden player
        hiddenPlayer.innerHTML = '';
        loadPlayer(hiddenPlayer, curTrack.t);
        
        // Then empty visible container
        pCon.innerHTML = '<div style="text-align:center;padding:20px;">Video hidden - audio still playing</div>';
    } else {
        hideBtn.textContent = 'Hide Video';
        
        // First load in visible player
        pCon.innerHTML = '';
        loadPlayer(pCon, curTrack.t);
        
        // Then empty hidden container
        hiddenPlayer.innerHTML = '';
    }
}

function startPlaybackTracking() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
    }
    
    // Update playback time every second
    playbackInterval = setInterval(updateCurrentPlaybackTime, 1000);
}

function updateCurrentPlaybackTime() {
    if (!curTrack) return;
    
    // Get the current player based on hidden state
    const container = isHidden ? hiddenPlayer : pCon;
    
    if (curTrack.t.type === 'audio') {
        const audio = container.querySelector('#aPlayer');
        if (audio && !isNaN(audio.currentTime)) {
            currentPlaybackTime = audio.currentTime;
        }
    }
    // For YouTube, SoundCloud and Spotify, we can't easily get the current time
    // so we'll keep using the interval-based tracking for track end detection
}

function getTrackIndex() {
    if (!curTrack) return [-1, -1];
    
    const fIdx = lib.folders.findIndex(f => f.id === curTrack.fid);
    if (fIdx === -1) return [-1, -1];
    
    const tIdx = lib.folders[fIdx].tracks.findIndex(t => t.id === curTrack.tid);
    return [fIdx, tIdx];
}

function playNext() {
    if (!curTrack) return;
    
    const [fIdx, tIdx] = getTrackIndex();
    if (fIdx === -1 || tIdx === -1) return;
    
    const f = lib.folders[fIdx];
    let nextIdx = tIdx + 1;
    
    if (nextIdx >= f.tracks.length) {
        nextIdx = 0;
    }
    
    if (f.tracks.length > 0) {
        play(f.id, f.tracks[nextIdx].id);
    }
}

function playPrev() {
    if (!curTrack) return;
    
    const [fIdx, tIdx] = getTrackIndex();
    if (fIdx === -1 || tIdx === -1) return;
    
    const f = lib.folders[fIdx];
    let prevIdx = tIdx - 1;
    
    if (prevIdx < 0) {
        prevIdx = f.tracks.length - 1;
    }
    
    if (f.tracks.length > 0) {
        play(f.id, f.tracks[prevIdx].id);
    }
}

function checkEnded() {
    if (!curTrack) return;
    
    // Get the current player container based on hidden state
    const container = isHidden ? hiddenPlayer : pCon;
    
    if (curTrack.t.type === 'audio') {
        const audio = container.querySelector('#aPlayer');
        if (audio && audio.ended) {
            playNext();
        }
    } else if (curTrack.t.type === 'yt') {
        const iframe = container.querySelector('#ytPlayer');
        if (iframe && iframe.contentWindow) {
            try {
                const state = iframe.contentWindow.postMessage('{"event":"command","func":"getPlayerState","args":""}', '*');
                if (state === 0) {
                    playNext();
                }
            } catch(e) {}
        }
    }
    // For SoundCloud and Spotify, we'll rely on their auto-advance features
    // and manual controls from the user
}

// Global functions for HTML onclick handlers
window.delF = delF;
window.delT = delT;
window.play = play;

// Initialize
document.addEventListener('DOMContentLoaded', init);