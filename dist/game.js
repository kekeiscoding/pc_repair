const app = document.querySelector('#app');
let stage = 'ready';
let started;
let teardownTime;
let rebuildTime;
let mistakes = 0;
let step = 0;
let message = '';
let isError = false;
const attached = new Set();

const setup = [
  ['Boot device', 'A Windows 11 installer USB is plugged in. Choose the device to boot from in the UEFI boot menu.', ['Internal HDD', 'UEFI USB installer', 'Network boot'], 1, 'Boot the installer in UEFI mode from the prepared USB.'],
  ['Language settings', 'The lab brief specifies English (United States). Select the installation language.', ['English (United States)', 'English (United Kingdom)', 'French (France)'], 0, 'The installation language controls the setup and Windows display language.'],
  ['Keyboard settings', 'The lab keyboard uses a US layout. Select the matching input method.', ['United Kingdom', 'French', 'US'], 2, 'Match the input method to the physical keyboard.'],
  ['Installation type', 'Set up a fresh Windows installation on the blank lab drive.', ['Repair my PC', 'Boot the existing system', 'Install Windows 11 and acknowledge the clean install'], 2, 'Choose Install Windows 11 for a clean installation. Confirm data is backed up before using this option on real hardware.'],
  ['Edition and license', 'This lab PC has a Windows 11 Home digital license. Choose the edition and accept its license terms.', ['Windows 11 Pro · Accept terms', 'Windows 11 Home · Accept terms', 'Windows 11 Education · Accept terms'], 1, 'Install the edition that matches the device’s license.'],
  ['Choose a drive', 'Install to the blank 500 GB HDD. The 1 TB SATA SSD contains the lab backup. Leave the NVMe diagnostic drive in place.', ['Disk 1 · 1 TB SATA SSD · Lab backup', 'Disk 0 · 500 GB HDD · Unallocated', 'Disk 2 · NVMe diagnostics'], 1, 'Check the drive size and label. Leave the backup and diagnostic drives untouched.'],
  ['Ready to install', 'The target is Windows 11 Home on the blank 500 GB lab drive. What should you do next?', ['Install and let setup restart the PC', 'Turn the PC off while files are copying', 'Delete the backup drive'], 0, 'Keep the PC powered while setup copies files and restarts.'],
  ['First restart', 'Setup has restarted the PC. The boot menu appears again. Continue the installation from the internal drive.', ['Boot the USB installer again', 'Boot the backup disk', 'Select Windows Boot Manager'], 2, 'Windows Boot Manager continues setup from the drive where Windows was installed.'],
  ['Region and layout', 'You’re setting up a PC for a lab in the Philippines with a US keyboard.', ['Philippines · US', 'United States · United Kingdom', 'Philippines · French'], 0, 'Check the region separately from the physical keyboard layout.'],
  ['Network and account', 'Set up the PC with the account provisioned for this lab.', ['Sign in with a different user’s credentials', 'Join the lab network and sign in with the assigned account', 'Boot back into the USB installer'], 1, 'Use the approved account for this device.'],
  ['Privacy settings', 'The lab requires optional diagnostic data to be off.', ['Enable optional diagnostic data', 'Restart setup', 'Send required diagnostic data only'], 2, 'Apply the lab’s privacy setting before continuing to the desktop.'],
  ['Post-install checks', 'The desktop is ready. What should you verify before handing over the PC?', ['The case lights turn on', 'The desktop wallpaper loads', 'Run Windows Update and check Device Manager for missing drivers'], 2, 'Check for updates and confirm that hardware has the drivers it needs.']
];

function format(ms) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 60), seconds % 60].map(value => String(value).padStart(2,'0')).join(':');
}

