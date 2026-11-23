const items = Object.values(gear);
const fitted = new Set(items.map(item => item.id));
const internal = items.filter(item => item.id !== 'panel' && item.owner !== 'panel');
const groups = {case: 'Chassis', parts: 'Components', cables: 'Cables', screws: 'Fasteners'};
let safetyIndex = 0;
let group = 'case';

function isFastener(item) {
  return item.kind === 'screw' || item.kind === 'captive';
}

function mountsFor(id) {
  return items.filter(item => isFastener(item) && item.owner === id);
}

function isSecured(id) {
  return fitted.has(id) && mountsFor(id).every(item => fitted.has(item.id));
}

function itemVerb(item) {
  const present = fitted.has(item.id);
  switch (item.kind) {
    case 'latch': return present ? 'Release' : 'Lock';
    case 'paste': return present ? 'Clean' : 'Apply';
    case 'plug': return present ? 'Unplug' : 'Connect';
    case 'captive': return present ? 'Loosen' : 'Tighten';
    case 'screw': return present ? 'Unscrew' : 'Tighten';
    default: return present ? 'Remove' : 'Fit';
  }
}

function itemStatus(item) {
  const present = fitted.has(item.id);
  switch (item.kind) {
    case 'latch': return present ? 'Locked' : 'Open';
    case 'paste': return present ? 'Applied' : 'Clean surface';
    case 'plug': return present ? 'Connected' : 'Disconnected';
    case 'captive': return present ? 'Tight' : 'Loose';
    default: return present ? 'Fitted' : 'In tray';
  }
}

function accessProblem(item) {
  if (fitted.has('panel') && item.id !== 'panel' && item.owner !== 'panel') return 'Slide the side panel off first.';
  if (item.coveredBy && fitted.has(item.coveredBy)) return 'Lift off the CPU cooler first to reach this area.';
  return '';
}

function blocked(item, removing) {
  const access = accessProblem(item);
  if (access) return access;
  if (item.kind === 'plug') {
    if (!fitted.has(item.owner)) return 'Fit the ' + gear[item.owner].name + ' to reach this port.';
    if (!removing && !isSecured(item.owner)) return 'Secure the ' + gear[item.owner].name + ' before reconnecting this plug.';
    if (!removing && item.source && !isSecured(item.source)) return 'Fit and secure the ' + gear[item.source].name + ' first.';
    return '';
  }
  if (isFastener(item)) {
    if (!fitted.has(item.owner)) return 'Fit the ' + gear[item.owner].name + ' before turning its screws.';
    return '';
  }
  if (item.under && !fitted.has(item.under)) return 'Fit the ' + gear[item.under].name + ' to reach this position.';
  if (item.kind === 'latch') {
    if (!removing && !fitted.has(item.holds)) return 'Seat the ' + gear[item.holds].name + ' before locking its retainer.';
    return '';
  }
  if (removing) {
    if (mountsFor(item.id).some(mount => fitted.has(mount.id))) return 'Loosen or remove every fastener holding the ' + item.name + ' first.';
    if (items.some(part => part.kind === 'plug' && (part.owner === item.id || part.source === item.id) && fitted.has(part.id))) return 'Unplug the remaining cables attached to the ' + item.name + ' first.';
    if (item.latch && fitted.has(item.latch)) return 'Release the ' + gear[item.latch].name + ' first.';
    const child = items.find(part => part.under === item.id && fitted.has(part.id));
    if (child?.kind === 'paste') return 'Clean the thermal compound on the processor before lifting it.';
    if (child) return itemVerb(child) + ' the ' + child.name + ' before lifting the ' + item.name + '.';
  } else {
    if (item.id === 'panel' && internal.some(part => !fitted.has(part.id))) return 'Finish securing the internal parts and reconnecting their cables before closing the case.';
    if (item.under && !isSecured(item.under)) return 'Secure the ' + gear[item.under].name + ' first.';
    if (item.kind === 'paste' && !fitted.has('cpuLock')) return 'Lock the CPU load plate before applying thermal compound.';
    if (item.latch && fitted.has(item.latch)) return 'Open the ' + gear[item.latch].name + ' before seating this component.';
    const missing = item.requires?.find(id => !fitted.has(id));
    if (missing) return missing === 'paste' ? 'Apply fresh thermal compound before mounting the cooler.' : 'Lock the CPU load plate before mounting the cooler.';
  }
  return '';
}

