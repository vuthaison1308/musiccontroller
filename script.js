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
    
    setInterval(checkEnd, 1000);
    
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
        
        const arrow = f.collapsed ? '▶' : '▼';
        fTitle.innerHTML = `
            <div class="fold-header">
                <span class="fold-arrow">${arrow}</span>
                <span>${f.name}</span>
            </div>
            <button class="btn s-btn red" onclick="delF('${f.id}')">Delete</button>
        `;
        
        const foldHeader = fTitle.querySelector('.fold-header');
        foldHeader.style.cursor = 'pointer';
        foldHeader.addEventListener('click', () => toggleFolder(f.id));
        
        const tList = d.createElement('div');
        tList.className = 'tracks';
        
        if (f.collapsed) {
            tList.style.display = 'none';
        }
        
        if (f.tracks && f.tracks.length > 0) {
            f.tracks.forEach(t => {
                const tItem = d.createElement('div');
                tItem.className = 'track';
                tItem.draggable = true;
                tItem.setAttribute('data-fid', f.id);
                tItem.setAttribute('data-tid', t.id);
                
                if (cur && cur.fid === f.id && cur.tid === t.id) {
                    tItem.classList.add('active');
                }
                
                const trackLabel = d.createElement('span');
                trackLabel.textContent = t.name;
                trackLabel.className = 'track-label';
                trackLabel.style.cursor = 'pointer';
                trackLabel.style.flex = '1';
                
                trackLabel.addEventListener('click', function() {
                    play(f.id, t.id);
                });
                
                const deleteBtn = d.createElement('button');
                deleteBtn.className = 'btn s-btn red';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    delT(f.id, t.id);
                });
                
                const dragHandle = d.createElement('span');
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.className = 'drag-handle';
                dragHandle.title = 'Drag to reorder';
                
                tItem.appendChild(dragHandle);
                tItem.appendChild(trackLabel);
                tItem.appendChild(deleteBtn);
                
                tItem.addEventListener('click', function(e) {
                    if (e.target !== deleteBtn && e.target !== dragHandle) {
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
        
        if (cur && cur.fid === fid) {
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
        
        if (cur && cur.fid === fid && cur.tid === tid) {
            playNext();
        }
    }
}

function stopPlay() {
    if (ytP) {
        ytP.destroy();
        ytP = null;
    }
    
    if (scW) {
        scW.unbind(SC.Widget.Events.FINISH);
        scW = null;
    }
    
    pCon.innerHTML = '';
    np.textContent = 'No track selected';
    cur = null;
}

function play(fid, tid) {
    const f = lib.folders.find(f => f.id === fid);
    if (!f) return;
    
    const t = f.tracks.find(t => t.id === tid);
    if (!t) return;
    
    if (ytP) {
        ytP.destroy();
        ytP = null;
    }
    
    if (scW) {
        scW.unbind(SC.Widget.Events.FINISH);
        scW = null;
    }
    
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
                        height: '315',
                        width: '100%',
                        videoId: vid,
                        playerVars: {
                            'autoplay': 1,
                            'controls': 1
                        },
                        events: {
                            'onStateChange': onYtStateChange
                        }
                    });
                } else {
                    loadYtAPI();
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
            }
            break;
            
        case 'sc':
            const scIframe = d.createElement('iframe');
            scIframe.width = '100%';
            scIframe.height = '166';
            scIframe.scrolling = 'no';
            scIframe.frameBorder = 'no';
            scIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.url)}&auto_play=true`;
            scIframe.id = 'scPlayer';
            container.appendChild(scIframe);
            
            setTimeout(() => {
                scW = SC.Widget(scIframe);
                scW.bind(SC.Widget.Events.FINISH, playNext);
                scW.bind(SC.Widget.Events.READY, () => {
                    scW.bind(SC.Widget.Events.PLAY, () => {
                        scW.bind(SC.Widget.Events.FINISH, playNext);
                    });
                });
            }, 1000);
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
                spIframe.id = 'spotify-iframe';
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
            audio.onended = playNext;
            audio.onerror = function() {
                alert("Cannot play this audio. Check URL.");
                playNext();
            };
            container.appendChild(audio);
            break;
    }
}

function onYtStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    }
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
    if (fIdx === -1 || tIdx === -1) {
        stopPlay();
        return;
    }
    
    const f = lib.folders[fIdx];
    let nextIdx = tIdx + 1;
    
    if (nextIdx >= f.tracks.length) {
        let nextFolderIdx = fIdx + 1;
        
        if (nextFolderIdx >= lib.folders.length) {
            nextFolderIdx = 0;
        }
        
        if (nextFolderIdx === fIdx) {
            return;
        }
        
        let found = false;
        while (!found && nextFolderIdx !== fIdx) {
            const nextFolder = lib.folders[nextFolderIdx];
            if (nextFolder && nextFolder.tracks && nextFolder.tracks.length > 0) {
                play(nextFolder.id, nextFolder.tracks[0].id);
                found = true;
            } else {
                nextFolderIdx++;
                if (nextFolderIdx >= lib.folders.length) {
                    nextFolderIdx = 0;
                }
            }
        }
    } else if (f.tracks.length > 0) {
        play(f.id, f.tracks[nextIdx].id);
    }
}

function playPrev() {
    if (!cur) return;
    
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

function checkEnd() {
    if (!cur) return;
    
    if (cur.t.type === 'audio') {
        const audio = pCon.querySelector('#aPlayer');
        if (audio && audio.ended) {
            playNext();
        }
    } else if (cur.t.type === 'yt' && ytP) {
        try {
            const state = ytP.getPlayerState();
            if (state === YT.PlayerState.ENDED) {
                playNext();
            }
        } catch (e) {}
    } else if (cur.t.type === 'sc' && scW) {
        try {
            scW.getPosition(pos => {
                scW.getDuration(dur => {
                    if (pos >= dur - 1000) {
                        playNext();
                    }
                });
            });
        } catch (e) {}
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
    if (e.preventDefault) e.preventDefault();
    if (!e.target.closest('.track')) return;
    
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function dragLeave(e) {
    if (!e.target.closest('.track')) return;
}

function drop(e) {
    e.stopPropagation();
    
    if (!dragSrc) return;
    
    const targetTrack = e.target.closest('.track');
    if (!targetTrack || dragSrc === targetTrack) return;
    
    const srcFolderId = dragSrc.getAttribute('data-fid');
    const srcTrackId = dragSrc.getAttribute('data-tid');
    const targetFolderId = targetTrack.getAttribute('data-fid');
    const targetTrackId = targetTrack.getAttribute('data-tid');
    
    if (srcFolderId !== targetFolderId) return;
    
    const folder = lib.folders.find(f => f.id === srcFolderId);
    if (!folder) return;
    
    const srcIndex = folder.tracks.findIndex(t => t.id === srcTrackId);
    const targetIndex = folder.tracks.findIndex(t => t.id === targetTrackId);
    
    if (srcIndex === -1 || targetIndex === -1) return;
    
    const [removedTrack] = folder.tracks.splice(srcIndex, 1);
    folder.tracks.splice(targetIndex, 0, removedTrack);
    
    saveLib();
    render();
    
    return false;
}

function dragEnd(e) {
    const tracks = document.querySelectorAll('.track');
    tracks.forEach(track => {
        track.classList.remove('dragging');
    });
    
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
            
            if (!impLib.folders || !Array.isArray(impLib.folders)) {
                throw new Error("Invalid library format");
            }
            
            if (confirm("Replace current library?")) {
                lib = impLib;
                saveLib();
                render();
                updFSel();
                alert("Library imported!");
            }
        } catch (error) {
            alert("Error importing: " + error.message);
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

document.addEventListener('DOMContentLoaded', () => {
    const scScript = d.createElement('script');
    scScript.src = "https://w.soundcloud.com/player/api.js";
    d.head.appendChild(scScript);
    
    init();
});
