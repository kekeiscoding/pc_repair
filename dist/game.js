const app = document.querySelector('#app');
const hardware = {
  board: ['Motherboard', 'Check that the standoffs match the mounting holes. Extra standoffs can short the board.'],
  ram: ['RAM', 'Release the DIMM latches to remove RAM. When reseating it, align the notch and press evenly until the latches click.'],
  psu: ['Power supply', 'Handle the power supply as a sealed unit. Support its weight while removing the mounting screws.'],
  hdd: ['Hard drive', 'Disconnect SATA data and power by their plugs. Handle the drive gently and secure it in its bay.'],
  cables: ['Cables', 'Release connector clips before pulling. Reconnect motherboard and CPU power, SATA data and power, and front-panel leads.']
};
const screwIds = ['s1', 's2', 's3', 's4'];
const partIds = Object.keys(hardware);
const ids = [...partIds, ...screwIds];
const installed = new Set(ids);
let stage = 'ready';
let started;
let teardownTime;
let rebuildTime;
let mistakes = 0;
let step = 0;
let message = '';
let isError = false;

const setup = [
  ['Boot device', 'A Windows 11 installer USB is plugged in. Choose the device to boot from in the UEFI boot menu.', ['Internal HDD', 'UEFI USB installer', 'Network boot'], 1, 'Boot the installer in UEFI mode from the prepared USB.'],
  ['Language and keyboard', 'The lab requires English (United States) and a US keyboard. Select the requested settings.', ['English (United States) · US', 'English (United Kingdom) · UK', 'English (United States) · French'], 0, 'Match both the language and the keyboard layout to the lab brief.'],
  ['Installation type', 'Set up a fresh Windows installation on the blank lab drive.', ['Repair my PC', 'Boot the existing system', 'Install Windows 11 and acknowledge the clean install'], 2, 'Choose Install Windows 11 for a clean installation. Confirm data is backed up before using this option on real hardware.'],
  ['Edition and license', 'This lab PC has a Windows 11 Home digital license. Choose the edition and accept its license terms.', ['Windows 11 Pro · Accept terms', 'Windows 11 Home · Accept terms', 'Windows 11 Education · Accept terms'], 1, 'Install the edition that matches the device’s license.'],
  ['Choose a drive', 'Install to the blank 500 GB HDD. The second drive contains the lab backup.', ['Disk 1 · 1 TB backup drive', 'Disk 0 · 500 GB unallocated space', 'USB · 32 GB installer'], 1, 'Check the drive size and label. Leave the backup drive and USB untouched.'],
  ['Ready to install', 'The target is Windows 11 Home on the blank 500 GB lab drive. What should you do next?', ['Install and let setup restart the PC', 'Turn the PC off while files are copying', 'Delete the backup drive'], 0, 'Keep the PC powered while setup copies files and restarts.'],
  ['First restart', 'Setup has restarted the PC. The boot menu appears again. Continue the installation from the internal drive.', ['Boot the USB installer again', 'Boot the backup disk', 'Select Windows Boot Manager'], 2, 'Windows Boot Manager continues setup from the drive where Windows was installed.'],
  ['First-run setup', 'Finish configuring the new Windows installation for the lab.', ['Boot back into the installer', 'Confirm region and keyboard, connect, and complete account and privacy setup', 'Power off before creating an account'], 1, 'Complete the first-run prompts before checking the desktop.'],
  ['Post-install checks', 'The desktop is ready. What should you verify before handing over the PC?', ['The case lights turn on', 'The desktop wallpaper loads', 'Run Windows Update and check Device Manager for missing drivers'], 2, 'Check for updates and confirm that hardware has the drivers it needs.']
];

function format(ms) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 60), seconds % 60].map(value => String(value).padStart(2,'0')).join(':');
}

function caseArt(preview = false) {
  const pieces = ids.map((id, index) => {
    const screw = screwIds.includes(id);
    const label = screw ? 'Screw ' + (index - partIds.length + 1) : hardware[id][0];
    const content = screw ? '+' : '<span>' + label + '</span>';
    const classes = 'hot ' + id + (screw ? ' screw' : '') + (installed.has(id) ? '' : ' empty');
    if (preview) return '<div class="' + classes + '">' + content + '</div>';
    return '<button class="' + classes + '" data-part="' + id + '" aria-label="' + label + ', ' + (installed.has(id) ? 'installed' : 'in tray') + '">' + content + '</button>';
  }).join('');
  return '<div class="tower"' + (preview ? ' aria-hidden="true"' : ' role="group" aria-label="PC chassis"') + '>' + pieces + '</div>';
}

