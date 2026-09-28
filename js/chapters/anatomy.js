// Chapter 1: a generic smartphone pulled apart into its layers, with X-ray, a radio-path highlight
// that lights the antennas and the chips that drive them, and click-to-name parts.
import { THREE, M, exploder, canvasTexture, torus } from '../kit.js';
import { makePhone, paintHome, TAU } from '../mobile.js';

const INFO = {
  glass: ['Cover glass', 'Toughened glass about half a millimetre thick. It protects the screen but lets your finger\'s electric field through.'],
  touch: ['Touch layer', 'A see-through grid of electrodes. Your finger changes the charge where rows and columns cross, and the phone works out where you touched.'],
  oled: ['OLED screen', 'Millions of red, green and blue dots that make their own light. Black pixels are simply switched off (see TVClear).'],
  soc: ['System on a chip', 'The phone\'s brain: processor cores, graphics, an image processor and an AI engine on one chip.'],
  modem: ['Modem', 'Turns bits into radio patterns and back, and follows the rules of 4G and 5G. It is often built into the main chip.'],
  rf: ['RF front-end', 'Filters, switches and amplifiers that sit between the modem and the antennas, one path for each band.'],
  pa: ['Power amplifier', 'Boosts the outgoing signal to as much as 0.2 W. It works hardest when the tower is far away.'],
  mem: ['Memory', 'RAM for the apps you have open, and flash storage for photos and files.'],
  pmic: ['Power chip', 'Manages charging and hands out just the right voltages to every other part.'],
  battery: ['Battery', 'A lithium-ion cell, about 3.85 V and 4,000 to 5,000 mAh: roughly 15 to 20 watt-hours (see CurrentClear).'],
  coil: ['Wireless charging coil', 'A flat copper coil. A changing magnetic field from the charger induces a current in it (see MagnetismClear).'],
  cams: ['Rear cameras', 'Wide, ultra-wide and zoom lenses, each with its own tiny sensor (see CameraClear).'],
  front: ['Front camera', 'A small selfie camera behind a hole in the screen.'],
  spk: ['Loudspeaker', 'A tiny coil and magnet push a thin cone to make sound.'],
  ear: ['Earpiece', 'The speaker you hold to your ear on a call.'],
  vib: ['Vibration motor', 'A weight on a spring, shaken back and forth by a coil: the buzz you feel.'],
  sim: ['SIM tray', 'Holds the SIM, a tiny smart card with your number\'s secret key. Many phones now also have an eSIM chip soldered inside.'],
  usb: ['USB-C port', 'For charging and data.'],
  mic: ['Microphone', 'Picks up your voice. Phones have two or three so they can cancel background noise.'],
  ant: ['Antenna', 'Parts of the metal frame, cut apart by thin plastic breaks, act as antennas. Phones have several, for different bands and so a hand can\'t block them all.'],
  back: ['Back glass', 'Glass lets radio waves and wireless charging through, which metal would block.'],
  frame: ['Frame', 'The metal band around the phone, stiff and strong, and part of it doubles as the antennas.'],
};

