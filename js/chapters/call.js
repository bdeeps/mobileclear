// Chapter 5: a call, step by step. Dial → the SIM proves who it is (challenge and response with its secret
// key) → the core network finds the other phone and pages it → it rings → voice flows as 20 ms packets.
// Or send an SMS: a 140-byte message on the control channel, stored and forwarded by the SMS centre.
import { THREE, M, box, tube, swarm, sphere, clamp } from '../kit.js';
import { makeTower, miniPhone, voiceDelay, smsParts, PLACES, TAU } from '../mobile.js';

const CALL = [
  { id: 'dial', t: 1.6, name: 'Dial', text: 'Your phone asks its tower for a channel and sends the number you dialled to the core network.' },
  { id: 'auth', t: 3.2, name: 'SIM check', text: 'The network sends a random number. Your SIM scrambles it with a secret key that never leaves the card and sends back the answer. A match proves it\'s you.' },
  { id: 'find', t: 2.2, name: 'Find the other phone', text: 'The core looks up where the other phone last checked in, and pages it through every tower in that area.' },
  { id: 'ring', t: 1.8, name: 'Ring', text: 'The other phone wakes, answers the page and rings. Pick up and the call is connected.' },
  { id: 'talk', t: 5.0, name: 'Talk', text: 'Your voice is cut into 20 ms slices, squeezed to about 30 bytes each, and sent as packets: 50 every second, each way.' },
];
const SMS = [
  { id: 'send', t: 2.2, name: 'Send', text: 'The text goes up on the control channel, the same small channel the phone uses to talk to the network, and on to the SMS centre.' },
  { id: 'store', t: 1.4, name: 'Store', text: 'The SMS centre keeps it. If the other phone is off, it waits and tries again later.' },
  { id: 'deliver', t: 2.4, name: 'Deliver', text: 'The network pages the other phone and slips the text down its control channel.' },
  { id: 'report', t: 1.6, name: 'Delivery report', text: 'A tiny "delivered" note comes back to you.' },
];
const total = (steps) => steps.reduce((a, s) => a + s.t, 0);