function home() {
  app.innerHTML = '<section class="hero"><div><p class="eyebrow">Hands-on exam practice</p><h1>PC repair.<br><em>Powered up.</em></h1><p class="lede">Strip a desktop down to its chassis, put it back together, and boot into a fresh operating system. Beat your own time as you learn the repair sequence.</p><a class="cta" href="?play=1" target="_blank" rel="noopener">Play Game</a></div><div class="bench"><span class="bench-label">DESKTOP WORKBENCH</span>' + caseArt(true) + '</div></section><section class="cards" aria-label="What you will practice"><article class="card"><span class="tag">HARDWARE</span><h3>Strip & rebuild</h3><p>Work with screws, RAM, the motherboard, power supply, hard drive, and cables.</p></article><article class="card"><span class="tag">SOFTWARE</span><h3>Install the OS</h3><p>Boot from USB, pick the right drive, and complete Windows 11 setup.</p></article><article class="card"><span class="tag">EXAM PRACTICE</span><h3>Time your run</h3><p>Get separate times for teardown and rebuild, plus feedback when you miss a step.</p></article></section>';
}

function clocks() {
  return '<div class="metrics"><span class="timer">TEARDOWN <strong id="down">00:00</strong></span><span class="timer">REBUILD <strong id="up">00:00</strong></span></div>';
}

function tick() {
  const down = document.querySelector('#down');
  if (!down) return;
  down.textContent = format(teardownTime ?? (stage === 'remove' ? performance.now() - started : 0));
  document.querySelector('#up').textContent = format(rebuildTime ?? (stage === 'install' ? performance.now() - started : 0));
}

function hardwareView() {
  const rebuilding = stage === 'install';
  const ready = stage === 'ready';
  const completed = rebuilding ? installed.size : ids.length - installed.size;
  const tray = [...screwIds, ...partIds].filter(id => partIds.includes(id) || id === 's1').map(id => {
    if (id === 's1') return '<button class="part" data-action="screws">Case screws <small>' + screwIds.filter(key => !installed.has(key)).length + '/4 in tray</small></button>';
    return '<button class="part" data-part="' + id + '">' + hardware[id][0] + '<small>' + (installed.has(id) ? 'In case' : 'In tray') + '</small></button>';
  }).join('');
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Hardware lab</span><h2>' + (rebuilding ? 'Reassemble the PC' : 'Disassemble the PC') + '</h2></div>' + clocks() + '</div><div class="game-grid"><section class="bench"><span class="bench-label">OPEN CHASSIS</span>' + caseArt() + '</section><aside class="panel"><h3>' + (ready ? 'Before you start' : 'Parts tray') + '</h3><p>' + (ready ? 'The simulated PC is shut down and unplugged. In the lab, ground yourself before touching components.' : completed + ' of ' + ids.length + ' actions complete. Select parts on the case or in the tray.') + '</p><progress class="progress" value="' + completed + '" max="' + ids.length + '" aria-label="Hardware progress"></progress><div class="parts">' + tray + '</div><div class="feedback' + (isError ? ' error' : '') + '" role="status">' + (message || 'Start the timer when you’re ready. Remove all four case screws first.') + '</div><div class="controls">' + (ready ? '<button class="cta" data-action="start">Start teardown</button>' : '<button data-action="hint">Show hint</button>') + '</div></aside></div>';
  tick();
}

function hardwareHint() {
  const anyScrew = screwIds.some(id => installed.has(id));
  if (stage === 'remove') {
    if (anyScrew) return 'Remove each of the four case screws. They are the silver circles at the corners.';
    if (installed.has('cables')) return 'Disconnect the cables before lifting any components.';
    if (installed.has('ram')) return 'Release and remove the RAM before lifting the motherboard.';
    return 'Remove any remaining drives, power supply, and motherboard. Their mounting screws are handled with each part.';
  }
  if (!installed.has('board')) return 'Seat the motherboard before installing RAM.';
  if (partIds.slice(0, 4).some(id => !installed.has(id))) return 'Seat all hardware before reconnecting the cables.';
  if (!installed.has('cables')) return 'Reconnect the cables, then close the case with all four screws.';
  return 'Replace the four case screws in the corner positions.';
}

function changePart(id) {
  if (stage === 'ready') return feedback('Select Start teardown to begin the timed exercise.');
  const screw = screwIds.includes(id);
  const label = screw ? 'Case screw' : hardware[id][0];
  if (stage === 'remove') {
    if (!installed.has(id)) return feedback(label + ' is already in the tray.');
    if (!screw && screwIds.some(key => installed.has(key))) return mistake('Remove all four case screws before touching the internal parts.');
    if (!screw && id !== 'cables' && installed.has('cables')) return mistake('Disconnect the cables first to avoid pulling on a connector.');
    if (id === 'board' && installed.has('ram')) return mistake('Release and remove the RAM before lifting the motherboard.');
    installed.delete(id);
    if (!installed.size) {
      teardownTime = performance.now() - started;
      stage = 'rebuild-ready';
      return transition();
    }
  } else {
    if (installed.has(id)) return feedback(label + ' is already installed.');
    if (screw && !partIds.every(key => installed.has(key))) return mistake('Finish seating and connecting all internal parts before closing the case.');
    if (id === 'ram' && !installed.has('board')) return mistake('Install the motherboard before seating RAM.');
    if (id === 'cables' && !partIds.filter(key => key !== id).every(key => installed.has(key))) return mistake('Seat the hardware before reconnecting the cables.');
    installed.add(id);
    if (installed.size === ids.length) {
      rebuildTime = performance.now() - started;
      stage = 'post';
      return transition();
    }
  }
  feedback(label + (stage === 'remove' ? ' moved to the tray. ' : ' installed. ') + (screw ? 'Keep track of the four case screws.' : hardware[id][1]));
}

