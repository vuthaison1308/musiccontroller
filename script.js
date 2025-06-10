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
const np = d.getElementById('np');
const nextBtn = d.getElementById('nextBtn');
const prevBtn = d.getElementById('prevBtn');

let lib = {folders: []};
let cur = null;
let ytP = null;
let ytReady = false;
let dragSrc = null;
let scW = null;

function init() {
    loadLib();
    render();
    updFSel();
    
    nfBtn.addEventListener('click', showModal);
    sBtn.addEventListener('click', saveF);
    cBtn.addEventListener('click', hideModal);
    addBtn.addEventListener('click', addTrack);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    
    const importInput = d.getElementById('importInput');
    if (importInput) {
        importInput.addEventListener('change', importLib);
    }
    
    fList.addEventListener('dragstart', dragStart);
    fList.addEventListener('dragover', dragOver);
    fList.addEventListener('dragleave', dragLeave);
    fList.addEventListener('drop', drop);
    fList.addEventListener('dragend', dragEnd);
    
    window.onYouTubeIframeAPIReady = function() {
        ytReady = true;
    };
    
    loadYtAPI();
}

function loadYtAPI() {
    const tag = d.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = d.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function loadLib() {
    const saved = localStorage.getItem('musicLib');
    if (saved) lib = JSON.parse(saved);
    
    lib.folders.forEach(f => {
        if (typeof f.collapsed === 'undefined') {
            f.collapsed = false;
        }
    });
    saveLib();
}

function saveLib() {
    localStorage.setItem('musicLib', JSON.stringify(lib));
}

function showModal() {
    fName.value = '';
    fModal.classList.add('show');
    fName.focus();
}

function hideModal() {
    fModal.classList.remove('show');
}

function saveF() {
    const name = fName.value.trim();
    if (name) {
        const newF = {
            id: Date.now().toString(),
            name: name,
            tracks: [],
            collapsed: false
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

function toggleFolder(fid) {
    const folder = lib.folders.find(f => f.id === fid);
    if (folder) {
        folder.collapsed = !folder.collapsed;
        saveLib();
        render();
    }
}

function render() {
    fList.innerHTML = '';
    lib.folders.forEach(f => {
        const fEl = d.createElement('div');
        fEl.className = 'fold';

        const fTitle = d.createElement('div');
        fTitle.className = 'f-title';
        fTitle.addEventListener('click', (e) => {
            if (e.target.closest('.s-btn')) return;
            toggleFolder(f.id);
        });

        const arrowSpan = d.createElement('span');
        arrowSpan.className = 'fold-arrow';
        arrowSpan.innerHTML = '&#9660;'; // Down arrow
        if (f.collapsed) arrowSpan.classList.add('collapsed');

        fTitle.innerHTML = `
            <div class="fold-header">
                <span>${f.name}</span>
            </div>
            <button class="btn s-btn red" onclick="delF('${f.id}')">Delete</button>
        `;
        fTitle.querySelector('.fold-header').prepend(arrowSpan);

        const tList = d.createElement('div');
        tList.className = 'tracks';
        if (f.collapsed) tList.classList.add('collapsed');

        if (f.tracks && f.tracks.length > 0) {
            f.tracks.forEach(t => {
                const tItem = d.createElement('div');
                tItem.className = 'track';
                tItem.draggable = true;
                tItem.setAttribute('data-fid', f.id);
                tItem.setAttribute('data-tid', t.id);

                if (cur && cur.fid === f.id && cur.tid === t.id) tItem.classList.add('active');

                tItem.innerHTML = `
                    <span class="drag-handle">⋮⋮</span>
                    <span class="track-label">${t.name}</span>
                    <button class="btn s-btn red" onclick="delT(event, '${f.id}', '${t.id}')">Delete</button>
                `;

                tItem.querySelector('.track-label').addEventListener('click', () => play(f.id, t.id));
                tList.appendChild(tItem);
            });
        } else {
            const noTrackDiv = d.createElement('div');
            noTrackDiv.className = 'track';
            noTrackDiv.style.opacity = '0.5';
            noTrackDiv.style.pointerEvents = 'none';
            noTrackDiv.textContent = 'No tracks in this folder';
            tList.appendChild(noTrackDiv);
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
    if (!fid || !name || !url) {
        alert('Please fill all fields.');
        return;
    }
    const f = lib.folders.find(f => f.id === fid);
    if (f) {
        f.tracks = f.tracks || [];
        f.tracks.push({ id: Date.now().toString(), name, type, url });
        saveLib();
        render();
        tName.value = '';
        tUrl.value = '';
    }
}

function delF(fid) {
    if (confirm('Delete this folder and all its tracks?')) {
        lib.folders = lib.folders.filter(f => f.id !== fid);
        saveLib();
        render();
        updFSel();
        if (cur && cur.fid === fid) stopPlay();
    }
}

function delT(event, fid, tid) {
    event.stopPropagation();
    const f = lib.folders.find(f => f.id === fid);
    if (f) {
        f.tracks = f.tracks.filter(t => t.id !== tid);
        saveLib();
        render();
        if (cur && cur.fid === fid && cur.tid === tid) playNext();
    }
}

function stopPlay() {
    if (ytP) { ytP.destroy(); ytP = null; }
    if (scW) { scW.unbind(SC.Widget.Events.FINISH); scW = null; }
    pCon.innerHTML = '';
    np.textContent = 'No track selected';
    cur = null;
    render();
}

function play(fid, tid) {
    const f = lib.folders.find(f => f.id === fid);
    if (!f) return;
    const t = f.tracks.find(t => t.id === tid);
    if (!t) return;
    
    if (ytP) { ytP.destroy(); ytP = null; }
    if (scW) { scW.unbind(SC.Widget.Events.FINISH); scW = null; }
    pCon.innerHTML = '';
    
    cur = { fid, tid, f, t };
    np.textContent = `Now Playing: ${t.name}`;
    
    render();
    loadPlayer(pCon, t);
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
                if (ytReady) {
                    const playerDiv = d.createElement('div');
                    playerDiv.id = 'ytPlayer';
                    container.appendChild(playerDiv);
                    ytP = new YT.Player('ytPlayer', {
                        height: '315', width: '100%', videoId: vid,
                        playerVars: { 'autoplay': 1, 'controls': 1 },
                        events: { 'onStateChange': onYtStateChange }
                    });
                } else {
                    console.error("YouTube API not ready.");
                }
            }
            break;
        case 'sc':
            const scIframe = d.createElement('iframe');
            scIframe.width = '100%'; scIframe.height = '166'; scIframe.scrolling = 'no';
            scIframe.frameBorder = 'no'; scIframe.allow = "autoplay";
            scIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.url)}&auto_play=true`;
            container.appendChild(scIframe);
            setTimeout(() => {
                try {
                    scW = SC.Widget(scIframe);
                    scW.bind(SC.Widget.Events.FINISH, playNext);
                } catch(e) { console.error("SoundCloud widget error:", e); }
            }, 1000);
            break;
        case 'sp':
            let spid = '';
            if (t.url.includes('track/')) {
                spid = t.url.split('track/')[1].split('?')[0];
                const spIframe = d.createElement('iframe');
                spIframe.src = `https://open.spotify.com/embed/track/${spid}`;
                spIframe.width = '100%'; spIframe.height = '352'; spIframe.frameBorder = '0';
                spIframe.allow = 'encrypted-media';
                container.appendChild(spIframe);
            }
            break;
        case 'audio':
            const audio = d.createElement('audio');
            audio.id = 'aPlayer'; audio.controls = true; audio.autoplay = true;
            audio.style.width = '100%'; audio.src = t.url;
            audio.onended = playNext;
            audio.onerror = () => { alert("Cannot play audio. Check URL."); playNext(); };
            container.appendChild(audio);
            break;
    }
}

function onYtStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) playNext();
}

