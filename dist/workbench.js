const components = {
  board: {name: 'Motherboard', group: 'parts', tip: 'Lift the board by its edges. During installation, align the rear ports and verify the standoffs match the mounting holes.'},
  ram: {name: 'DDR4 RAM', group: 'parts', tip: 'Hold the module by the edges. Match its offset notch to the slot before pressing until the latch clicks.'},
  psu: {name: 'Power supply', group: 'parts', tip: 'Support the unit as you undo its mounting screws. Handle the power supply as a sealed unit.'},
  hdd: {name: '3.5-inch SATA HDD', group: 'parts', tip: 'Support the drive as you slide it out of the bay. Avoid shock and keep fingers clear of the exposed circuit board.'},
  panel: {name: 'Side panel', group: 'case', tip: 'Slide the steel panel off its retaining tabs. Set it flat to avoid bending the tabs.'},
  latch: {name: 'DIMM latch', group: 'parts', tip: 'This DIMM socket has one movable latch. Open it before lifting or seating RAM.'},
  atx: {name: '24-pin ATX', group: 'cables', owners: ['board', 'psu'], tip: 'Press the locking clip and grip the plug. This is the motherboard’s main power connection.'},
  eps: {name: '8-pin CPU power', group: 'cables', owners: ['board', 'psu'], tip: 'This connector powers the CPU through the header near the top of the motherboard.'},
  sata: {name: 'SATA data', group: 'cables', owners: ['board', 'hdd'], tip: 'SATA data runs from the drive to the motherboard. Match the L-shaped key when reconnecting it.'},
  power: {name: 'SATA power', group: 'cables', owners: ['psu', 'hdd'], tip: 'The wider SATA plug supplies power from the PSU. Match the L-shaped key.'},
  front: {name: 'Front-panel leads', group: 'cables', owners: ['board'], tip: 'Use the board’s header diagram for the power switch and LEDs. Observe polarity on the LED leads.'}
};

function fasteners(owner, count, name) {
  return Array.from({length: count}, (_, index) => ({
    id: owner + '-s' + (index + 1), owner, name: name + ' ' + (index + 1),
    group: owner === 'panel' ? 'case' : 'screws'
  }));
}

const screws = [
  ...fasteners('panel', 2, 'Panel screw'),
  ...fasteners('board', 6, 'Board screw'),
  ...fasteners('psu', 4, 'PSU screw'),
  ...fasteners('hdd', 4, 'Drive screw')
];
for (const screw of screws) components[screw.id] = screw;
const ids = Object.keys(components);
const installed = new Set(ids);
const internal = ids.filter(id => components[id].group !== 'case');
const cables = ids.filter(id => components[id].group === 'cables');
const majorParts = ['board', 'ram', 'psu', 'hdd'];
const safetySteps = [
  ['Shut down the PC', 'The system is off.'],
  ['Switch off the PSU and unplug AC power', 'The PC is isolated from mains power.'],
  ['Set up ESD protection', 'The ESD strap is clipped to the grounded bench point.']
];
const groupNames = {case: 'Case', parts: 'Hardware', cables: 'Connections', screws: 'Fasteners'};
let safety = 0;
let group = 'case';

function ownedScrews(id) {
  return screws.filter(screw => screw.owner === id);
}

function partStatus(id) {
  if (id === 'latch') return installed.has(id) ? 'Latched' : 'Open';
  if (components[id].group === 'cables') return installed.has(id) ? 'Connected' : 'Unplugged';
  return installed.has(id) ? 'Fitted' : 'In tray';
}

function partAction(id) {
  const present = installed.has(id);
  if (id === 'latch') return present ? 'Open' : 'Close';
  if (components[id].group === 'cables') return present ? 'Unplug' : 'Connect';
  if (components[id].owner) return present ? 'Unscrew' : 'Tighten';
  return present ? 'Remove' : 'Fit';
}

