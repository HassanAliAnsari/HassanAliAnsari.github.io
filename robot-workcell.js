(() => {
  const section = document.querySelector('#robot-workcell');
  const canvas = section?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const sticky = section.querySelector('.robot-sticky');
  const steps = [...section.querySelectorAll('.robot-steps li')];
  const readout = section.querySelector('.robot-readout');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 760px) and (orientation: portrait)');
  const rover = new Image();
  const roomWidth = 500;
  const roomHeight = 330;
  const cell = 10;
  const obstacles = [[145, 85, 72, 57], [267, 184, 82, 64], [373, 62, 55, 54], [88, 140, 48, 53]];
  const route = [[48, 255], [120, 250], [181, 223], [231, 157], [293, 125], [352, 140], [416, 183], [460, 241]];
  const total = 115;
  const clamp = t => Math.min(1, Math.max(0, t));
  const samples = [];
  const mapFrames = [];
  const mapped = new Uint8Array(roomWidth / cell * roomHeight / cell);

  function pose(progress) {
    const position = progress * (route.length - 1);
    const index = Math.min(route.length - 2, Math.floor(position));
    const t = position - index;
    const a = route[Math.max(0, index - 1)];
    const b = route[index];
    const c = route[index + 1];
    const d = route[Math.min(route.length - 1, index + 2)];
    return b.map((value, axis) => 0.5 * (2 * value + (-a[axis] + c[axis]) * t +
      (2 * a[axis] - 5 * value + 4 * c[axis] - d[axis]) * t ** 2 +
      (-a[axis] + 3 * value - 3 * c[axis] + d[axis]) * t ** 3));
  }

  function cast(x, y, angle, record = false) {
    let px = x, py = y;
    for (let range = 0; range <= 173; range += 3) {
      px = x + Math.cos(angle) * range;
      py = y + Math.sin(angle) * range;
      if (px < 0 || px >= roomWidth || py < 0 || py >= roomHeight) break;
      const hit = obstacles.some(([ox, oy, w, h]) => px >= ox && px < ox + w && py >= oy && py < oy + h);
      if (record) {
        const index = Math.floor(py / cell) * (roomWidth / cell) + Math.floor(px / cell);
        mapped[index] = hit ? 2 : Math.max(1, mapped[index]);
      }
      if (hit) break;
    }
    return [px, py];
  }
  for (let n = 0; n <= total; n++) {
    const [x, y] = pose(n / total);
    const [nextX, nextY] = pose(clamp((n + 1) / total));
    const [previousX, previousY] = pose(clamp((n - 1) / total));
    const angle = Math.atan2(nextY - previousY, nextX - previousX) + Math.sin(n / 6) * 0.75;
    samples.push({ x, y, angle });
    for (let ray = -11; ray <= 11; ray++) cast(x, y, angle + ray * 0.115, true);
    mapFrames.push(mapped.slice());
  }

  function box(x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.3; ctx.stroke(); }
  }

  function label(text, x, y, color = '#b1c4f8', size = 15) {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.fillText(text, x, y);
  }

  function panel(x, y, panelWidth, panelHeight) {
    box(x, y, panelWidth, panelHeight, 16, '#0d1533', '#384a78');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, panelWidth, panelHeight, 16);
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(panelWidth / roomWidth, panelHeight / roomHeight);
  }

  function draw(progress) {
    const compact = compactLayout.matches;
    const width = compact ? 460 : 900;
    const height = compact ? 672 : 455;
    const density = Math.min(devicePixelRatio || 1, 2);
    const wide = Math.round(canvas.clientWidth * density);
    const tall = Math.round(wide * height / width);
    if (!wide || !tall) return;
    if (canvas.width !== wide || canvas.height !== tall) {
      canvas.width = wide;
      canvas.height = tall;
    }
    ctx.setTransform(wide / width, 0, 0, tall / height, 0, 0);
    const back = ctx.createLinearGradient(0, 0, width, height);
    back.addColorStop(0, '#1a2651');
    back.addColorStop(1, '#0e142d');
    box(0, 0, width, height, 0, back);
    const frame = Math.round(progress * total);
    const { x, y, angle } = samples[frame];
    const geometry = compact ? [16, 45, 428, 284] : [24, 60, 502, 325];
    const map = compact ? [16, 384, 428, 260] : [550, 105, 325, 230];
    label('SURVEY ROOM', geometry[0], geometry[1] - 14);
    label('OCCUPANCY MAP', map[0], map[1] - 14);

    panel(...geometry);
    for (let i = 10; i < roomWidth; i += 20) {
      for (let j = 10; j < roomHeight; j += 20) box(i, j, 1.4, 1.4, 0.7, '#748dc461');
    }
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (const p of samples.slice(1, frame + 1)) ctx.lineTo(p.x, p.y);
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = '#867cff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
    const beam = ctx.createRadialGradient(x, y, 4, x, y, 175);
    beam.addColorStop(0, '#92f6ff50');
    beam.addColorStop(1, '#5cb8ff06');
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let ray = -10; ray <= 10; ray++) ctx.lineTo(...cast(x, y, angle + ray * 0.115));
    ctx.closePath();
    ctx.fillStyle = beam;
    ctx.fill();
    for (const [ox, oy, w, h] of obstacles) {
      box(ox, oy + 5, w, h, 9, '#070e25');
      box(ox, oy, w, h, 9, '#202e55', '#566da1');
      box(ox + 5, oy + 5, w - 10, h - 10, 6, '#344971');
    }
    for (let ray = -8; ray <= 8; ray += 4) {
      const [ex, ey] = cast(x, y, angle + ray * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = '#82e4ff65';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      box(ex - 2, ey - 2, 4, 4, 2, '#a4eaff');
    }
    if (rover.naturalWidth) {
      const h = 102 * rover.naturalHeight / rover.naturalWidth;
      ctx.drawImage(rover, x - 51, y - h * 0.72, 102, h);
    } else {
      box(x - 18, y - 15, 36, 30, 8, '#889fed', '#c6eeff');
      box(x + 5, y - 6, 10, 12, 5, '#b8fbff');
    }
    ctx.restore();

    panel(...map);
    const cells = mapFrames[frame];
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue;
      const col = i % (roomWidth / cell);
      const row = Math.floor(i / (roomWidth / cell));
      box(col * cell, row * cell, 9, 9, 1, cells[i] === 2 ? '#a38cff' : '#2d7592');
    }
    box(x - 6, y - 6, 12, 12, 6, '#d3fbff', '#a69dff');
    ctx.restore();
    const legendY = map[1] + map[3] + (compact ? 21 : 27);
    label('■ Free space', map[0], legendY, '#83cce0', 13);
    label('■ Detected obstacle', map[0] + 110, legendY, '#c6b5ff', 13);
  }

  const descriptions = [
    'The rover sweeps its range sensor across the room.',
    'When a ray hits an obstacle, the rover marks that point on the map.',
    'The rover follows the open corridor as new measurements fill the grid.',
    'The map keeps the free space and obstacles observed along the route.'
  ];
  let frameRequest = 0;
  let active = -1;
  function update() {
    frameRequest = 0;
    const bounds = section.getBoundingClientRect();
    const staticView = reduced.matches;
    const range = Math.max(1, bounds.height - sticky.offsetHeight - 70);
    const progress = staticView ? 1 : clamp((42 - bounds.top) / range);
    draw(progress);
    const stage = Math.min(3, Math.floor(progress * 4));
    if (stage !== active) {
      steps[active]?.removeAttribute('aria-current');
      steps[stage].setAttribute('aria-current', 'step');
      readout.textContent = descriptions[stage];
      active = stage;
    }
  }
  function schedule() {
    if (!frameRequest) frameRequest = requestAnimationFrame(update);
  }
  addEventListener('scroll', () => {
    const bounds = section.getBoundingClientRect();
    if (!reduced.matches && bounds.bottom > 0 && bounds.top < innerHeight) schedule();
  }, { passive: true });
  addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  rover.addEventListener('load', schedule);
  rover.src = 'glass-rover.png';
  schedule();
})();