function getTrackIndex() {
    if (!cur) return [-1, -1];
    const fIdx = lib.folders.findIndex(f => f.id === cur.fid);
    if (fIdx === -1) return [-1, -1];
    const tIdx = lib.folders[fIdx].tracks.findIndex(t => t.id === cur.tid);
    return [fIdx, tIdx];
}

function playNext() {
    if (!cur) return;
    const [fIdx, tIdx] = getTrackIndex();
    if (fIdx === -1 || tIdx === -1) { stopPlay(); return; }
    
    const f = lib.folders[fIdx];
    if (tIdx + 1 < f.tracks.length) {
        play(f.id, f.tracks[tIdx + 1].id);
    } else {
        let nextFIdx = fIdx;
        do {
            nextFIdx = (nextFIdx + 1) % lib.folders.length;
            const nextFolder = lib.folders[nextFIdx];
            if (nextFolder && nextFolder.tracks.length > 0) {
                play(nextFolder.id, nextFolder.tracks[0].id);
                return;
            }
        } while (nextFIdx !== fIdx);
        stopPlay();
    }
}

function playPrev() {
    if (!cur) return;
    const [fIdx, tIdx] = getTrackIndex();
    if (fIdx === -1 || tIdx === -1) { stopPlay(); return; }
    
    const f = lib.folders[fIdx];
    if (tIdx - 1 >= 0) {
        play(f.id, f.tracks[tIdx - 1].id);
    } else {
        let prevFIdx = fIdx;
        do {
            prevFIdx = (prevFIdx - 1 + lib.folders.length) % lib.folders.length;
            const prevFolder = lib.folders[prevFIdx];
            if (prevFolder && prevFolder.tracks.length > 0) {
                play(prevFolder.id, prevFolder.tracks[prevFolder.tracks.length - 1].id);
                return;
            }
        } while (prevFIdx !== fIdx);
    }
}

