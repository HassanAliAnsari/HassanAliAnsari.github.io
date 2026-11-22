(() => {
  const scene = document.querySelector('.hero-stage');
  const canvas = scene?.querySelector('.hero-navigation');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const width = 960;
  const height = 430;
  const route = [
    [[63, 252], [210, 252], [268, 252], [320, 235]],
    [[320, 235], [386, 212], [398, 165], [475, 165]],
    [[475, 165], [555, 165], [646, 166], [695, 190]],
    [[695, 190], [753, 216], [750, 262], [896, 262]]
  ];
  const samples = [];
  let distance = 0;
  for (const [a, b, c, d] of route) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const m = 1 - t;
      const point = a.map((value, axis) => m ** 3 * value + 3 * m ** 2 * t * b[axis] +
        3 * m * t ** 2 * c[axis] + t ** 3 * d[axis]);
      const previous = samples.at(-1);
      if (previous) distance += Math.hypot(point[0] - previous.x, point[1] - previous.y);
      const tangent = a.map((value, axis) => m ** 2 * (b[axis] - value) +
        2 * m * t * (c[axis] - b[axis]) + t ** 2 * (d[axis] - c[axis]));
      samples.push({ x: point[0], y: point[1], angle: Math.atan2(tangent[1], tangent[0]), distance });
    }
  }

  function box(x, y, w, h, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function vehicle(x, y, angle, active = false, length = 78) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const w = active ? 43 : 39;
    const x0 = -length / 2;
    ctx.shadowColor = '#354a7460';
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 6;
    const paint = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    const colors = active ? ['#798cf7', '#435bcc', '#203798'] : ['#ffffff', '#e0e8f4', '#b2bfd3'];
    colors.forEach((color, i) => paint.addColorStop(i / 2, color));
    box(x0, -w / 2, length, w, 11, paint, active ? '#3348a4' : '#f9fbff');
    ctx.shadowColor = 'transparent';
    for (const wheel of [x0 + 11, -x0 - 21]) {
      for (const side of [-1, 1]) {
        box(wheel, side * (w / 2 - 2) - 3, 10, 6, 2, active ? '#182b71' : '#8a9bb5');
      }
    }
    box(x0 + 15, -w / 2 + 5, length - 34, w - 10, 7, active ? '#273f9cb8' : '#a5b4ca', '#ffffff96');
    box(x0 + 24, -w / 2 + 8, length - 51, w - 16, 4, active ? '#99aaf3' : '#edf3fb', '#ffffff9c');
    for (const side of [-1, 1]) {
      box(-x0 - 7, side * (w / 2 - 7) - 2, 4, 4, 1, '#fff');
      box(x0 + 3, side * (w / 2 - 7) - 2, 3, 4, 1, active ? '#f3a0ad' : '#d5a4ad');
    }
    ctx.restore();
  }

  function routePose(at) {
    const index = samples.findIndex(point => point.distance >= at);
    if (index < 0) return samples.at(-1);
    if (index === 0) return samples[0];
    const a = samples[index - 1];
    const b = samples[index];
    const fraction = (at - a.distance) / (b.distance - a.distance);
    return {
      x: a.x + (b.x - a.x) * fraction,
      y: a.y + (b.y - a.y) * fraction,
      angle: a.angle + (b.angle - a.angle) * fraction
    };
  }

  function sensor(pose) {
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.angle);
    for (const [x, direction] of [[34, 0], [-34, Math.PI]]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.arc(x, 0, direction ? 49 : 74, direction - 0.59, direction + 0.59);
      ctx.closePath();
      ctx.fillStyle = '#6488ff14';
      ctx.fill();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = '#6384df91';
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(progress) {
    const density = Math.min(devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(canvas.clientWidth * density));
    const pixelHeight = Math.max(1, Math.round(canvas.clientHeight * density));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (let x = 14; x < width; x += 21) {
      for (let y = 12; y < height; y += 21) box(x, y, 1.6, 1.6, 1, '#8399bc26');
    }
    for (const y of [21, 304]) {
      box(20, y, 920, 102, 10, '#b4c4dd32');
      for (let x = 35; x < 938; x += 74) box(x, y + 5, 2, 92, 1, '#fff');
    }
    for (const [x, length] of [[74, 79], [221, 75], [368, 86], [591, 91], [811, 80]]) {
      vehicle(x, 72, Math.PI / 2, false, length);
    }
    for (const [x, length] of [[147, 82], [295, 92], [443, 79], [663, 90], [883, 80]]) {
      vehicle(x, 355, -Math.PI / 2, false, length);
    }
    box(445, 235, 106, 41, 18, '#bfd0c9', '#fff', 2);
    box(457, 245, 82, 20, 10, '#91b0a2');
    for (const [x, y] of [[593, 249], [618, 254], [644, 259]]) {
      box(x - 7, y - 7, 14, 14, 3, '#fff');
      box(x - 4, y - 4, 8, 8, 4, '#cf895e');
    }
    ctx.beginPath();
    ctx.moveTo(...route[0][0]);
    for (const [, b, c, d] of route) ctx.bezierCurveTo(...b, ...c, ...d);
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = '#566fcb9e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    const end = route.at(-1).at(-1);
    box(end[0] - 9, end[1] - 9, 18, 18, 9, '#d8e1ff', '#637bd6', 2);
    const position = progress * distance;
    const pose = routePose(position);
    ctx.save();
    ctx.shadowColor = '#738cff';
    ctx.shadowBlur = 8;
    for (let t = 18; t < 132 && position + t < distance; t += 13) {
      const dot = routePose(position + t);
      box(dot.x - 2.2, dot.y - 2.2, 4.4, 4.4, 2.2, '#6789ef', '#f3f7ff', 1);
    }
    ctx.restore();
    sensor(pose);
    vehicle(pose.x, pose.y, pose.angle, true);
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const bounds = scene.getBoundingClientRect();
      const progress = reduced.matches ? 0.36 :
        Math.max(0, Math.min(1, 0.37 + -bounds.top / (bounds.height * 0.86)));
      draw(progress);
    });
  }
  addEventListener('scroll', () => {
    if (!reduced.matches && scene.getBoundingClientRect().bottom > 0) schedule();
  }, { passive: true });
  new ResizeObserver(schedule).observe(canvas);
  reduced.addEventListener('change', schedule);
  schedule();
})();
