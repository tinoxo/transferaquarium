/* ============================================================
   tank.js — aquarium title screen
   ------------------------------------------------------------
   SELF-CONTAINED AND SWAPPABLE. It touches exactly one thing:
   the <canvas id="tank-canvas"> inside #tank-screen.

   To drop in a different fish tank, replace this whole file.
   The only contract is: render something into #tank-canvas
   (or replace that element entirely). Nothing in app.js reads
   from here, and nothing here reads from app.js or data.js.
   ============================================================ */

(function () {
  "use strict";

  const canvas = document.getElementById("tank-canvas");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let fish = [], bubbles = [], weeds = [], motes = [];
  let running = true;
  let t = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  const PALETTE = [
    { body: "#ff9f43", fin: "#ff7a18", name: "clown"   },
    { body: "#4aa8ff", fin: "#2b7fd4", name: "blue"    },
    { body: "#35d6c0", fin: "#16a394", name: "teal"    },
    { body: "#f5d76e", fin: "#e0b93c", name: "yellow"  },
    { body: "#ff6b8b", fin: "#e04a6c", name: "rose"    },
    { body: "#c084fc", fin: "#9a5fe0", name: "violet"  }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildScenery();
  }

  function buildScenery() {
    // Seaweed anchored along the floor
    weeds = [];
    const count = Math.max(7, Math.round(W / 95));
    for (let i = 0; i < count; i++) {
      weeds.push({
        x: (W / count) * i + rand(-18, 18),
        h: rand(H * 0.14, H * 0.34),
        w: rand(5, 12),
        sway: rand(0.5, 1.3),
        phase: rand(0, Math.PI * 2),
        hue: rand(140, 175),
        light: rand(22, 38)
      });
    }

    // Suspended particles catching the light
    motes = [];
    const mcount = Math.round((W * H) / 22000);
    for (let i = 0; i < mcount; i++) {
      motes.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.4, 1.7),
        vy: rand(-0.12, -0.35),
        vx: rand(-0.1, 0.1),
        a: rand(0.06, 0.26)
      });
    }
  }

  function makeFish(seed) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const scale = rand(0.55, 1.35);
    return {
      x: seed ? rand(0, W) : (dir === 1 ? -60 : W + 60),
      y: rand(H * 0.12, H * 0.82),
      dir,
      scale,
      speed: rand(0.28, 0.85) / scale * 1.1,
      wob: rand(0.012, 0.03),
      wobAmp: rand(5, 18),
      phase: rand(0, Math.PI * 2),
      tailPhase: rand(0, Math.PI * 2),
      tailRate: rand(0.14, 0.26),
      col: pick(PALETTE),
      depth: rand(0.45, 1)        // fades distant fish into the water
    };
  }

  function buildFish() {
    fish = [];
    const n = W < 620 ? 7 : W < 1000 ? 11 : 15;
    for (let i = 0; i < n; i++) fish.push(makeFish(true));
    fish.sort((a, b) => a.depth - b.depth);
  }

  function spawnBubble() {
    bubbles.push({
      x: rand(0, W),
      y: H + rand(0, 30),
      r: rand(1.3, 4.6),
      vy: rand(0.35, 1.1),
      wob: rand(0.015, 0.05),
      phase: rand(0, Math.PI * 2),
      a: rand(0.18, 0.5)
    });
  }

  /* ---------- drawing ---------- */

  function drawWater() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    "#10527d");
    grad.addColorStop(0.42, "#08304b");
    grad.addColorStop(1,    "#03121e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRays() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rays = 5;
    for (let i = 0; i < rays; i++) {
      const baseX = (W / (rays - 1)) * i;
      const drift = Math.sin(t * 0.0006 + i * 1.7) * (W * 0.05);
      const x = baseX + drift;
      const wTop = 34 + Math.sin(t * 0.001 + i) * 12;
      const wBot = wTop * 4.5;
      const alpha = 0.035 + Math.sin(t * 0.0011 + i * 2.1) * 0.018;

      const g = ctx.createLinearGradient(x, 0, x + wBot * 0.4, H * 0.85);
      g.addColorStop(0,   "rgba(150, 225, 255, " + Math.max(alpha, 0.008) + ")");
      g.addColorStop(1,   "rgba(150, 225, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - wTop / 2, -10);
      ctx.lineTo(x + wTop / 2, -10);
      ctx.lineTo(x + wBot / 2 + 40, H * 0.9);
      ctx.lineTo(x - wBot / 2 + 40, H * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloor() {
    const floorY = H - Math.max(34, H * 0.055);
    const g = ctx.createLinearGradient(0, floorY - 40, 0, H);
    g.addColorStop(0, "rgba(12, 42, 65, 0)");
    g.addColorStop(1, "rgba(6, 26, 40, .95)");
    ctx.fillStyle = g;
    ctx.fillRect(0, floorY - 40, W, H - floorY + 40);

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, floorY + 6);
    const step = 26;
    for (let x = 0; x <= W + step; x += step) {
      const y = floorY + Math.sin(x * 0.021) * 5 + Math.sin(x * 0.005 + 1.4) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = "#07202f";
    ctx.fill();
  }

  function drawWeeds() {
    const floorY = H - Math.max(34, H * 0.055);
    weeds.forEach((wd) => {
      const segs = 9;
      ctx.beginPath();
      ctx.moveTo(wd.x, floorY + 4);
      for (let s = 1; s <= segs; s++) {
        const f = s / segs;
        const sway = Math.sin(t * 0.0013 * wd.sway + wd.phase + f * 2.4) * (14 * f) * wd.sway;
        ctx.lineTo(wd.x + sway, floorY + 4 - wd.h * f);
      }
      ctx.strokeStyle = "hsla(" + wd.hue + ", 48%, " + wd.light + "%, .72)";
      ctx.lineWidth = wd.w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });
  }

  function drawFish(f) {
    const y = f.y + Math.sin(t * f.wob + f.phase) * f.wobAmp;
    const s = f.scale;

    ctx.save();
    ctx.translate(f.x, y);
    ctx.scale(f.dir * s, s);
    ctx.globalAlpha = f.depth;

    const tail = Math.sin(t * f.tailRate + f.tailPhase);

    // tail fin
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.quadraticCurveTo(-23, -9 + tail * 5, -29, -12 + tail * 8);
    ctx.quadraticCurveTo(-24, 0, -29, 12 + tail * 8);
    ctx.quadraticCurveTo(-23, 9 + tail * 5, -13, 0);
    ctx.closePath();
    ctx.fillStyle = f.col.fin;
    ctx.fill();

    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.quadraticCurveTo(1, -17 + tail * 2, 9, -6);
    ctx.closePath();
    ctx.fillStyle = f.col.fin;
    ctx.fill();

    // pelvic fin
    ctx.beginPath();
    ctx.moveTo(-2, 6);
    ctx.quadraticCurveTo(1, 14 - tail * 2, 8, 6);
    ctx.closePath();
    ctx.fillStyle = f.col.fin;
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
    const bg = ctx.createLinearGradient(0, -9, 0, 9);
    bg.addColorStop(0, f.col.body);
    bg.addColorStop(1, f.col.fin);
    ctx.fillStyle = bg;
    ctx.fill();

    // belly highlight
    ctx.beginPath();
    ctx.ellipse(1, 3.5, 11, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fill();

    // eye
    ctx.beginPath();
    ctx.arc(9, -2, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9.7, -2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#04121f";
    ctx.fill();

    ctx.restore();
  }

  function drawBubbles() {
    bubbles.forEach((b) => {
      const x = b.x + Math.sin(t * b.wob + b.phase) * 9;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(190, 235, 255, " + b.a + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + (b.a * 0.7) + ")";
      ctx.fill();
    });
  }

  function drawMotes() {
    motes.forEach((m) => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200, 240, 255, " + m.a + ")";
      ctx.fill();
    });
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(2,10,18,.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- update ---------- */

  function update() {
    fish.forEach((f, i) => {
      f.x += f.speed * f.dir;
      const off = 70 * f.scale;
      if (f.dir === 1 && f.x > W + off)  fish[i] = makeFish(false);
      if (f.dir === -1 && f.x < -off)    fish[i] = makeFish(false);
    });

    if (bubbles.length < 34 && Math.random() < 0.1) spawnBubble();
    bubbles = bubbles.filter((b) => {
      b.y -= b.vy;
      return b.y > -12;
    });

    motes.forEach((m) => {
      m.y += m.vy;
      m.x += m.vx;
      if (m.y < -4)  { m.y = H + 4; m.x = rand(0, W); }
      if (m.x < -4)  m.x = W + 4;
      if (m.x > W+4) m.x = -4;
    });
  }

  function frame() {
    if (!running) return;
    t += 1;
    drawWater();
    drawRays();
    drawMotes();
    drawFloor();
    drawWeeds();
    fish.forEach(drawFish);
    drawBubbles();
    drawVignette();
    update();
    requestAnimationFrame(frame);
  }

  function still() {
    drawWater();
    drawRays();
    drawMotes();
    drawFloor();
    drawWeeds();
    fish.forEach(drawFish);
    drawBubbles();
    drawVignette();
  }

  /* ---------- lifecycle ---------- */

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      buildFish();
      if (reduced) still();
    }, 140);
  });

  // Pause the loop when the tank is scrolled out of view — saves battery on phones.
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
        else if (!e.isIntersecting) { running = false; }
      });
    }, { threshold: 0.01 });
    io.observe(document.getElementById("tank-screen"));
  }

  document.addEventListener("visibilitychange", function () {
    if (reduced) return;
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(frame); }
  });

  resize();
  buildFish();
  for (let i = 0; i < 12; i++) spawnBubble();

  if (reduced) { running = false; still(); }
  else requestAnimationFrame(frame);
})();
