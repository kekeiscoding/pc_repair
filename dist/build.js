const gear = {};

function part(id, name, group, box, details = {}) {
  gear[id] = {id, name, group, box, ...details};
}

part('panel', 'Steel side panel', 'case', [4, 3, 93, 94], {tip: 'Slide it toward the rear to free the retaining tabs.'});
part('shield', 'Rear I/O shield', 'case', [18.5, 10, 3, 36], {tip: 'Snap the shield in before fitting the board. Check that none of its spring tabs block a port.'});
part('board', 'Micro-ATX motherboard', 'parts', [21, 8, 53, 65], {tip: 'Check standoff positions, then align the rear I/O before fastening.', under: 'shield'});
part('cpu', 'LGA1700 processor', 'parts', [32, 24, 14, 18], {under: 'board', latch: 'cpuLock', coveredBy: 'cooler', tip: 'Hold the edges, align the pin-1 triangle and keying notches, and lower the CPU into the socket.'});
part('cpuLock', 'CPU load plate and lever', 'parts', [46, 24, 2, 19], {kind: 'latch', under: 'board', holds: 'cpu', coveredBy: 'cooler'});
part('paste', 'Thermal compound', 'parts', [33, 34, 9, 5], {kind: 'paste', under: 'cpu', coveredBy: 'cooler', tip: 'Clean away old compound before reusing the cooler. Follow the cooler’s paste instructions when reinstalling.'});
part('cooler', 'CPU heatsink and fan', 'parts', [28, 18, 23, 30], {under: 'cpu', requires: ['cpuLock', 'paste'], tip: 'Loosen the four captive screws gradually in a diagonal pattern. Lift the heatsink without pulling the fan lead.'});
part('ramA', 'DDR4 DIMM A2', 'parts', [54, 16, 4, 32], {under: 'board', latch: 'ramLockA', closesLatch: true, tip: 'Align the keyed notch. Press evenly until the latch clicks.'});
part('ramB', 'DDR4 DIMM B2', 'parts', [62, 16, 4, 32], {under: 'board', latch: 'ramLockB', closesLatch: true, tip: 'Use A2 and B2 for the two modules on this lab board.'});
part('ramLockA', 'DIMM A2 latch', 'parts', [54, 48, 4, 3], {kind: 'latch', under: 'board', holds: 'ramA'});
part('ramLockB', 'DIMM B2 latch', 'parts', [62, 48, 4, 3], {kind: 'latch', under: 'board', holds: 'ramB'});
part('gpu', 'PCIe graphics card', 'parts', [17, 56, 51, 13], {under: 'board', latch: 'gpuLock', closesLatch: true, tip: 'Support the card while removing the bracket screws. Release the PCIe retention clip before lifting.'});
part('gpuLock', 'PCIe x16 retention clip', 'parts', [68, 60, 3, 4], {kind: 'latch', under: 'board', holds: 'gpu'});
part('nvme', 'M.2 NVMe SSD', 'parts', [32, 50, 19, 5], {under: 'board', tip: 'Slide the M.2 drive into the socket at a shallow angle, then lower it onto the standoff.'});
part('battery', 'CR2032 CMOS battery', 'parts', [25, 46, 5, 7], {under: 'board', tip: 'The coin-cell battery retains the clock. Observe the holder’s polarity marking.'});
part('psu', 'ATX power supply', 'parts', [10, 77, 41, 19], {tip: 'Support its weight before removing the rear screws. The PSU enclosure stays sealed.'});
part('hdd', '3.5-inch SATA HDD', 'parts', [81, 51, 17, 16], {tip: 'Support the drive as you slide it out. Grip plugs by their housings.'});
part('ssd', '2.5-inch SATA SSD', 'parts', [81, 71, 16, 10], {tip: 'Slide it out of the adapter tray after disconnecting power and data.'});
part('optical', 'SATA DVD drive', 'parts', [81, 32, 17, 11], {tip: 'Guide the optical drive straight out of the 5.25-inch bay.'});
part('rearFan', 'Rear exhaust fan', 'parts', [3, 11, 14, 20], {tip: 'Match the airflow arrow to the rear exhaust direction.'});
part('frontFan', 'Front intake fan', 'parts', [82, 5, 15, 22], {tip: 'Orient the fan to draw air through the front filter.'});

