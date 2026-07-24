// Get the modal element
const modal = document.getElementById("popup-modal");
let timer; // Variable to hold the timer reference

// Function to open the pop-up
function openPopup() {
    // We use 'flex' display here to center the modal
    modal.style.display = "flex"; 
}

// Function to close the pop-up and set a new timer
function closePopup() {
    modal.style.display = "none";
    // Set a new timer to call openPopup() after 60,000 milliseconds (1 minute)
    timer = setTimeout(openPopup, 60000);
}

// Optional: close the pop-up when clicking outside of the content overlay
window.onclick = function(event) {
    if (event.target == modal) {
        closePopup();
    }
}

// Call openPopup immediately when the script loads (website opens)
openPopup();


const dropdown = document.getElementById('gameSelect');

function play() {
    const selectedPath = dropdown.value;
    if (selectedPath) {
        // Simple relative navigation — avoids double-slash from pathname string concat
        window.location.href = selectedPath;
    }
}

function settings() {
    const popup = document.getElementById('settings-cont');
    const overlay = document.getElementById('overlay');
    if (popup && overlay) {
        overlay.classList.add('visible');
        popup.style.display = 'block';
        requestAnimationFrame(() => {
            popup.classList.add('scale-in');
        });
    }
}

function close() {
    const popup = document.getElementById('settings-cont');
    const overlay = document.getElementById('overlay');
    console.log('close');
    if (popup && overlay) {
        overlay.classList.remove('visible');
        popup.classList.remove('scale-in');
        popup.classList.add('scale-out');
        popup.addEventListener(
            'animationend',
            function onAnimationEnd() {
                popup.style.display = 'none';
                popup.classList.remove('scale-out');
                popup.removeEventListener('animationend', onAnimationEnd);
            }
        );
    }
}

const closeButton = document.getElementById('close-button');
if (closeButton) {
  closeButton.addEventListener('click', function() {
    close();
  });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        close();
    }
});

// Use the actual music file that exists in the repo
const audio = new Audio(new URL('assets/music/moog_city_2.ogg', window.location.href).toString());

document.addEventListener('click', (event) => {
    if (event.target === closeButton) {
        close();
    }
});

function openProfile() {
    const profilePopup = document.getElementById('profile-popup');

    profilePopup.style.top = '10px'
    profilePopup.style.height = '175px'

    console.log('openProfile');
}

function closeProfile() {
    const profilePopup = document.getElementById('profile-popup');

    profilePopup.style.top = '-200px'
}

document.addEventListener('click', (event) => {
    if (event.target === closeProfile) {
        closeProfile();
    }
});

const audioFiles = [
    "1.mp3",
    "2.mp3",
    "3.mp3",
    "4.mp3"
];

window.onload = launch;

function music() {
    window.addEventListener("DOMContentLoaded", () => {
        
        const playAudio = () => {
            audio.play().catch(error => console.log("Autoplay blocked: ", error));
            document.getElementById("launchbg").removeEventListener("mouseenter", playAudio);
        };
        
        document.getElementById("launchbg").addEventListener("mouseenter", playAudio);

        const musicToggle = document.getElementById('musicToggle');
    });
}

function toggleMusic() {
    const toggle = document.getElementById('musicToggle');

    if (toggle.unchecked) {
        audio.pause();
    } else {
        audio.play();
    }
}

function launch() {
    const logo1 = document.getElementById('logo1');
    const logo2 = document.getElementById('logo2');
    const logo3 = document.getElementById('logo3');
    const background = document.getElementById('launchbg');

    setTimeout(() => {
        logo1.style.opacity = '1';
        logo1.style.width = '1250px';
    }, 500);

    setTimeout(() => {
        logo2.style.opacity = '1';
        logo2.style.width = '1250px';
    }, 4000);

    setTimeout(() => {
        logo3.style.opacity = '1';
        logo3.style.scale = '1.1';
    }, 7000);

    setTimeout(() => {
        logo1.style.opacity = '0';
    }, 3000);

    setTimeout(() => {
        logo2.style.opacity = '0';
    }, 6000);

    setTimeout(() => {
        logo3.style.opacity = '0';
    }, 9000);

    setTimeout(() => {
        background.style.opacity = '0';
    }, 10000);

    setTimeout(() => {
        background.style.display = 'none';
        logo1.style.display = 'none';
        logo2.style.display = 'none';
        logo3.style.display = 'none';
    }, 11000);
}

audio.addEventListener("ended", music);

window.addEventListener('change', event => {

});

music()

const backButton = document.getElementById('back-button');
if (backButton) {
  backButton.addEventListener('click', function() {
    window.open('./', '_blank');
  });
}