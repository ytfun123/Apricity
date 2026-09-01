const { ticalc, tifiles } = require('ticalc-usb');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// TI first disabled the Asm84CEPrgrm token in OS 5.3.1, then removed ASM
// program support entirely in OS 5.5.1 (EU) / 5.5.5 (US) on the TI-84 Plus CE
// / TI-83 Premium CE family. Below this threshold, ASM programs still run
// natively and no jailbreak is needed. At or above it, a jailbreak (such as
// arTIfiCE) is required to run ASM/C programs and games again.
const ASM_LOCK_VERSION_TEXT = '5.5.1 (EU) / 5.5.5 (US)';

// Drop the actual calculator files into docs/files/ (see docs/files/README.md)
// and they'll show up here as one-click additions to the queue once we know
// the connected calculator's OS needs them.
const BUILTIN_FILES = [
  {
    key: 'jailbreak',
    label: 'arTIfiCE (jailbreak)',
    path: 'files/arTIfiCE_v2_1.8xp',
    required: true
  },
  {
    key: 'cesium',
    label: 'Cesium (shell)',
    path: 'files/cesium_english_zx0.8xp',
    required: false
  }
];

// Games library: each category is a folder under docs/games/<key>/ with a
// manifest.json listing its files (see docs/games/README.md). To add a new
// category, create the folder + manifest.json and add an entry here — no
// other code changes needed.
const GAME_CATEGORIES = [
  { key: 'gd', label: 'Geometry Dash', dir: 'games/gd' },
  { key: 'mc', label: 'Minecraft', dir: 'games/mc' },
  { key: 'pacman', label: 'Pac-Man', dir: 'games/pacman' },
  { key: 'flappy', label: 'Flappy Bird', dir: 'games/flappy' },
  { key: 'portal', label: 'Portal', dir: 'games/portal' },
  { key: 'tetris', label: 'Tetris', dir: 'games/tetris' },
  { key: '2048', label: '2048', dir: 'games/2048' },
  { key: 'checkers', label: 'Checkers', dir: 'games/checkers' },
  { key: 'chess', label: 'Chess', dir: 'games/chess' },
  { key: 'totl', label: 'This Is The Only Level', dir: 'games/totl' },
  { key: 'stacker', label: 'Stacker', dir: 'games/stacker' },
  { key: 'dino', label: 'Dino Run', dir: 'games/dino' },
  { key: 'swipe', label: 'SwipeCE', dir: 'games/swipe' },
  { key: 'falldown', label: 'Falldown', dir: 'games/falldown' },
  { key: 'netchat', label: 'NetChat', dir: 'our-apps/netchat' }
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let calculator = null;
let asmLocked = null;      // null = not asked yet, true/false once answered
let jailbreakReady = false; // true once the jailbreak step is resolved (not needed, already had it, or installed)
let queue = [];             // { id, name, tiFile, status, message, builtin, key }
let nextId = 1;

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------

window.addEventListener('load', () => {
  runCompatibilityTests();

  if ( ticalc.browserSupported() ) {
    showSupportedDevices();
    attachConnectionListeners();
    updateButtons();
    attachClickListeners();
    ticalc.init({ supportLevel: 'none' })
      .catch(e => handleUnsupported(e));

    document.querySelector('#flow').classList.add('active');
    document.querySelector('#incompatible').classList.remove('active');
  } else {
    document.querySelector('#flow').classList.remove('active');
    document.querySelector('#incompatible').classList.add('active');
  }
});

// ---------------------------------------------------------------------------
// Compatibility test panel ("the test on top")
// ---------------------------------------------------------------------------

function runCompatibilityTests() {
  const browserItem = document.querySelector('#test-browser');
  const httpsItem = document.querySelector('#test-https');

  const supported = ticalc.browserSupported();
  setTestResult(
    browserItem,
    supported,
    supported
      ? 'Your browser supports WebUSB.'
      : 'Your browser does not support WebUSB. Try a recent Chrome or Edge.'
  );

  const secure = window.isSecureContext;
  setTestResult(
    httpsItem,
    secure,
    secure
      ? 'Connection is secure.'
      : 'This page is not running in a secure context, WebUSB will not work.'
  );
}

function setTestResult(el, passed, text) {
  if ( !el ) return;
  el.classList.remove('pending');
  el.classList.toggle('pass', passed);
  el.classList.toggle('fail', !passed);
  el.textContent = text;
}

// ---------------------------------------------------------------------------
// Device list / buttons
// ---------------------------------------------------------------------------

function showSupportedDevices() {
  const calcNames = ticalc.models()
                          .filter(c => c.status == 'supported' || c.status == 'beta')
                          .map(c => c.status == 'beta' ? c.name + ' (beta)' : c.name)
                          .join(', ');
  document.querySelector('#supported').innerText = calcNames;
}

function updateButtons() {
  document.querySelectorAll('.buttons button').forEach(b =>
    b.classList.remove('active', 'complete')
  );

  if ( calculator )
    document.querySelector('#connect').classList.add('complete');
  else {
    document.querySelector('#connect').classList.add('active');
    document.querySelector('#connect').focus();
  }

  const osButton = document.querySelector('#os');
  const osLabel = osButton.querySelector('.label');
  if ( asmLocked !== null ) {
    osButton.classList.add('complete');
    osLabel.textContent = asmLocked
      ? (jailbreakReady ? 'OS check \u00b7 jailbreak sorted' : 'OS check \u00b7 jailbreak needed')
      : 'OS check \u00b7 ASM already works';
  } else if ( calculator ) {
    osButton.classList.add('active');
    osLabel.textContent = 'Calculator OS version';
  } else {
    osLabel.textContent = 'Calculator OS version';
  }

  const uploadButton = document.querySelector('#upload');
  if ( calculator || asmLocked !== null )
    uploadButton.classList.add(queue.length ? 'complete' : 'active');

  renderQueue();
  renderGamesGate();
}

function attachConnectionListeners() {
  ticalc.addEventListener('disconnect', calc => {
    if ( calc != calculator ) return;
    calculator = null;
    asmLocked = null;
    jailbreakReady = false;
    updateButtons();
  });

  ticalc.addEventListener('connect', async calc => {
    if ( calc.status == 'experimental' || calc.status == 'beta' ) {
      return confirm('Be careful!', `Your device (${calc.name}) only has ${calc.status} support. Are you sure you want to continue?`)
             .then(() => connect(calc))
             .catch(() => {});
    } else {
      return connect(calc);
    }
  });
}

async function connect(calc) {
  if ( await calc.isReady() ) {
    calculator = calc;
    updateButtons();
  } else {
    alert('Sorry!', 'The connected device does not seem to be responding.');
  }
}

function attachClickListeners() {
  document.querySelector('#connect')
          .addEventListener('click', () =>
            ticalc.choose()
            .catch(e => handleUnsupported(e))
          );

  document.querySelector('#os')
          .addEventListener('click', () => osButtonFlow());

  document.querySelector('#upload')
          .addEventListener('click', () => addFiles());
}

// Same ASM + jailbreak questions the #os button asks, as a re-usable sequence.
async function osButtonFlow() {
  if ( asmLocked === null ) await askOsVersion();
  if ( asmLocked && !jailbreakReady ) await askJailbreakStatus();
  updateButtons();
}

// ---------------------------------------------------------------------------
// Sending prerequisites: connect the calculator, then sort out ASM / jailbreak
// ---------------------------------------------------------------------------

function waitForCalculator() {
  return new Promise(resolve => {
    const deadline = Date.now() + 15000;
    const tick = () => {
      if ( calculator ) return resolve(true);
      if ( Date.now() > deadline ) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Makes sure we have a connected calculator and that the ASM/jailbreak
// questions have been answered, so files can be sent right away.
async function ensureSendReady() {
  if ( !calculator ) {
    try {
      await ticalc.choose();
    } catch (e) {
      return false; // user cancelled the device picker
    }
    if ( !(await waitForCalculator()) ) return false;
  }

  if ( asmLocked === null ) await askOsVersion();
  if ( asmLocked && !jailbreakReady ) await askJailbreakStatus();
  updateButtons();
  return true;
}

// ---------------------------------------------------------------------------
// OS check + jailbreak step
// ---------------------------------------------------------------------------

function askOsVersion() {
  const popup = setPopup(
    'Is ASM/C blocked on your calculator?',
    `TI locked ASM/C programs starting with OS ${ASM_LOCK_VERSION_TEXT} on the TI-84 Plus CE / TI-83 Premium CE family.`
  );

  const custom = popup.querySelector('.custom');
  custom.innerHTML = `
    <details class="instructions">
      <summary>How do I check my OS version?</summary>
      <ol>
        <li>Turn your calculator on.</li>
        <li>Press <kbd>2nd</kbd> then <kbd>+</kbd> (the key labelled MEM) to open the Memory menu.</li>
        <li>Choose <strong>1: About</strong>.</li>
        <li>The OS version is shown on that screen, e.g. "OS VERSION 5.6.5".</li>
      </ol>
    </details>
  `;

  return new Promise(resolve => {
    const yesBtn = popupButton('no', "Yes, it's blocked", () => {
      asmLocked = true;
      jailbreakReady = false;
      popup.classList.remove('active');
      updateButtons();
      resolve();
    });

    const noBtn = popupButton('yes', 'No, ASM still works', () => {
      asmLocked = false;
      jailbreakReady = true;
      popup.classList.remove('active');
      updateButtons();
      resolve();
    });

    popup.querySelector('.buttons').innerHTML = '';
    popup.querySelector('.buttons').appendChild(noBtn);
    popup.querySelector('.buttons').appendChild(yesBtn);
    popup.classList.add('active');
  });
}

function askJailbreakStatus() {
  const popup = setPopup(
    'Jailbreak needed',
    'Do you already have arTIfiCE and Cesium installed on your calculator?'
  );

  return new Promise(async resolve => {
    const haveItBtn = popupButton('yes', 'I already have it', () => {
      jailbreakReady = true;
      popup.classList.remove('active');
      updateButtons();
      resolve();
    });

    const installBtn = popupButton('no', 'Install it now', async () => {
      popup.classList.remove('active');
      await installJailbreak();
      resolve();
    });

    popup.querySelector('.buttons').innerHTML = '';
    popup.querySelector('.buttons').appendChild(haveItBtn);
    popup.querySelector('.buttons').appendChild(installBtn);
    popup.classList.add('active');
  });
}

async function installJailbreak() {
  if ( !calculator ) {
    await alert('Connect your calculator first', 'Please select your calculator (step 1) before installing the jailbreak.');
    jailbreakReady = false;
    updateButtons();
    return;
  }

  for ( const entry of BUILTIN_FILES ) {
    const item = await addFileFromPath(entry.label, entry.path, { builtin: true, key: entry.key });
    updateButtons();
    if ( item && item.tiFile ) {
      await sendQueueItem(item.id);
    }
  }

  jailbreakReady = true;
  updateButtons();

  alert(
    'Almost done!',
    'Now open the CabriJr app on your calculator and follow its on-screen steps to finish jailbreaking. Once that\u2019s done you can install games below.'
  );
}

// ---------------------------------------------------------------------------
// File queue
// ---------------------------------------------------------------------------

function addFiles() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.8xp,.8xg,.8xv,.83p,.83g,.82p,.82g';
  input.addEventListener('change', async c => {
    for ( const rawFile of Array.from(c.target.files) ) {
      await addFileToQueue(rawFile);
    }
    updateButtons();
  });
  input.click();
}

async function addFileToQueue(rawFile) {
  let tiFile;
  try {
    tiFile = tifiles.parseFile(await readFile(rawFile));
  } catch (e) {
    queue.push(makeQueueItem(rawFile.name, null, 'error', 'Could not read this file.'));
    return;
  }

  if ( !tifiles.isValid(tiFile) ) {
    queue.push(makeQueueItem(rawFile.name, null, 'error', 'Not a valid calculator file.'));
    return;
  }

  if ( calculator && !calculator.canReceive(tiFile) ) {
    queue.push(makeQueueItem(rawFile.name, tiFile, 'error', `Not a valid file for your ${calculator.name}.`));
    return;
  }

  queue.push(makeQueueItem(rawFile.name, tiFile, 'pending', null));
}

async function addFileFromPath(label, path, extra = {}) {
  try {
    const sep = path.includes('?') ? '&' : '?';
    const response = await fetch(`${path}${sep}v=6`);
    if ( !response.ok ) throw new Error('Not found');
    const buffer = new Uint8Array(await response.arrayBuffer());
    const tiFile = tifiles.parseFile(buffer);
    if ( calculator && !calculator.canReceive(tiFile) ) {
      const item = makeQueueItem(label, tiFile, 'error', `Not a valid file for your ${calculator.name}.`);
      Object.assign(item, extra);
      queue.unshift(item);
      return item;
    }
    const item = makeQueueItem(label, tiFile, 'pending', null);
    Object.assign(item, extra);
    queue.unshift(item);
    return item;
  } catch (e) {
    const item = makeQueueItem(label, null, 'error', `Couldn't load ${path}. Make sure the file has been added to the repo.`);
    Object.assign(item, extra);
    queue.unshift(item);
    return item;
  }
}

function makeQueueItem(name, tiFile, status, message) {
  return {
    id: nextId++,
    name,
    tiFile,
    status,     // pending | sending | sent | error
    message,
    builtin: false,
    key: null
  };
}

function renderQueue() {
  const filesSection = document.querySelector('#files');
  const list = document.querySelector('#file-list');
  list.innerHTML = '';

  if ( !queue.length ) {
    filesSection.classList.remove('active');
    return;
  }
  filesSection.classList.add('active');

  queue.forEach(item => {
    const li = document.createElement('li');
    li.className = `status-${item.status}`;

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = item.name + (item.builtin ? ' (built-in)' : '');
    li.appendChild(name);

    const status = document.createElement('span');
    status.className = 'file-status';
    status.textContent = statusLabel(item);
    li.appendChild(status);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.textContent = item.status === 'sent' ? 'Sent' : 'Send';
    sendBtn.disabled = !calculator || !item.tiFile || item.status === 'sending' || item.status === 'sent';
    sendBtn.addEventListener('click', () => sendQueueItem(item.id));
    li.appendChild(sendBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '\u2715';
    removeBtn.title = 'Remove from queue';
    removeBtn.addEventListener('click', () => {
      queue = queue.filter(q => q.id !== item.id);
      renderQueue();
    });
    li.appendChild(removeBtn);

    list.appendChild(li);
  });
}

function statusLabel(item) {
  switch ( item.status ) {
    case 'pending': return calculator ? 'Ready to send' : 'Waiting for calculator';
    case 'sending': return 'Sending\u2026';
    case 'sent': return 'Sent \u2713';
    case 'error': return item.message || 'Error';
    default: return '';
  }
}

async function sendQueueItem(id) {
  const item = queue.find(q => q.id === id);
  if ( !item || !item.tiFile ) return;
  if ( !calculator ) return alert('Sorry!', 'Please select a calculator first.');

  if ( !calculator.canReceive(item.tiFile) ) {
    item.status = 'error';
    item.message = `Not a valid file for your ${calculator.name}.`;
    renderQueue();
    return;
  }

  item.status = 'sending';
  renderQueue();

  try {
    const details = await calculator.getStorageDetails(item.tiFile);
    if ( !details.fits ) {
      item.status = 'error';
      item.message = 'Not enough free memory on the calculator.';
      renderQueue();
      return;
    }

    await calculator.sendFile(item.tiFile);
    item.status = 'sent';
    renderQueue();
  } catch (e) {
    item.status = 'error';
    item.message = 'Something went wrong sending this file.';
    console.error(e);
    renderQueue();
  }
}

// ---------------------------------------------------------------------------
// Games library
// ---------------------------------------------------------------------------

let gamesInitialized = false;

function renderGamesGate() {
  const locked = document.querySelector('#games-locked');
  const unlocked = document.querySelector('#game-categories');
  if ( !locked || !unlocked ) return;

  // The games library is always available — no OS-check gate anymore.
  locked.style.display = 'none';
  unlocked.style.display = 'block';

  if ( !gamesInitialized ) {
    gamesInitialized = true;
    initGameCategories();
  }
}

async function initGameCategories() {
  const container = document.querySelector('#game-categories');
  if ( !container ) return;
  container.innerHTML = '';
  container.setAttribute('data-model', 'ce');

  for ( const category of GAME_CATEGORIES ) {
    const card = document.createElement('section');
    card.className = 'game-category';
    card.setAttribute('data-model', 'ce');

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = `Send ${category.label}`;
    card.appendChild(downloadBtn);

    const status = document.createElement('p');
    status.className = 'game-status';
    card.appendChild(status);

    downloadBtn.addEventListener('click', async () => {
      const ready = await ensureSendReady();
      if ( !ready ) return;

      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Loading file list\u2026';
      status.textContent = '';

      const files = await fetchManifest(category);
      if ( !files.length ) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = `Send ${category.label}`;
        status.textContent = 'No files available yet. Check back soon!';
        return;
      }

      let sent = 0;
      for ( const entry of files ) {
        downloadBtn.textContent = `Sending ${sent + 1}/${files.length}\u2026`;
        const item = await addFileFromPath(entry.label || entry.file, `${category.dir}/${entry.file}`);
        updateButtons();
        if ( item && item.tiFile ) {
          await sendQueueItem(item.id);
          if ( item.status === 'sent' ) sent++;
        }
      }

      downloadBtn.disabled = false;
      if ( sent === files.length ) {
        downloadBtn.textContent = `Reinstall ${category.label}`;
        status.textContent = `${category.label} installed \u2713`;
      } else {
        downloadBtn.textContent = `Retry ${category.label}`;
        status.textContent = `${sent}/${files.length} files sent \u2014 check the queue above for errors.`;
      }
    });

    container.appendChild(card);
  }
}

async function fetchManifest(category) {
  try {
    const response = await fetch(`${category.dir}/manifest.json?v=6`);
    if ( !response.ok ) throw new Error('Not found');
    const files = await response.json();
    return Array.isArray(files) ? files : [];
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.addEventListener('load', (e) => resolve(new Uint8Array(e.target.result)));
    reader.addEventListener('error', reject);
    reader.readAsArrayBuffer(file);
  });
}

function handleUnsupported(error) {
  if ( error && error.message == 'Calculator model not supported' ) {
    confirm('Sorry!', 'It looks like your device is not yet supported. Would you like to submit it for consideration?')
    .then(() => sendSupportRequest(error.device))
    .catch(() => {});
  } else {
    console.error(error);
  }
}

function sendSupportRequest(device) {
  document.querySelector('#flow').innerHTML = `
    <h1>Device info to submit</h1>
    <p>Please <a href='https://github.com/Timendus/ticalc-usb/issues/new?assignees=&labels=device+support+request&template=calculator-support-request.md&title=Calculator+support+request' target="_blank">file a support request on Github</a> with the following information:</p>
    <pre>${JSON.stringify({
      deviceClass: device.deviceClass,
      deviceProtocol: device.deviceProtocol,
      deviceSubclass: device.deviceSubclass,
      deviceVersionMajor: device.deviceVersionMajor,
      deviceVersionMinor: device.deviceVersionMinor,
      deviceVersionSubminor: device.deviceVersionSubminor,
      manufacturerName: device.manufacturerName,
      productId: device.productId,
      productName: device.productName,
      serialNumber: device.serialNumber,
      usbVersionMajor: device.usbVersionMajor,
      usbVersionMinor: device.usbVersionMinor,
      usbVersionSubminor: device.usbVersionSubminor,
      vendorId: device.vendorId
    }, null, 2)}</pre>
  `;
}

function setPopup(title, body) {
  const popup = document.getElementById('popup');
  popup.querySelector('h2').innerText = title;
  popup.querySelector('p').innerText = body;
  popup.querySelector('.custom').innerHTML = '';
  popup.querySelector('.buttons').innerHTML = '';
  return popup;
}

function popupButton(clss, text, fn) {
  const button = document.createElement('button');
  button.classList.add(clss);
  button.innerText = text;
  button.onclick = fn;
  return button;
}

function alert(title, body) {
  return new Promise((resolve, reject) => {
    const popup = setPopup(title, body);
    const button = popupButton('yes', 'Okay', () => {
      popup.classList.remove('active');
      resolve();
    });
    popup.querySelector('.buttons').appendChild(button);
    popup.classList.add('active');
  });
}

function confirm(title, body) {
  return new Promise((resolve, reject) => {
    const popup = setPopup(title, body);
    const yesButton = popupButton('yes', 'Okay', () => {
      popup.classList.remove('active');
      resolve();
    });
    const noButton = popupButton('no', 'Cancel', () => {
      popup.classList.remove('active');
      reject();
    });
    popup.querySelector('.buttons').appendChild(yesButton);
    popup.querySelector('.buttons').appendChild(noButton);
    popup.classList.add('active');
  });
}

// Expose send primitives for inline scripts that create their own game cards.
window.tiFlash = { ensureSendReady, addFileFromPath, sendQueueItem, updateButtons };