function mounts(owner, positions, prefix, kind = 'screw') {
  positions.forEach(([x, y], index) => {
    const number = index + 1;
    part(owner + '-s' + number, prefix + ' ' + number, owner === 'panel' ? 'case' : 'screws', [x, y, 2.7, 3.7], {
      kind, owner, tip: kind === 'captive' ? 'This screw stays attached to the heatsink.' : ''
    });
  });
}

mounts('panel', [[3, 6], [3, 91]], 'Panel thumbscrew');
mounts('board', [[22, 8], [69, 8], [22, 39], [71, 40], [22, 69], [69, 69]], 'Motherboard screw');
mounts('cooler', [[27, 15], [49, 15], [27, 43], [49, 43]], 'Cooler screw', 'captive');
mounts('gpu', [[15, 56], [15, 63]], 'GPU bracket screw');
mounts('nvme', [[31, 50]], 'M.2 retaining screw');
mounts('psu', [[8, 77], [8, 92], [46, 77], [46, 92]], 'PSU mounting screw');
mounts('hdd', [[80, 51], [96, 51], [80, 63], [96, 63]], 'HDD tray screw');
mounts('ssd', [[80, 70], [96, 70], [80, 78], [96, 78]], 'SSD tray screw');
mounts('optical', [[80, 31], [96, 31], [80, 40], [96, 40]], 'DVD bay screw');
mounts('rearFan', [[2, 10], [15, 10], [2, 28], [15, 28]], 'Rear fan screw');
mounts('frontFan', [[81, 4], [96, 4], [81, 24], [96, 24]], 'Front fan screw');

const wiring = [];

function plug(id, name, port, owner, box, details = {}) {
  part(id, name, 'cables', box, {kind: 'plug', port, owner, ...details});
}

function lead(id, name, port, owner, box, source, origin, bends, tip, color = '#a59674') {
  plug(id, name, port, owner, box, {source, tip});
  wiring.push({endpoints: [id], path: [origin, ...bends, [box[0] + box[2] / 2, box[1] + box[3] / 2]], color});
}

lead('eps', '8-pin EPS CPU power', 'Motherboard · ATX_12V', 'board', [25, 7, 5, 4], 'psu', [25, 86], [[17, 75], [18, 4]], 'Release the EPS clip. This CPU power plug is separate from PCIe graphics power.');
lead('atx', '24-pin ATX power', 'Motherboard · ATX_PWR', 'board', [72, 23, 4, 10], 'psu', [47, 88], [[70, 86], [78, 30]], 'Press the locking tab and ease the plug out by its housing.', '#b7a590');
lead('gpuPower', '8-pin PCIe graphics power', 'Graphics card · PCIe_PWR', 'gpu', [63, 55, 4, 4], 'psu', [46, 83], [[55, 80], [69, 62]], 'Use the PCIe 6+2 cable for this card.', '#b99967');
lead('cpuFanWire', 'CPU fan lead', 'Motherboard · CPU_FAN', 'board', [45, 11, 4, 3], 'cooler', [44, 22], [[49, 17]], 'Connect the cooler fan to CPU_FAN so firmware can read fan speed.', '#718e83');
lead('rearFanWire', 'Rear fan lead', 'Motherboard · CHA_FAN1', 'board', [20, 31, 3.5, 3], 'rearFan', [13, 25], [[16, 32]], 'Match the guide on the fan plug to the header.', '#819e8e');
lead('frontFanWire', 'Front fan lead', 'Motherboard · CHA_FAN2', 'board', [72, 14, 4, 3.5], 'frontFan', [85, 12], [[78, 15]], 'Reconnect the front intake fan to its chassis-fan header.', '#719881');

