const dropdown = document.getElementById('gameSelect');

function play() {
    const selectedPath = dropdown.value;
    if (selectedPath) {
        // Use relative navigation — avoids double-slash from pathname string concat
        window.location.href = selectedPath;
    }
}