function home() {
  app.innerHTML = '<section class="hero"><div><p class="eyebrow">Hands-on exam practice</p><h1>Pash<em>Boot</em></h1><p class="lede">Join PASH on the service bench. Trace every plug, strip a desktop down to its chassis, then rebuild it and get Windows running before the next practical exam.</p><a class="cta" href="?play=1" target="_blank" rel="noopener">Play Game</a></div><div class="bench hero-photo"><img src="workbench.jpg" width="1536" height="1024" alt="Open desktop tower on an anti-static mat beside a Phillips screwdriver and a tray of screws"><span class="bench-label">DESKTOP WORKBENCH</span></div></section><section class="cards" aria-label="What you will practice"><article class="card"><span class="tag">HARDWARE</span><h3>Strip & rebuild</h3><p>Work with a full micro-ATX build. Service the processor, cooling, graphics, storage, memory, power supply, and front-panel wiring.</p></article><article class="card"><span class="tag">SOFTWARE</span><h3>Install the OS</h3><p>Boot from USB, pick the right drive, and complete Windows 11 setup.</p></article><article class="card"><span class="tag">EXAM PRACTICE</span><h3>Time your run</h3><p>Get separate times for teardown and rebuild, plus feedback when you miss a step.</p></article></section>';
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

function transition() {
  const rebuilding = stage === 'rebuild-ready';
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Hardware lab</span><h2>' + (rebuilding ? 'Teardown complete' : 'Rebuild complete') + '</h2></div>' + clocks() + '</div>' + pashMarkup() + '<div class="game-grid">' + workbench(true) + '<aside class="panel"><h3>' + (rebuilding ? 'Ready to rebuild?' : 'Ready to boot?') + '</h3><p>' + (rebuilding ? 'All parts are in the tray. Seat and secure the hardware, reconnect the cables, then slide the panel back on and tighten its screws.' : 'The case is secured. Reconnect the workstation’s peripherals one at a time, then start the Windows installer.') + '</p><div class="controls"><button class="cta" data-action="' + (rebuilding ? 'rebuild' : 'boot') + '">' + (rebuilding ? 'Start rebuild' : 'Connect external devices') + '</button></div></aside></div>';
  drawWiring();
  tick();
  app.querySelector('.cta').focus();
}

function monitor(body, theme) {
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Software lab</span><h2>Install Windows 11</h2></div>' + clocks() + '</div>' + pashMarkup() + '<section class="bench monitor-bench"><div class="monitor"><div class="screen ' + theme + '">' + body + '</div><div class="monitor-bezel"><i></i></div></div><div class="stand"></div></section>';
  tick();
  app.querySelector('.screen h3')?.focus();
}

function bootView() {
  const wired = externalConnections.map(([id, device, port]) => {
    const connected = attached.has(id);
    return '<button class="external-port" data-external="' + id + '"' + (connected ? ' disabled' : '') + '><span>' + (connected ? '✓ ' : '') + device + '<small>' + port + '</small></span><strong>' + (connected ? 'Connected' : 'Plug in') + '</strong></button>';
  }).join('');
  monitor('<p class="screen-caption">PASHBOOT · REAR CONNECTIONS</p><h3 tabindex="-1">System powered off</h3><p>Reconnect each external lead to its port and insert the installer USB.</p><div class="options external-ports">' + wired + '</div><button class="power-button" data-action="power-on"' + (attached.size === externalConnections.length ? '' : ' disabled') + '>Press the PC power button</button>', 'firmware off');
}

function softwareView() {
  const [title, prompt, options] = setup[step];
  const bootMenu = title === 'Boot device' || title === 'First restart';
  const installing = title === 'Ready to install';
  const driveList = title === 'Choose a drive';
  const theme = bootMenu ? 'firmware' : 'installer';
  const caption = bootMenu ? 'UEFI BOOT MANAGER' : 'WINDOWS 11 SETUP';
  const post = step === 0 ? '<dl class="post-log"><dt>Power-on self-test</dt><dd>PASS</dd><dt>Memory</dt><dd>16 GB DDR4 · Dual channel</dd><dt>Drives</dt><dd>3 detected + SATA DVD</dd><dt>Graphics</dt><dd>PCIe · DisplayPort</dd></dl>' : '';
  const controls = options.map((option, index) => '<button data-answer="' + index + '"><span class="option-mark" aria-hidden="true">' + (bootMenu ? '▸' : driveList ? '▰' : '○') + '</span>' + option + '</button>').join('');
  monitor('<p class="screen-caption">' + caption + '<span>' + (step + 1) + ' / ' + setup.length + '</span></p>' + post + '<h3 tabindex="-1">' + title + '</h3><p>' + prompt + '</p><div class="options">' + controls + '</div><div class="feedback' + (isError ? ' error' : '') + '" role="status">' + (message || (installing ? 'Review the installation details before you continue.' : 'Select an option to continue.')) + '</div>', theme);
}

function installFiles() {
  monitor('<p class="screen-caption">WINDOWS 11 SETUP</p><h3 tabindex="-1">Installing Windows 11</h3><p>Copying installation files. The PC will restart when setup is ready.</p><progress value="0" max="100" aria-label="Installation progress"></progress><p class="copy-status" role="status">Starting file copy…</p>', 'installer');
  const progress = app.querySelector('progress');
  const status = app.querySelector('.copy-status');
  const startedAt = performance.now();
  function update() {
    const percent = Math.min(100, Math.floor((performance.now() - startedAt) / 22));
    progress.value = percent;
    status.textContent = percent < 100 ? percent + '% complete' : 'Restarting…';
    if (percent < 100) setTimeout(update, 80);
    else setTimeout(softwareView, 450);
  }
  setTimeout(update, 80);
}

function finish() {
  stage = 'done';
  pashSay('The workstation is ready for the next class. You verified the hardware and brought it back to a working desktop. Good work.');
  app.innerHTML = pashMarkup() + '<section class="panel result"><p class="eyebrow">Practical complete</p><h2>System ready</h2><p>You reassembled the PC and brought it from an empty drive to a working Windows desktop.</p><dl><dt>Disassembly time</dt><dd>' + format(teardownTime) + '</dd><dt>Reassembly time</dt><dd>' + format(rebuildTime) + '</dd><dt>Total hardware time</dt><dd>' + format(teardownTime + rebuildTime) + '</dd><dt>Incorrect actions</dt><dd>' + mistakes + '</dd></dl><div class="controls"><a class="cta" href="?play=1">Play again</a><a class="cta" href="index.html">Home</a></div></section>';
  app.querySelector('.cta').focus();
}

function feedback(text, error = false) {
  message = text;
  isError = error;
  const box = app.querySelector('.feedback');
  box.textContent = message;
  box.classList.toggle('error', isError);
}

function mistake(text) {
  mistakes++;
  feedback(text, true);
  pashSay('Hold on. ' + text);
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {part, action, answer, group: selectedGroup, external} = button.dataset;
  if (part) return changePart(part, button.classList.contains("build-part"));
  if (selectedGroup) {
    group = selectedGroup;
    return hardwareView('[data-group="' + group + '"]');
  }
  if (action === "safety") {
    message = safetySteps[safetyIndex][1];
    safetyIndex++;
    if (safetyIndex === safetySteps.length) pashSay('Good. The cables are clear and the bench is grounded. Start the clock when you’re ready.');
    return hardwareView(".cta");
  }
  if (action === 'hint') return pashSay(hardwareHint());
  if (action === 'start' || action === 'rebuild') {
    stage = action === 'start' ? 'remove' : 'install';
    group = 'case';
    pashSay(stage === 'remove' ? 'Start with the two thumbscrews at the rear of the case.' : 'Start at the rear I/O opening. Fit the shield and board, then work outward from the socket.');
    started = performance.now();
    message = hardwareHint();
    isError = false;
    hardwareView('.drawer-tabs [aria-pressed="true"]');
  }
  if (action === 'boot') {
    stage = 'boot-prep';
    return bootView();
  }
  if (external) {
    attached.add(external);
    if (attached.size === externalConnections.length) pashSay('The monitor, controls, network, and installer are connected. Power it on and check that POST passes.');
    bootView();
    app.querySelector('.external-port:not(:disabled), .power-button:not(:disabled)')?.focus();
    return;
  }
  if (action === 'power-on' && attached.size === externalConnections.length) {
    stage = 'software';
    message = 'Select the USB entry to start the installer.';
    isError = false;
    pashSay('POST passed. We have both DIMMs and the storage devices. Open the installer from the UEFI boot menu.');
    return softwareView();
  }
  if (answer !== undefined) {
    if (Number(answer) !== setup[step][3]) return mistake(setup[step][4]);
    message = setup[step][4];
    isError = false;
    const copying = setup[step][0] === 'Ready to install';
    step++;
    if (step === setup.length) return finish();
    if (copying) {
      pashSay('Setup is copying files. After the restart, continue from the internal drive so the installer doesn’t start over.');
      return installFiles();
    }
    if (setup[step][0] === 'Choose a drive') pashSay('The backup and diagnostic drives are still connected. Check the capacity and label before picking the install target.');
    if (setup[step][0] === 'Region and layout') pashSay('The internal drive booted. Finish setup with the lab’s region, keyboard, and account settings.');
    softwareView();
  }
});

if (new URLSearchParams(location.search).has('play')) {
  hardwareView();
  setInterval(tick, 200);
} else home();