export default {
  id: 'call',
  short: 'A call, step by step',
  title: 'What happens when you call',
  subtitle: 'From tapping the green button to hearing "hello": a check on your SIM, a search for the other phone, and fifty packets a second.',
  view: { pos: [1.2, 7.4, 15.2], target: [1.2, 1.9, -0.8] },
  learn: `<p>When you tap call, your phone is already <b>registered</b>: the network knows roughly where it is. Here is what happens next.</p>
    <p><b>1. Dial.</b> Your phone asks the nearest tower for a channel and sends the number to the <b>core network</b>, the operator's computers that run the show.</p>
    <p><b>2. Prove who you are.</b> Your <b>SIM</b> holds a secret key that is never sent anywhere. The network sends a random number; the SIM scrambles it with the key and sends back the answer. Only the right SIM gets it right. This is how nobody else can make calls on your number.</p>
    <p><b>3. Find the other phone.</b> The core knows which group of towers the other phone last checked in with, and <b>pages</b> it through all of them. <b>4. Ring.</b> The phone answers the page and rings. Setting up a call takes about 2 to 3 seconds on 4G.</p>
    <p><b>5. Talk.</b> Your voice is sliced into <b>20-millisecond</b> pieces, compressed and sent as packets, 50 a second each way. For a natural chat the delay should stay under about <b>150 ms</b>. The landline version of this story is in TelephoneClear.</p>
    <p>A <b>text message (SMS)</b> is tiny: 140 bytes, enough for <b>160 letters</b>. It was designed to squeeze into the network's control channel, and an <b>SMS centre</b> stores it until the other phone can take it.</p>
    <p class="tip"><b>Try it:</b> press "Dial again" and follow the steps. Then switch to SMS and write a message in Hindi to see how the limit changes.</p>`,
  terms: [
    { t: 'Core network', d: 'The operator\'s central computers that check SIMs, find phones, connect calls and count usage.' },
    { t: 'Authentication', d: 'Proving your SIM is genuine, by answering a random challenge with a secret key.' },
    { t: 'Paging', d: 'Calling out to a phone through all the towers where it might be, so it wakes up to take a call.' },
    { t: 'VoLTE', d: 'Voice over LTE: phone calls sent as internet-style packets over 4G.' },
    { t: 'Latency', d: 'The delay between speaking and being heard, in milliseconds.' },
    { t: 'SMS centre', d: 'A server that stores text messages and forwards them when the phone is reachable.' },
  ],
  defaults: { mode: 'call', place: 'delhi', chars: 120, hindi: false },
  controls: [
    { key: 'mode', type: 'seg', label: 'Send', options: [{ v: 'call', label: 'A voice call' }, { v: 'sms', label: 'A text (SMS)' }] },
    { key: 'place', type: 'seg', label: 'Calling', options: Object.entries(PLACES).map(([v, p]) => ({ v, label: p.name })), fmt: (v) => `about ${PLACES[v].km.toLocaleString('en-IN')} km` },
    { key: 'chars', type: 'range', label: 'Text length', min: 1, max: 480, step: 1, fmt: (v) => Math.round(v) + ' characters' },
    { key: 'hindi', type: 'toggle', label: 'Write in Hindi (Unicode)', hint: 'Letters outside the basic GSM alphabet need 16 bits each, so fewer fit.' },
    { key: 'go', type: 'buttons', label: 'Start', items: [{ label: 'Dial again', act: (s, inst) => inst.restart?.() }] },
  ],
  quiz: [
    { q: 'How does the network know it\'s really your SIM?', options: ['It checks your phone\'s colour', 'The SIM answers a random challenge using a secret key that never leaves it', 'It asks for your name', 'It listens to your voice'], answer: 1, why: 'Only a SIM holding the right key can turn the random number into the expected answer.' },
    { q: 'How many characters fit in one SMS using the basic alphabet?', options: ['70', '140', '160', '1000'], answer: 2, why: '140 bytes × 8 bits ÷ 7 bits per character = 160 characters. Unicode text, like Hindi, fits 70.' },
    { q: 'How often does your phone send a voice packet during a call?', options: ['Once a second', 'Every 20 milliseconds', 'Once a minute', 'Only when you stop talking'], answer: 1, why: 'Speech is cut into 20 ms frames, so 50 packets a second go each way.' },
  ],
  reel: [
    { ms: 5800, caption: 'Tap call: your SIM answers a secret challenge, then the network pages the other phone.', set: { mode: 'call', place: 'delhi' }, act: (s, inst) => inst.restart?.(), spin: 0.12 },
    { ms: 4800, caption: 'A text is just 140 bytes, 160 letters, slipped into the network\'s control channel.', set: { mode: 'sms', hindi: false, place: 'city' }, anim: { chars: [20, 160] }, act: (s, inst) => inst.restart?.(), spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(0.85); root.position.x = 1.4; stage.root.add(root);
    // ---- the cast
    const phA = miniPhone(1.3), phB = miniPhone(1.3, 0x5ce1a9);
    phA.position.set(-7.2, 1.4, 1.6); phA.rotation.set(1.1, 0.35, 0, 'YXZ'); phB.position.set(7.2, 1.4, 1.6); phB.rotation.set(1.1, -0.35, 0, 'YXZ');
    root.add(phA, phB);
    const twA = makeTower(3.2), twB = makeTower(3.2), twB2 = makeTower(3.2);
    twA.position.set(-5.2, 0, -1.2); twB.position.set(5.2, 0, -1.2); twB2.position.set(7.8, 0, -3.6);
    root.add(twA, twB, twB2);
    const core = new THREE.Group(); core.position.set(0, 0, -2.6); root.add(core);
    for (let i = 0; i < 4; i++) {
      const rack = box(0.6, 2.0, 0.8, M.plastic(0x1d2029)); rack.position.set(-1.05 + i * 0.7, 1.0, 0); core.add(rack);
      for (let k = 0; k < 7; k++) { const l = box(0.4, 0.03, 0.02, M.glow(k % 3 ? 0x8ef0ff : 0x5ce1a9)); l.position.set(-1.05 + i * 0.7, 0.35 + k * 0.24, 0.41); core.add(l); }
    }
    const hss = box(0.9, 0.9, 0.8, M.plastic(0x3a2f55)); hss.position.set(-2.4, 0.45, -2.6); root.add(hss);
    const smsc = box(0.9, 0.9, 0.8, M.plastic(0x2f4a3a)); smsc.position.set(2.4, 0.45, -2.6); root.add(smsc);
    const L = (t, p, cls) => stage.label(t, p, root, cls);
    L('Your phone', [-7.2, 2.9, 1.6], 'hot'); L('Their phone', [7.2, 2.9, 1.6], 'hot');
    L('Tower', [-5.2, 3.8, -1.2]); L('Towers near them', [6.5, 3.8, -2.4]);
    L('Core network', [0, 2.5, -2.6], 'hot'); L('Subscriber database', [-2.4, 1.3, -2.6]); L('SMS centre', [2.4, 1.3, -2.6]);
    const farLbl = L('', [2.6, 0.5, -0.6]);
    const stepLbl = L('', [0, 0.1, 2.8], 'hot');

    // ---- links: radio (dashed-looking ghost) and fibre (solid)
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const mk = (pts) => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    const paths = {
      upA: mk([V(-7.2, 2.2, 1.4), V(-6.4, 2.6, 0.3), V(-5.2, 3.1, -1.2)]),
      fibA: mk([V(-5.2, 0.1, -1.2), V(-3.6, 0.1, -2.0), V(-1.4, 0.3, -2.6)]),
      coreHss: mk([V(-1.2, 1.0, -2.6), V(-2.0, 0.9, -2.6), V(-2.4, 0.9, -2.6)]),
      fibB: mk([V(1.4, 0.3, -2.6), V(3.6, 0.1, -2.0), V(5.2, 0.1, -1.2)]),
      fibB2: mk([V(1.4, 0.3, -2.6), V(5.0, 0.1, -3.4), V(7.8, 0.1, -3.6)]),
      downB: mk([V(5.2, 3.1, -1.2), V(6.4, 2.6, 0.3), V(7.2, 2.2, 1.4)]),
      downB2: mk([V(7.8, 3.1, -3.6), V(7.6, 2.4, -1.0), V(7.2, 2.2, 1.4)]),
      coreSms: mk([V(1.2, 1.0, -2.6), V(2.0, 0.9, -2.6), V(2.4, 0.9, -2.6)]),
    };
    for (const [k, c] of Object.entries(paths)) {
      const radio = k.startsWith('up') || k.startsWith('down');
      const m = tube(c.getPoints(40), radio ? 0.02 : 0.04, radio ? M.ghost(0x8ef0ff, 0.25) : M.plastic(0xffb547, { roughness: 0.5, transparent: true, opacity: 0.5 }), false, 40); m.castShadow = false; root.add(m);
    }
    // Full routes as chains of paths (forward), and a way to walk them.
    const chain = (...keys) => keys.map((k) => paths[k]);
    const walk = (segs, u, back = false) => { u = clamp(u, 0, 0.9999); if (back) { segs = [...segs].reverse(); } const n = segs.length, i = Math.floor(u * n), f = u * n - i; return segs[i].getPointAt(back ? 1 - f : f); };
    const R = {
      toCore: chain('upA', 'fibA'), toHss: chain('coreHss'),
      toB: chain('fibB', 'downB'), toB2: chain('fibB2', 'downB2'),
      toSms: chain('upA', 'fibA', 'coreSms'), smsToB: chain('coreSms', 'fibB', 'downB'),
    };
    // Packet swarms by colour.
    const geo = new THREE.SphereGeometry(0.11, 12, 8);
    const blue = swarm(60, geo, M.glow(0x8ef0ff)), amber = swarm(8, geo, M.glow(0xffb547)), green = swarm(60, geo, M.glow(0x5ce1a9));
    [blue, amber, green].forEach((sw) => { sw.castShadow = false; root.add(sw); });
    const hide = (sw, from) => { for (let i = from; i < sw.count; i++) sw.place(i, [0, -50, 0], null, 0.001); };
    // Ring effect on phone B.
    const ringFx = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), M.glow(0x5ce1a9, { transparent: true, opacity: 0.8 })); ringFx.rotation.x = -Math.PI / 2; root.add(ringFx);
    // SIM glow on phone A during authentication.
    const simGlow = sphere(0.25, M.glow(0xffb547, { transparent: true, opacity: 0.8 })); root.add(simGlow);

    let t = 0;
    const phaseOf = (steps, tt) => { let a = 0; for (let i = 0; i < steps.length; i++) { if (tt < a + steps[i].t) return { i, k: (tt - a) / steps[i].t }; a += steps[i].t; } return { i: steps.length - 1, k: 1 }; };
    const inst = {
      restart() { t = 0; },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const steps = s.mode === 'call' ? CALL : SMS, T = total(steps);
        if (t > T + 1.2) t = s.mode === 'call' ? total(CALL.slice(0, 4)) : 0;   // a call keeps talking; a text starts over
        const { i, k } = phaseOf(steps, Math.min(t, T - 1e-6)), id = steps[i].id;
        let nb = 0, na = 0, ng = 0;
        const put = (sw, n, p) => { sw.place(n, p.toArray()); return n + 1; };
        const tt = t;
        ringFx.visible = false; simGlow.visible = false;
        if (s.mode === 'call') {
          if (id === 'dial') { for (let j = 0; j < 3; j++) nb = put(blue, nb, walk(R.toCore, k - j * 0.06)); }
          if (id === 'auth') {
            simGlow.visible = true; simGlow.position.set(-7.2, 1.4, 1.9); simGlow.scale.setScalar(0.8 + 0.3 * Math.sin(tt * 10));
            if (k < 0.2) na = put(amber, na, walk(R.toHss, 1 - k / 0.2));
            else if (k < 0.55) na = put(amber, na, walk(R.toCore, (k - 0.2) / 0.35, true));
            else ng = put(green, ng, walk(R.toCore, (k - 0.55) / 0.45));
          }
          if (id === 'find') { nb = put(blue, nb, walk(R.toHss, k < 0.3 ? k / 0.3 : 1)); if (k > 0.3) { const u = (k - 0.3) / 0.7; nb = put(blue, nb, walk(R.toB, u)); nb = put(blue, nb, walk(R.toB2, u)); } }
          if (id === 'ring' || id === 'talk') {
            ringFx.visible = id === 'ring'; const rk = (tt * 1.5) % 1; ringFx.scale.setScalar(0.4 + rk * 1.4); ringFx.material.opacity = 0.9 * (1 - rk); ringFx.position.set(7.2, 0.1, 1.6);
            phB.position.x = 7.2 + (id === 'ring' ? Math.sin(tt * 60) * 0.03 : 0);
          }
          if (id === 'ring') { ng = put(green, ng, walk([...R.toCore, ...R.toB], 1 - k, false)); }
          if (id === 'talk') {
            // Voice packets both ways: one every 20 ms, shown slowed down so you can see them.
            const n = 12;
            for (let j = 0; j < n; j++) { const u = ((tt * 0.35) + j / n) % 1; nb = put(blue, nb, walk([...R.toCore, ...R.toB], u)); ng = put(green, ng, walk([...R.toCore, ...R.toB], u, true)); }
          }
        } else {
          const parts = smsParts(s.chars, s.hindi).parts;
          if (id === 'send') for (let j = 0; j < parts; j++) nb = put(blue, nb, walk(R.toSms, k - j * 0.07));
          if (id === 'store') for (let j = 0; j < parts; j++) nb = put(blue, nb, new THREE.Vector3(2.4 + (j - (parts - 1) / 2) * 0.25, 1.1 + 0.05 * Math.sin(tt * 6 + j), -2.1));
          if (id === 'deliver') for (let j = 0; j < parts; j++) nb = put(blue, nb, walk(R.smsToB, k - j * 0.07));
          if (id === 'report') ng = put(green, ng, walk([...R.toSms, ...R.smsToB.slice(1)], 1 - k));
        }
        hide(blue, nb); hide(amber, na); hide(green, ng); blue.done(); amber.done(); green.done();
        stepLbl.element.textContent = `${i + 1}. ${steps[i].name}`;
        farLbl.element.textContent = s.mode === 'call' ? `${PLACES[s.place].name}: fibre` : 'Control channel';
      },
      readout: (s) => {
        const steps = s.mode === 'call' ? CALL : SMS, T = total(steps), { i } = phaseOf(steps, Math.min(t, T - 1e-6));
        const list = `<div class="row"><span>Step ${i + 1} of ${steps.length}</span><b>${steps.map((st, j) => (j < i ? '●' : j === i ? '◉' : '○')).join(' ')}</b></div>`;
        if (s.mode === 'call') {
          const d = voiceDelay(PLACES[s.place].km);
          return `<div class="big">${steps[i].name}</div><small>${steps[i].text}</small>${list}
            <div class="row"><span>Mouth-to-ear delay</span><b class="${d.total < 150 ? 'ok' : 'no'}">≈ ${Math.round(d.total)} ms</b></div>
            <small>Incl. ${Math.round(d.parts[4][1])} ms in fibre. ITU-T G.114 advises under 150 ms.</small>`;
        }
        const sp = smsParts(s.chars, s.hindi), bytes = s.hindi ? Math.round(s.chars) * 2 : Math.ceil((Math.round(s.chars) * 7) / 8);
        return `<div class="big">${steps[i].name}</div><small>${steps[i].text}</small>${list}
          <div class="row"><span>${Math.round(s.chars)} ${s.hindi ? 'Unicode' : 'GSM 7-bit'} characters</span><b>${bytes} bytes</b></div>
          <div class="row"><span>Sent as</span><b>${sp.parts} SMS${sp.parts > 1 ? ` (${sp.per} characters each)` : ''}</b></div>
          <small>140 bytes: 160 letters at 7 bits, or 70 Unicode letters at 16 bits.</small>`;
      },
    };
    return inst;
  },
};