function sataDrive(id, label, boardIndex, boardY, driveY, powerY) {
  const boardBox = [72, boardY, 4, 3.3];
  const driveBox = [77, driveY, 4, 3.3];
  const boardPlug = id + 'DataBoard';
  const drivePlug = id + 'DataDrive';
  plug(boardPlug, label + ' SATA data · board end', 'Motherboard · SATA_' + boardIndex, 'board', boardBox, {tip: 'Release the retaining clip if present. Match the L-shaped key when reconnecting.'});
  plug(drivePlug, label + ' SATA data · drive end', label + ' · SATA data port', id, driveBox, {tip: 'The narrower keyed SATA connector carries data.'});
  wiring.push({endpoints: [boardPlug, drivePlug], path: [[74, boardY + 1.6], [77, (boardY + driveY) / 2], [79, driveY + 1.6]], color: '#ad655a'});
  lead(id + 'Power', label + ' SATA power', label + ' · SATA power port', id, [77, powerY, 4.5, 3.4], 'psu', [49, 91], [[74, 89], [77, powerY + 8]], 'Fit the wide SATA power plug to its keyed socket.', '#867a66');
}

sataDrive('hdd', 'HDD', 1, 43, 54, 59);
sataDrive('ssd', 'SSD', 2, 48, 71, 76);
sataDrive('optical', 'DVD', 3, 53, 33, 38);

const frontConnections = [
  ['audio', 'HD Audio', 'AAFP', 23, '#799f88', 'The keyed plug goes to the front-panel audio header.'],
  ['usb2', 'Front USB 2.0', 'USB_12', 32, '#72918e', 'Align the blocked pin to the missing header pin.'],
  ['usb3', 'Front USB 3.x', 'USB3_12', 41, '#6a99af', 'Grip the connector body and pull straight to protect the header.'],
  ['swPower', 'Power switch', 'F_PANEL · PWR_SW', 51, '#a4bca1', 'A momentary power switch has no polarity.'],
  ['swReset', 'Reset switch', 'F_PANEL · RESET_SW', 56, '#aaa9aa', 'Check the board’s pin map before reconnecting.'],
  ['ledPower', 'Power LED', 'F_PANEL · PLED', 61, '#b4a86d', 'Match the positive and negative pins for the LED.'],
  ['ledDrive', 'Drive activity LED', 'F_PANEL · HDD_LED', 66, '#b28677', 'Match the positive and negative pins for the activity LED.']
];

frontConnections.forEach(([id, name, port, x, color, tip], index) => {
  lead(id, name, 'Motherboard · ' + port, 'board', [x, 72, 3.8, 3.1], null, [98, 15 + index * 1.2], [[98, 89 + index * .55], [x + index * .7, 78 + index * .7]], tip, color);
});

const safetySteps = [
  ['Shut down the PC', 'Lab procedure: confirm the system has shut down before opening the case.'],
  ['Switch off the PSU', 'The power supply switch is set to O.'],
  ['Unplug the AC power cord', 'The PC is isolated from mains power.'],
  ['Unplug the display cable', 'DisplayPort is disconnected from the graphics card.'],
  ['Unplug the keyboard', 'The keyboard is disconnected from its rear USB port.'],
  ['Unplug the mouse', 'The mouse is disconnected from its rear USB port.'],
  ['Unplug Ethernet', 'The Ethernet cable is disconnected from the rear LAN port.'],
  ['Set up ESD protection', 'The wrist strap is clipped to the grounded bench point.']
];

const externalConnections = [
  ['display', 'DisplayPort monitor', 'Graphics card · DisplayPort'],
  ['keyboard', 'USB keyboard', 'Motherboard rear I/O · USB'],
  ['mouse', 'USB mouse', 'Motherboard rear I/O · USB'],
  ['network', 'Ethernet', 'Motherboard rear I/O · LAN'],
  ['ac', 'AC cord and PSU switch', 'Power supply · IEC inlet'],
  ['usb', 'Windows installer USB', 'Motherboard rear I/O · USB']
];