const tearOrder = ['panel-s1', 'panel-s2', 'panel', ...items.filter(item => item.kind === 'plug').map(item => item.id), 'cooler-s1', 'cooler-s3', 'cooler-s2', 'cooler-s4', 'cooler', 'paste', 'cpuLock', 'cpu', 'ramLockA', 'ramA', 'ramLockB', 'ramB', 'gpuLock', 'gpu-s1', 'gpu-s2', 'gpu', ...items.map(item => item.id)];
const buildOrder = ['shield', 'board', ...mountsFor('board').map(item => item.id), 'cpu', 'cpuLock', 'paste', 'cooler', 'cooler-s1', 'cooler-s3', 'cooler-s2', 'cooler-s4', 'ramA', 'ramB', 'nvme', 'nvme-s1', 'battery', 'gpu', 'gpu-s1', 'gpu-s2', ...items.map(item => item.id)];

function hardwareHint() {
  const removing = stage === 'remove';
  const order = removing ? tearOrder : buildOrder;
  const next = order.map(id => gear[id]).find(item => fitted.has(item.id) === removing && !blocked(item, removing));
  return next ? itemVerb(next) + ' ' + next.name + (next.port ? ' at ' + next.port : ' under ' + groups[next.group]) + '.' : 'Check the remaining pieces on the workbench.';
}

const markings = {
  board: ['MICRO ATX', 'LGA 1700  /  DDR4'],
  cpu: ['LGA1700', '▲ PIN 1'],
  cooler: ['PWM', 'CPU COOLER'],
  gpu: ['PCI EXPRESS', 'GRAPHICS'],
  psu: ['550 W', 'ATX 12 V'],
  hdd: ['500 GB', 'SATA HDD'],
  ssd: ['1 TB', 'SATA SSD'],
  optical: ['DVD-RW', 'SATA'],
  nvme: ['M.2 2280', 'NVMe']
};

function artMarkup(item) {
  if (isFastener(item)) return '<i class="fastener-head" aria-hidden="true"></i>';
  if (item.kind === 'plug') return '<i class="port-pins" aria-hidden="true"></i>';
  if (item.kind === 'latch') return '<i class="retainer" aria-hidden="true"></i>';
  if (item.kind === 'paste') return '<span aria-hidden="true">PASTE</span>';
  const stamp = markings[item.id];
  const label = stamp ? '<span class="stamped">' + stamp[0] + '<small>' + stamp[1] + '</small></span>' : '';
  if (item.id === 'board') return '<i class="rear-io-bank"></i><i class="socket-footprint"></i><i class="dimm-bank"></i><i class="vrm"></i><i class="chipset"></i><i class="pcie-bank"></i><i class="capacitors"></i>' + label;
  if (item.id === 'gpu') return '<i class="rotor"></i><i class="rotor"></i>' + label;
  if (['cooler', 'rearFan', 'frontFan', 'psu'].includes(item.id)) return '<i class="rotor"></i>' + label;
  if (item.id === 'hdd') return '<i class="drive-cover"></i>' + label;
  if (item.id === 'ssd' || item.id === 'optical') return label;
  if (item.id === 'panel') return '<i class="panel-vent"></i><span class="stamped">STEEL SIDE PANEL</span>';
  return label;
}

