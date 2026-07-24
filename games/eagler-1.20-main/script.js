function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function launchGame() {
    const versionSelect = document.getElementById('versionSelect');
    if (versionSelect && versionSelect.value) {
        if (versionSelect.value === 'javascript') {
            showScreen('javascript-screen');
        } else if (versionSelect.value === 'wasm') {
            showScreen('wasm-screen');
        }
    }
}

function launchGameWithSettings(selectId) {
    const buildSelect = document.getElementById(selectId);
    if (buildSelect && buildSelect.value) {
        const url = buildSelect.value;
        const toggle = document.getElementById('aboutBlankToggle');
        const useAboutBlank = toggle ? toggle.checked : localStorage.getItem('eaglerCloak') === 'true';

        if (useAboutBlank) {
            const win = window.open('about:blank', '_blank');
            if (win) {
                win.document.body.style.margin = '0';
                win.document.body.style.height = '100vh';
                win.document.body.style.overflow = 'hidden';
                const iframe = win.document.createElement('iframe');
                iframe.style.border = 'none';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.margin = '0';
                iframe.src = window.location.href.replace(/[^/]*$/, '') + url;
                win.document.body.appendChild(iframe);
                
                // Pause launcher music
                const audio = document.getElementById('bg-music');
                if (audio) audio.pause();
            } else {
                alert('Popup blocker prevented opening the game in a new tab.');
                window.location.href = url; // fallback
            }
        } else {
            window.location.href = url;
        }
    }
}

function closeNotice() {
    const modal = document.getElementById('notice-modal');
    if (modal) modal.style.display = 'none';
    
    // Play audio after user interaction
    const audio = document.getElementById('bg-music');
    if (audio) {
        audio.play().catch(err => {
            console.log('Background music play prevented by browser, requires more interaction.');
        });
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key.toLowerCase() === 'z') {
        window.location.replace('assets/fakeBlock/blocked.html');
    }
    
    if (event.key === 'Escape') {
        // If notice is hidden, escape goes back to main menu
        const modal = document.getElementById('notice-modal');
        if (!modal || modal.style.display === 'none') {
            showScreen('main-menu');
        }
    }
});

const liquidToggle = document.getElementById('liquidToggle');
if (liquidToggle) {
    liquidToggle.addEventListener('change', function(e) {
        const bg = document.getElementById('background-container') || document.querySelector('.bg-video');
        if(bg) {
            if(e.target.checked) {
                bg.style.filter = "brightness(0.7) hue-rotate(90deg) blur(3px) contrast(1.2)";
            } else {
                bg.style.filter = "brightness(0.7)";
            }
        }
    });
}


function updateRuntimes() {
    const clientSelect = document.getElementById('clientSelect');
    const clientStr = clientSelect ? clientSelect.value : null;
    const versionSelect = document.getElementById('versionSelect');
    
    if (!versionSelect) return;
    versionSelect.innerHTML = '';
    
    if (clientStr === 'eaglercraftz') {
        versionSelect.innerHTML = `
            <option value="javascript">EaglercraftZ Javascript</option>
            <option value="wasm">EaglercraftZ Wasm</option>
        `;
    } else {
        versionSelect.innerHTML = '<option value="">(More coming soon)</option>';
    }
}

// Intro Animation Logic & Setup
document.addEventListener('DOMContentLoaded', () => {
    // Setup Cloak Toggle
    const cloakToggle = document.getElementById('aboutBlankToggle');
    if (cloakToggle) {
        cloakToggle.checked = localStorage.getItem('eaglerCloak') === 'true';
        cloakToggle.addEventListener('change', (e) => {
            localStorage.setItem('eaglerCloak', e.target.checked);
        });
    }

    // Playlist Logic
    const playlist = [
        'assets/music/moog_city_2.ogg'
        // -- Add more track paths here --
    ];
    let currentSongIndex = 0;
    
    const audio = document.getElementById('bg-music');
    if (audio) {
        audio.addEventListener('ended', () => {
            if (playlist.length > 1) {
                let nextSongIndex;
                do {
                    nextSongIndex = Math.floor(Math.random() * playlist.length);
                } while (nextSongIndex === currentSongIndex);
                currentSongIndex = nextSongIndex;
            }
            audio.src = playlist[currentSongIndex];
            audio.play().catch(console.error);
        });
    }

    const introScreen = document.getElementById('intro-screen');
    if (!introScreen) return; // if not present, skip

    const logo1 = document.getElementById('logo1');
    const logo2 = document.getElementById('logo2');
    const logo3 = document.getElementById('logo3');

    setTimeout(() => {
        if(logo1) logo1.style.opacity = '1';
    }, 500);

    setTimeout(() => {
        if(logo1) logo1.style.opacity = '0';
    }, 3000);

    setTimeout(() => {
        if(logo2) {
            logo2.style.opacity = '1';
            const targetSize = window.innerWidth < 1000 ? window.innerWidth + 'px' : '1000px';
            logo2.style.width = targetSize;
        }
    }, 3500);

    setTimeout(() => {
        if(logo2) logo2.style.opacity = '0';
    }, 6000);

    setTimeout(() => {
        if(logo3) {
            logo3.style.opacity = '1';
            logo3.style.transform = 'translate(-50%, -50%) scale(1.1)';
        }
    }, 6500);

    setTimeout(() => {
        if(logo3) logo3.style.opacity = '0';
    }, 9000);

    setTimeout(() => {
        introScreen.style.opacity = '0';
        setTimeout(() => {
            introScreen.style.display = 'none';
        }, 500);
    }, 9500);
});