function partButton(id, preview) {
  const item = components[id];
  const content = item.owner ? '<i aria-hidden="true"></i>' : '<span>' + (id === 'ram' ? 'RAM' : item.name) + '</span>';
  const classes = 'hot ' + id + (item.owner ? ' screw' : '') + (installed.has(id) ? '' : ' empty');
  if (preview) return '<div class="' + classes + '">' + content + '</div>';
  return '<button class="' + classes + '" data-part="' + id + '" aria-label="' + partAction(id) + ' ' + item.name + '" title="' + item.name + ' · ' + partStatus(id) + '">' + content + '</button>';
}

function caseArt(preview = false) {
  const closed = installed.has('panel');
  const visibleIds = closed
    ? ['panel', ...ownedScrews('panel').map(screw => screw.id)]
    : [...majorParts, ...(installed.has('board') ? ['latch'] : []), ...cables, ...screws.filter(screw => screw.owner !== 'panel').map(screw => screw.id)];
  const wiring = closed ? '' : cables.filter(id => installed.has(id)).map(id => '<i class="routed-wire wire-' + id + '" aria-hidden="true"></i>').join('');
  return '<div class="tower' + (closed ? ' closed' : '') + '"' + (preview ? ' aria-hidden="true"' : ' role="group" aria-label="PC chassis"') + '><div class="case-metal" aria-hidden="true"></div>' + visibleIds.map(id => partButton(id, preview)).join('') + wiring + '</div>';
}

function workbench(preview = false) {
  const closed = installed.has('panel');
  return '<section class="bench hardware-bench"><div class="bench-heading"><span class="tag">WORKBENCH</span><span class="tag">' + (closed ? 'PANEL FITTED' : 'CHASSIS OPEN') + '</span></div>' + caseArt(preview) + '<div class="bench-key"><span><i></i> Phillips screw</span><span><i></i> Connector</span><span><i></i> Empty slot</span></div></section>';
}

function partsDrawer() {
  const tabs = Object.entries(groupNames).map(([id, name]) => '<button data-group="' + id + '" aria-pressed="' + (group === id) + '">' + name + '</button>').join('');
  const idsInGroup = ids.filter(id => components[id].group === group);
  const rows = idsInGroup.map(id => '<button class="part" data-part="' + id + '"><span>' + components[id].name + '<small>' + partStatus(id) + '</small></span><strong>' + partAction(id) + '</strong></button>').join('');
  return '<div class="drawer-tabs" aria-label="Service controls">' + tabs + '</div><div class="service-list" data-group="' + group + '">' + rows + '</div>';
}

function hardwareView(focusSelector) {
  const rebuilding = stage === 'install';
  const ready = stage === 'ready';
  const completed = rebuilding ? installed.size : ids.length - installed.size;
  const feedbackText = message || 'Follow the bench safety checks before opening the case.';
  const servicePanel = ready
    ? '<p>Prepare the PC and work area before starting the timed teardown.</p><ol class="safety-list">' + safetySteps.map(([label], index) => '<li><span class="check">' + (index < safety ? '✓' : index + 1) + '</span>' + label + '</li>').join('') + '</ol>'
    : '<p><strong>' + completed + ' / ' + ids.length + '</strong> actions complete</p><progress class="progress" value="' + completed + '" max="' + ids.length + '" aria-label="Hardware progress"></progress>' + partsDrawer();
  const controls = ready
    ? safety < safetySteps.length
      ? '<button class="cta" data-action="safety">' + safetySteps[safety][0] + '</button>'
      : '<button class="cta" data-action="start">Start teardown</button>'
    : '<button data-action="hint">Show hint</button>';
  const previousDrawer = app.querySelector('.service-list');
  const scrollTop = previousDrawer?.dataset.group === group ? previousDrawer.scrollTop : 0;
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Hardware lab</span><h2>' + (rebuilding ? 'Reassemble the PC' : 'Disassemble the PC') + '</h2></div>' + clocks() + '</div><div class="game-grid">' + workbench(ready) + '<aside class="panel service-panel"><h3>' + (ready ? 'Bench preparation' : 'Service controls') + '</h3>' + servicePanel + '<div class="feedback' + (isError ? ' error' : '') + '" role="status">' + feedbackText + '</div><div class="controls">' + controls + '</div></aside></div>';
  tick();
  const drawer = app.querySelector('.service-list');
  if (drawer) drawer.scrollTop = scrollTop;
  if (focusSelector) {
    const target = app.querySelector(focusSelector) ?? app.querySelector('.drawer-tabs [aria-pressed="true"]');
    target?.focus({preventScroll: true});
  }
}