function transition() {
  const rebuilding = stage === 'rebuild-ready';
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Hardware lab</span><h2>' + (rebuilding ? 'Teardown complete' : 'Rebuild complete') + '</h2></div>' + clocks() + '</div><div class="game-grid"><section class="bench"><span class="bench-label">DESKTOP WORKBENCH</span>' + caseArt(true) + '</section><aside class="panel"><h3>' + (rebuilding ? 'Ready to rebuild?' : 'Ready to boot?') + '</h3><p>' + (rebuilding ? 'All parts are in the tray. Reseat the hardware, connect the cables, and replace all four case screws.' : 'All parts are fitted and the case is secured. Run a simulated power-on self-test, then boot from installation media.') + '</p><div class="controls"><button class="cta" data-action="' + (rebuilding ? 'rebuild' : 'boot') + '">' + (rebuilding ? 'Start rebuild' : 'Run POST and open boot menu') + '</button></div></aside></div>';
  tick();
  app.querySelector('.cta').focus();
}

function softwareView() {
  const [title, prompt, options] = setup[step];
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Software lab</span><h2>Install Windows 11</h2></div>' + clocks() + '</div><section class="bench"><span class="bench-label">SYSTEM MONITOR</span><div class="screen"><span class="eyebrow">Setup · ' + (step + 1) + ' / ' + setup.length + '</span><h3 tabindex="-1">' + title + '</h3><p>' + prompt + '</p><div class="options">' + options.map((option, index) => '<button data-answer="' + index + '">' + option + '</button>').join('') + '</div><div class="feedback' + (isError ? ' error' : '') + '" role="status">' + (message || 'Select an option to continue.') + '</div></div><div class="stand"></div></section>';
  tick();
}

function finish() {
  stage = 'done';
  app.innerHTML = '<section class="panel result"><p class="eyebrow">Practical complete</p><h2>System ready</h2><p>You reassembled the PC and brought it from an empty drive to a working Windows desktop.</p><dl><dt>Disassembly time</dt><dd>' + format(teardownTime) + '</dd><dt>Reassembly time</dt><dd>' + format(rebuildTime) + '</dd><dt>Total hardware time</dt><dd>' + format(teardownTime + rebuildTime) + '</dd><dt>Incorrect actions</dt><dd>' + mistakes + '</dd></dl><div class="controls"><a class="cta" href="?play=1">Play again</a><a class="cta" href="index.html">Home</a></div></section>';
  app.querySelector('.cta').focus();
}

function feedback(text, error = false) {
  message = text;
  isError = error;
  const box = app.querySelector('.feedback');
  box.textContent = message;
  box.classList.toggle('error', isError);
  app.querySelectorAll('[data-part]').forEach(button => {
    const id = button.dataset.part;
    const present = installed.has(id);
    if (button.classList.contains('hot')) {
      button.classList.toggle('empty', !present);
      const label = hardware[id]?.[0] ?? 'Screw ' + (screwIds.indexOf(id) + 1);
      button.setAttribute('aria-label', label + (present ? ', installed' : ', in tray'));
    } else button.querySelector('small').textContent = present ? 'In case' : 'In tray';
  });
  const progress = app.querySelector('progress');
  if (progress) {
    const count = stage === 'install' ? installed.size : ids.length - installed.size;
    progress.value = count;
    app.querySelector('aside p').textContent = stage === 'ready' ? 'The simulated PC is shut down and unplugged. In the lab, ground yourself before touching components.' : count + ' of ' + ids.length + ' actions complete. Select parts on the case or in the tray.';
    app.querySelector('[data-action="screws"] small').textContent = screwIds.filter(id => !installed.has(id)).length + '/4 in tray';
  }
}

function mistake(text) {
  mistakes++;
  feedback(text, true);
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {part, action, answer} = button.dataset;
  if (part) changePart(part);
  if (action === 'hint' || action === 'screws') feedback(action === 'hint' ? hardwareHint() : 'Select the individual screw positions at the four corners of the case.');
  if (action === 'start' || action === 'rebuild') {
    stage = action === 'start' ? 'remove' : 'install';
    started = performance.now();
    message = hardwareHint();
    isError = false;
    hardwareView();
    app.querySelector('.hot').focus();
  }
  if (action === 'boot') {
    stage = 'software';
    message = 'POST passed. The simulator detected RAM and the system drive.';
    isError = false;
    softwareView();
    app.querySelector('.screen h3').focus();
  }
  if (answer !== undefined) {
    if (Number(answer) !== setup[step][3]) return mistake(setup[step][4]);
    message = setup[step][4];
    isError = false;
    step++;
    if (step === setup.length) return finish();
    softwareView();
    app.querySelector('.screen h3').focus();
  }
});

if (new URLSearchParams(location.search).has('play')) {
  hardwareView();
  setInterval(tick, 200);
} else home();