function partArt(item, preview) {
  const {id, box} = item;
  const [x, y, width, height] = box;
  const description = item.name + (item.port ? ' · ' + item.port : '') + ' · ' + itemStatus(item);
  const className = 'build-part part-' + id + ' kind-' + (item.kind || 'component') + (fitted.has(id) ? '' : ' vacant');
  const position = ' style="--x:' + x + '%;--y:' + y + '%;--w:' + width + '%;--h:' + height + '%"';
  const art = artMarkup(item);
  if (preview) return '<div class="' + className + '"' + position + '>' + art + '</div>';
  return '<button type="button" class="' + className + '" data-part="' + id + '"' + position + ' aria-label="' + itemVerb(item) + ' ' + item.name + '" title="' + description + '">' + art + '</button>';
}

function isVisible(item) {
  if (!item.box) return false;
  if (fitted.has('panel')) return item.id === 'panel' || item.owner === 'panel';
  if (item.id === 'panel' || item.owner === 'panel') return false;
  if (item.coveredBy && fitted.has(item.coveredBy)) return false;
  // Expose the socket until the cooler can be fitted again.
  if (item.id === 'cooler' && !fitted.has('cooler')) {
    return stage === 'install' && !blocked(item, false);
  }
  if (item.kind === 'paste') {
    return fitted.has('cpu') && (stage === 'remove' ? fitted.has(item.id) : stage === 'install' && !fitted.has(item.id) && !blocked(item, false));
  }
  if (item.under && !fitted.has(item.under)) return false;
  return !item.owner || fitted.has(item.owner);
}

function drawWiring() {
  const canvas = app.querySelector('.wire-layer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  for (const run of wiring) {
    const first = run.endpoints[0];
    const last = run.endpoints.at(-1);
    const fromFitted = fitted.has(first);
    const toFitted = fitted.has(last);
    if (!fromFitted && !toFitted) continue;
    const points = run.path.map(([x, y]) => [x * 10, y * 7]);
    if (!fromFitted) points[0] = [points[0][0] + 33, points[0][1] - 14];
    if (!toFitted) points[points.length - 1] = [points.at(-1)[0] - 28, points.at(-1)[1] + 14];
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let index = 1; index < points.length - 1; index++) {
      const [x, y] = points[index];
      const [nextX, nextY] = points[index + 1];
      ctx.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
    }
    ctx.lineTo(...points.at(-1));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#111917';
    ctx.stroke();
    ctx.lineWidth = run.endpoints.length > 1 ? 3.7 : 3.2;
    ctx.strokeStyle = run.color;
    ctx.stroke();
  }
}

function workbench(preview = false) {
  const closed = fitted.has('panel');
  return '<section class="bench hardware-bench"><div class="bench-heading"><span class="tag">SERVICE BENCH</span><span class="tag">' + (closed ? 'PANEL FITTED' : 'CHASSIS OPEN · REAR LEFT / FRONT RIGHT') + '</span></div><div class="tower precision-case' + (closed ? ' closed' : '') + '" role="group" aria-label="Side view of the PC chassis"><i class="case-bed" aria-hidden="true"></i><i class="drive-rack" aria-hidden="true"></i><i class="standoff-field" aria-hidden="true"></i>' + (closed ? '' : '<canvas class="wire-layer" width="1000" height="700" aria-hidden="true"></canvas>') + items.filter(isVisible).map(item => partArt(item, preview)).join('') + '</div><div class="bench-key"><span><i></i> Fastener</span><span><i></i> Cable plug</span><span><i></i> Empty mount</span></div></section>';
}

function controlsPanel() {
  const tabs = Object.entries(groups).map(([id, name]) => '<button data-group="' + id + '" aria-pressed="' + (group === id) + '">' + name + '</button>').join('');
  const rows = items.filter(item => item.group === group).map(item => '<button class="part service-row" data-part="' + item.id + '"><span>' + item.name + '<small>' + (item.port ? item.port + ' · ' : '') + itemStatus(item) + '</small></span><strong>' + itemVerb(item) + '</strong></button>').join('');
  return '<div class="drawer-tabs" aria-label="Service controls">' + tabs + '</div><div class="service-list" data-group="' + group + '">' + rows + '</div>';
}