function blockers(id, removing) {
  const item = components[id];
  if (item.group !== 'case' && installed.has('panel')) return 'Remove the side panel to reach the internal hardware.';
  if (item.owner) {
    if (!removing && !installed.has(item.owner)) return 'Fit the ' + components[item.owner].name.toLowerCase() + ' before tightening its screws.';
    return '';
  }
  if (removing) {
    if (ownedScrews(id).some(screw => installed.has(screw.id))) return 'Remove all ' + item.name.toLowerCase() + ' mounting screws first.';
    if (id === 'latch' && !installed.has('board')) return 'The DIMM latch is part of the motherboard. Fit the board to reach it.';
    if (id === 'ram' && installed.has('latch')) return 'Open the DIMM latch before lifting the RAM.';
    if (id === 'board' && installed.has('ram')) return 'Remove the RAM before lifting the motherboard for this lab.';
    if (cables.some(cable => components[cable].owners.includes(id) && installed.has(cable))) return 'Disconnect the cables attached to the ' + item.name.toLowerCase() + ' first.';
  } else {
    if (id === 'panel' && internal.some(part => !installed.has(part))) return 'Finish securing the components and connecting the cables before fitting the side panel.';
    if (id === 'latch' && !installed.has('ram')) return 'The DIMM latch locks when the RAM is seated.';
    if (id === 'ram' && !secured('board')) return 'Fit the motherboard and tighten its mounting screws before pressing in the RAM.';
    if (item.owners?.some(owner => !secured(owner))) return 'Fit and secure both ends of this connection before plugging it in.';
  }
  return '';
}

function secured(id) {
  return installed.has(id) && ownedScrews(id).every(screw => installed.has(screw.id));
}

function hardwareHint() {
  const removing = stage === 'remove';
  const removeOrder = [...ownedScrews('panel').map(screw => screw.id), 'panel', ...cables, 'latch', 'ram', ...screws.filter(screw => screw.owner !== 'panel').map(screw => screw.id), ...majorParts];
  const installOrder = ['board', ...ownedScrews('board').map(screw => screw.id), 'ram', 'psu', ...ownedScrews('psu').map(screw => screw.id), 'hdd', ...ownedScrews('hdd').map(screw => screw.id), ...cables, 'panel', ...ownedScrews('panel').map(screw => screw.id)];
  const next = (removing ? removeOrder : installOrder).find(id => installed.has(id) === removing && !blockers(id, removing));
  if (!next) return 'Check the parts and fasteners on the bench.';
  return partAction(next) + ' ' + components[next].name + ' using the ' + groupNames[components[next].group] + ' controls or the chassis.';
}

function changePart(id, onCase) {
  const removing = stage === 'remove';
  if (!removing && stage !== 'install') return;
  const item = components[id];
  if (installed.has(id) !== removing) return feedback(item.name + ' · ' + partStatus(id) + '.');
  const error = blockers(id, removing);
  if (error) return mistake(error);
  const action = partAction(id);

  if (removing) installed.delete(id);
  else {
    installed.add(id);
    if (id === 'ram') installed.add('latch');
  }
  if (removing ? installed.size === 0 : installed.size === ids.length) {
    const elapsed = performance.now() - started;
    if (removing) teardownTime = elapsed;
    else rebuildTime = elapsed;
    stage = removing ? 'rebuild-ready' : 'post';
    return transition();
  }
  message = id === 'ram' && !removing
    ? 'RAM seated. The DIMM latch clicked into place.'
    : action + ' ' + item.name + ' complete. ' + (item.tip ?? 'Keep separate screw types in the tray.');
  isError = false;
  if (id === 'panel') group = removing ? 'cables' : 'case';
  const selector = onCase ? '.tower [data-part="' + id + '"]' : '.service-list [data-part="' + id + '"]';
  hardwareView(selector);
}