export default {
  id: 'anatomy',
  short: 'Inside a phone',
  title: 'Inside a smartphone',
  subtitle: 'A radio, a computer, a camera and a battery, squeezed into a slab less than a centimetre thick.',
  view: { pos: [6.9, 5.4, 8.9], target: [0.1, 2.3, 0] },
  learn: `<p>A mobile phone is really a <b>two-way radio</b> joined to a small <b>computer</b>. Take one apart and you find it built in layers.</p>
    <p>On top is the <b>cover glass</b>, then a see-through <b>touch layer</b> that feels your finger, then the <b>OLED screen</b>. Underneath, most of the space is the flat <b>battery</b>. Beside it sits the <b>mainboard</b>, packed with chips: the <b>system on a chip</b> that runs your apps, the <b>modem</b> that speaks 4G and 5G, and the <b>RF front-end</b> with its <b>power amplifier</b> that drives the antennas.</p>
    <p>Where are the <b>antennas</b>? Mostly hidden in the metal <b>frame</b>. Those thin plastic lines on the sides cut the frame into pieces, and each piece is tuned to catch certain radio bands. There are several, top and bottom, so your hand can't block them all at once.</p>
    <p>Add the <b>cameras</b> (see CameraClear), speakers, microphones, a <b>vibration motor</b> and the <b>SIM tray</b>, and that's the whole phone.</p>
    <p class="tip"><b>Try it:</b> pull the phone apart, switch on "Follow the radio", then click any part to find out what it does.</p>`,
  terms: [
    { t: 'System on a chip (SoC)', d: 'One chip holding the processor, graphics, camera processor and more.' },
    { t: 'Modem', d: 'The part that turns data into radio signals and back, following the 4G or 5G rules.' },
    { t: 'RF front-end', d: 'The filters, switches and amplifiers between the modem and the antennas.' },
    { t: 'Antenna', d: 'A conductor shaped to send and catch radio waves of certain wavelengths.' },
    { t: 'SIM', d: 'Subscriber identity module: a tiny smart card that proves to the network who you are.' },
    { t: 'OLED', d: 'A screen where every dot makes its own light.' },
  ],
  defaults: { explode: 0.55, xray: true, radio: false, part: '' },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the case' },
    { key: 'radio', type: 'toggle', label: 'Follow the radio', hint: 'Lights up the antennas, the RF front-end and the modem, and shows waves leaving the frame.' },
  ],
  quiz: [
    { q: 'Where are most of a modern phone\'s antennas?', options: ['In a pull-out rod', 'In pieces of the metal frame', 'Inside the battery', 'Behind the camera lens'], answer: 1, why: 'The frame is cut into sections by thin plastic breaks, and those sections work as antennas.' },
    { q: 'What takes up most of the space inside a phone?', options: ['The camera', 'The battery', 'The speaker', 'The SIM'], answer: 1, why: 'The flat lithium-ion battery fills most of the middle of the phone.' },
    { q: 'What does the modem do?', options: ['Stores your photos', 'Turns data into radio signals and back', 'Charges the battery', 'Makes the screen glow'], answer: 1, why: 'It speaks the language of the network: 4G, 5G and the rest.' },
  ],
  reel: [
    { ms: 5600, caption: 'A phone is a two-way radio joined to a computer, built in thin layers.', set: { xray: true, radio: false }, anim: { explode: [0, 0.85] }, spin: 0.35 },
  ],

  build({ stage }) {
    const home = canvasTexture(360, 768, (g, w, h) => paintHome(g, w, h));
    const P = makePhone({ screenTex: home.tex });
    const phone = P.group; phone.rotation.y = Math.PI / 2 + 0.25; phone.position.set(1.2, 1.2, 0);
    stage.root.add(phone);

    // Layer offsets (phone units, up the Y axis): back glass down, the display stack up.
    const setExplode = exploder([
      { obj: P.parts.back, off: [0, -1.0, 0] },
      { obj: P.parts.frame, off: [0, 2.0, 0] },
      { obj: P.parts.oled, off: [0, 3.8, 0] },
      { obj: P.parts.touch, off: [0, 5.0, 0] },
      { obj: P.parts.glass, off: [0, 6.2, 0] },
      { obj: P.sim, off: [0.9, 0, 0] },
      { obj: P.coil, off: [0, -0.5, 0] },
    ]);

    // Radio waves leaving the antennas: expanding rings around the top and bottom of the phone.
    const waves = [];
    for (let i = 0; i < 6; i++) {
      const w = torus(1, 0.02, M.ghost(0x8ef0ff, 0.5), 64); w.rotation.x = Math.PI / 2; waves.push(w); phone.add(w);
    }

    // Labels on the parts (shown when you can see inside).
    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const inner = [
      L('Battery', P.battery, [0, 0.3, -0.6]),
      L('System on a chip', P.soc, [0, 0.25, 0], 'hot'),
      L('Cameras', P.cams, [0, -0.3, 0]),
      L('SIM tray', P.sim, [0.4, 0.1, 0]),
      L('Vibration motor', P.vib, [0, 0.25, 0]),
    ];
    const radioLabels = [L('Modem', P.modem, [0.4, 0.2, 0.3]), L('RF front-end', P.rf, [0.5, 0.2, -0.3], 'hot')];
    const layerLabels = [
      L('Cover glass', P.parts.glass, [-1.9, 0.1, 3.4]),
      L('Touch layer', P.parts.touch, [-1.9, 0.05, 3.4]),
      L('OLED screen', P.parts.oled, [-1.9, 0.05, 3.4]),
      L('Frame with antennas', P.parts.frame, [1.9, 0.2, -3.2], 'hot'),
      L('Back glass', P.parts.back, [-1.9, -0.1, 3.4]),
    ];

    // Click-to-name: every part gets a key.
    const tag = (obj, key) => { obj.traverse((o) => { if (o.isMesh) o.userData.part = key; }); stage.pickables.push(obj); };
    tag(P.parts.glass, 'glass'); tag(P.parts.touch, 'touch'); tag(P.parts.oled, 'oled');
    ['soc', 'modem', 'rf', 'pa', 'mem', 'pmic', 'battery', 'coil', 'cams', 'front', 'spk', 'ear', 'vib', 'sim', 'usb', 'mic'].forEach((k) => tag(P[k], k));
    P.antSpots.forEach((a) => tag(a, 'ant'));
    tag(P.parts.back, 'back');

    let t = 0, sel = '';
    const radioParts = [P.modem, P.rf, P.pa];
    const baseCol = radioParts.map((m) => m.material.color.clone());
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        setExplode(s.explode);
        const see = s.xray || s.explode > 0.25;
        P.backMat.opacity = see ? 0.25 : 1; P.backMat.depthWrite = !see;
        P.frameMat.opacity = see ? 0.45 : 1; P.frameMat.transparent = true;
        P.parts.glass.visible = true;
        // When together and X-rayed, fade the screen so you can see inside.
        const together = s.explode < 0.25;
        P.oledMat.transparent = true; P.oledMat.opacity = see && together ? 0.25 : 1; P.oledMat.depthWrite = !(see && together);
        P.touchMat.opacity = together ? 0.12 : 0.55;
        inner.forEach((l) => { l.visible = see; });
        radioLabels.forEach((l) => { l.visible = s.radio; });
        layerLabels.forEach((l) => { l.visible = s.explode > 0.4; });
        // Radio path highlight.
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        P.antMat.emissiveIntensity = s.radio ? 0.6 + 0.8 * pulse : 0;
        P.feedMat.opacity = s.radio ? 0.9 : 0;
        radioParts.forEach((m, i) => { m.material.color.copy(baseCol[i]); if (s.radio) m.material.color.lerp(new THREE.Color(0x8ef0ff), 0.5 + 0.3 * pulse); });
        waves.forEach((w, i) => {
          const k = (t * 0.45 + i / waves.length) % 1, top = i % 2 === 0;
          w.visible = s.radio;
          w.scale.setScalar(0.6 + k * 4.2);
          w.position.set(0, 0.2 + s.explode * 2.0, top ? -3.9 : 3.9);
          w.material.opacity = 0.55 * (1 - k);
        });
      },
      pick(o) { sel = o.userData.part || ''; },
      readout: () => {
        const i = INFO[sel];
        if (i) return `<div class="big">${i[0]}</div><small>${i[1]}</small>`;
        return `<div class="big">About 180 g of parts</div>
          <div class="row"><span>Screen stack</span><b>glass, touch grid, OLED</b></div>
          <div class="row"><span>Battery</span><b>≈ 5,000 mAh × 3.85 V ≈ 19 Wh</b></div>
          <div class="row"><span>Antennas</span><b>4 or more, in the frame</b></div>
          <small>Click any part to find out what it does.</small>`;
      },
    };
  },
};