function hardwareView(focusSelector) {
  const ready = stage === 'ready';
  const completed = stage === 'install' ? fitted.size : items.length - fitted.size;
  const oldDrawer = app.querySelector('.service-list');
  const scroll = oldDrawer?.dataset.group === group ? oldDrawer.scrollTop : 0;
  const prompt = ready
    ? '<p>Isolate the workstation before the teardown timer starts.</p><ol class="safety-list">' + safetySteps.map(([label], index) => '<li' + (index === safetyIndex ? ' class="current-check"' : '') + '><span class="check">' + (index < safetyIndex ? '✓' : index + 1) + '</span>' + label + '</li>').join('') + '</ol>'
    : '<p><strong>' + completed + ' / ' + items.length + '</strong> service actions complete</p><progress class="progress" value="' + completed + '" max="' + items.length + '" aria-label="Hardware progress"></progress>' + controlsPanel();
  const nextButton = safetyIndex < safetySteps.length ? '<button class="cta" data-action="safety">' + safetySteps[safetyIndex][0] + '</button>' : '<button class="cta" data-action="start">Start teardown</button>';
  app.innerHTML = '<div class="worktop"><div><span class="eyebrow">Hardware lab</span><h2>' + (stage === 'install' ? 'Reassemble the PC' : 'Disassemble the PC') + '</h2></div>' + clocks() + '</div><div class="game-grid">' + workbench(ready) + '<aside class="panel service-panel"><h3>' + (ready ? 'Bench preparation' : 'Service controls') + '</h3>' + prompt + '<div class="feedback' + (isError ? ' error' : '') + '" role="status">' + (message || 'Follow the bench safety checks before opening the case.') + '</div><div class="controls">' + (ready ? nextButton : '<button data-action="hint">Ask PASH for a hint</button>') + '</div></aside></div>';
  drawWiring();
  tick();
  const drawer = app.querySelector('.service-list');
  if (drawer) drawer.scrollTop = scroll;
  if (focusSelector) (app.querySelector(focusSelector) ?? app.querySelector('.drawer-tabs [aria-pressed="true"]'))?.focus({preventScroll: true});
}

function changePart(id, onCase) {
  const removing = stage === 'remove';
  if (!removing && stage !== 'install') return;
  const item = gear[id];
  if (fitted.has(id) !== removing) return feedback(item.name + ' · ' + itemStatus(item) + '.');
  const error = blocked(item, removing);
  if (error) return mistake(error);
  if (removing) fitted.delete(id);
  else {
    fitted.add(id);
    if (item.closesLatch) fitted.add(item.latch);
  }

  if (removing ? fitted.size === 0 : fitted.size === items.length) {
    const elapsed = performance.now() - started;
    if (removing) teardownTime = elapsed;
    else rebuildTime = elapsed;
    stage = removing ? 'rebuild-ready' : 'post';
    pashSay(removing ? 'Everything’s off the chassis. Check your tray and lay the parts out in the order you’ll reinstall them.' : 'The workstation is back together. Let’s connect the peripherals and see what the firmware detects.');
    return transition();
  }

  if (id === 'panel') {
    group = removing ? 'cables' : 'case';
    pashSay(removing ? 'Case is open. Trace each cable to its port and unplug it before lifting the part it serves.' : 'The panel is back on its rails. Finish with the two thumbscrews.');
  }
  if (id === 'cooler' && removing) {
    group = 'parts';
    pashSay('There’s the processor. Clean the old thermal compound while it’s still secured, then release the socket lever.');
  }
  if (removing && item.kind === 'plug' && !items.some(part => part.kind === 'plug' && fitted.has(part.id))) pashSay('All internal plugs are clear. Watch the socket latches and keep each set of screws with its part.');

  message = item.name + ' · ' + itemStatus(item) + '.' + (item.tip ? ' ' + item.tip : '');
  if (!removing && item.closesLatch) message += ' Its retention clip clicked into place.';
  isError = false;
  const scope = onCase ? '.precision-case' : '.service-list';
  const next = id === 'cooler' && removing ? 'paste' : id;
  hardwareView(scope + ' [data-part="' + next + '"]');
}