function dragStart(e) {
    if (!e.target.classList.contains('track')) return;
    dragSrc = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}

function dragOver(e) {
    e.preventDefault();
}

function dragLeave(e) {}

function drop(e) {
    e.stopPropagation();
    if (!dragSrc) return;
    const targetTrack = e.target.closest('.track');
    if (!targetTrack || dragSrc === targetTrack) {
        dragEnd(); return;
    }
    
    const srcFolderId = dragSrc.getAttribute('data-fid');
    const srcTrackId = dragSrc.getAttribute('data-tid');
    const targetFolderId = targetTrack.getAttribute('data-fid');
    const targetTrackId = targetTrack.getAttribute('data-tid');
    if (srcFolderId !== targetFolderId) {
        dragEnd(); return;
    }

    const folder = lib.folders.find(f => f.id === srcFolderId);
    if (!folder) return;
    const srcIndex = folder.tracks.findIndex(t => t.id === srcTrackId);
    const targetIndex = folder.tracks.findIndex(t => t.id === targetTrackId);
    if (srcIndex === -1 || targetIndex === -1) return;

    const [removedTrack] = folder.tracks.splice(srcIndex, 1);
    folder.tracks.splice(targetIndex, 0, removedTrack);
    saveLib();
    render();
}

function dragEnd(e) {
    if (dragSrc) dragSrc.classList.remove('dragging');
    dragSrc = null;
}

function exportLibrary() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lib));
    const a = d.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "music_library_backup.json");
    d.body.appendChild(a);
    a.click();
    a.remove();
}

function importLib(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const impLib = JSON.parse(e.target.result);
            if (!impLib.folders || !Array.isArray(impLib.folders)) throw new Error("Invalid library format");
            if (confirm("Replace current library? This action cannot be undone.")) {
                lib = impLib;
                saveLib();
                render();
                updFSel();
                stopPlay();
                alert("Library imported successfully!");
            }
        } catch (error) {
            alert("Error importing library: " + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

window.delF = delF;
window.delT = delT;
window.play = play;
window.toggleFolder = toggleFolder;
window.exportLibrary = exportLibrary;
window.importLib = importLib;

document.addEventListener('DOMContentLoaded', init);
