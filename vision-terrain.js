(() => {
  const hero = document.querySelector('.hero-stage');
  const rail = document.querySelector('.terrain-rail');
  const layers = [hero?.querySelector('.terrain-hero'), rail?.querySelector('.terrain-map'), document.querySelector('.terrain-rover')];
  const [heroMap, railMap, rover] = layers.map(layer => layer?.getContext('2d'));
  if (!heroMap || !railMap || !rover) return;

  const stops = [...rail.querySelectorAll('a')];
  const sections = stops.map(stop => document.getElementById(stop.hash.slice(1)));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 760px)');
  const railStops = [[.50, .06], [.70, .22], [.35, .39], [.66, .57], [.34, .75], [.53, .93]];
  const clamp = value => Math.max(0, Math.min(1, value));
  let heroScene;
  let railScene;
  let frame = 0;

  function pointAt(points, progress) {
    const pos = clamp(progress) * (points.length - 1);
    const index = Math.min(Math.floor(pos), points.length - 2);
    const t = pos - index;
    const a = points[Math.max(0, index - 1)];
    const b = points[index];
    const c = points[index + 1];
    const d = points[Math.min(points.length - 1, index + 2)];
    return b.map((value, axis) => .5 * (
      2 * value + (c[axis] - a[axis]) * t +
      (2 * a[axis] - 5 * value + 4 * c[axis] - d[axis]) * t ** 2 +
      (3 * value - a[axis] - 3 * c[axis] + d[axis]) * t ** 3
    ));
  }

  function makeScene(context, points, dark) {
    const { width, height } = context.canvas.getBoundingClientRect();
    const path = points.map(([x, y]) => [x * width, y * height]);
    const samples = Array.from({ length: 161 }, (_, i) => pointAt(path, i / 160));
    const rocks = [];
    let seed = 91;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const density = Math.min(devicePixelRatio || 1, 2);
    context.canvas.width = Math.max(1, Math.round(width * density));
    context.canvas.height = Math.max(1, Math.round(height * density));
    context.setTransform(density, 0, 0, density, 0, 0);

    const tint = dark ? 'rgba(146,211,233,' : 'rgba(57,123,127,';
    const gap = dark ? 20 : 12;
    for (let x = gap / 2; x < width; x += gap) {
      for (let y = gap / 2; y < height; y += gap) {
        const diffuse = Math.sin(x / (dark ? 175 : 21)) + Math.cos(y / 49);
        context.fillStyle = tint + (diffuse > 1.25 ? '.23)' : '.10)');
        context.fillRect(x, y, 1, 1);
      }
    }
    for (let band = 0; band < (dark ? 9 : 6); band++) {
      context.beginPath();
      for (let y = 0; y <= height; y += 4) {
        const x = width * (band / (dark ? 8 : 5)) + Math.sin(y / (dark ? 83 : 49) + band * .48) * width * .084;
        context.lineTo(x, y);
      }
      context.strokeStyle = tint + (dark ? '.12)' : '.15)');
      context.stroke();
    }

    for (let i = 0; i < (dark ? 220 : 75); i++) {
      const x = random() * width;
      const y = height * ((dark ? .38 : .01) + (dark ? .59 : .98) * random());
      const r = dark ? 5 + random() * 12 : 3 + random() * Math.min(7, width * .095);
      const clearance = dark ? 31 : width < 45 ? 8 : 13;
      const aboveTrail = dark && y < height * .83;
      const inGutter = narrow.matches ? x > width * .925 : x > width * .46 && x < width * .545;
      if ((aboveTrail && !inGutter) || rocks.length >= (dark ? 19 : 12) || x < r || x > width - r ||
          !samples.some(point => Math.hypot(x - point[0], y - point[1]) < r + (dark ? 95 : 42)) ||
          samples.some(point => Math.hypot(x - point[0], y - point[1]) < r + clearance) ||
          rocks.some(rock => Math.hypot(x - rock.x, y - rock.y) < rock.r + r + 5)) continue;
      rocks.push({ x, y, r });
      context.save();
      context.translate(x, y);
      context.rotate(random() * Math.PI);
      context.beginPath();
      context.moveTo(-r, r * .31);
      context.lineTo(-r * .55, -r * .67);
      context.lineTo(r * .36, -r * .84);
      context.lineTo(r, -r * .12);
      context.lineTo(r * .56, r * .72);
      context.lineTo(-r * .45, r * .86);
      context.closePath();
      context.fillStyle = dark ? '#29465f' : '#91b6ad';
      context.fill();
      context.strokeStyle = dark ? '#7193a8' : '#719c93';
      context.stroke();
      context.beginPath();
      context.moveTo(-r * .55, -r * .67);
      context.lineTo(r * .20, -r * .17);
      context.lineTo(r * .56, r * .72);
      context.strokeStyle = dark ? '#94c1ce75' : '#e4f6e8bb';
      context.stroke();
      context.restore();
    }

    context.beginPath();
    context.moveTo(...samples[0]);
    samples.slice(1).forEach(point => context.lineTo(...point));
    context.lineCap = 'round';
    context.lineWidth = dark ? 19 : width < 45 ? 7 : 14;
    context.strokeStyle = tint + (dark ? '.14)' : '.16)');
    context.stroke();
    context.lineWidth = dark ? 1.5 : 1.1;
    context.setLineDash(dark ? [3, 6] : [2, 4]);
    context.strokeStyle = dark ? '#89dbe3aa' : '#48838baa';
    context.stroke();
    context.setLineDash([]);
    return { path, rocks };
  }

  function screenPose(canvas, scene, progress) {
    const bounds = canvas.getBoundingClientRect();
    const [x, y] = pointAt(scene.path, progress);
    const previous = pointAt(scene.path, progress - .006);
    const next = pointAt(scene.path, progress + .006);
    return {
      x: bounds.left + x,
      y: bounds.top + y,
      heading: Math.atan2(next[1] - previous[1], next[0] - previous[0]),
      rocks: scene.rocks,
      bounds
    };
  }

  function drawRover(pose, size) {
    const { x, y, heading, bounds, rocks } = pose;
    const range = size * 2.2;
    rover.save();
    rover.translate(x, y);
    rover.rotate(heading);
    rover.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const angle = i * .24;
      const dx = Math.cos(heading + angle);
      const dy = Math.sin(heading + angle);
      let distance = range;
      for (const rock of rocks) {
        const rx = bounds.left + rock.x - x;
        const ry = bounds.top + rock.y - y;
        const projection = rx * dx + ry * dy;
        const miss = rx * rx + ry * ry - projection * projection;
        if (projection > 0 && miss < rock.r ** 2) {
          distance = Math.min(distance, Math.max(size * .43, projection - Math.sqrt(rock.r ** 2 - miss)));
        }
      }
      const beam = rover.createLinearGradient(0, 0, Math.cos(angle) * distance, Math.sin(angle) * distance);
      beam.addColorStop(0, '#21bfdace');
      beam.addColorStop(1, distance < range ? '#31dbefae' : '#31dbef0a');
      rover.strokeStyle = beam;
      rover.beginPath();
      rover.moveTo(size * .40, 0);
      rover.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
      rover.stroke();
      if (distance < range) {
        rover.fillStyle = '#84f5ff';
        rover.beginPath();
        rover.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, 1.7, 0, Math.PI * 2);
        rover.fill();
      }
    }

    rover.scale(size / 40, size / 40);
    rover.shadowColor = '#08162990';
    rover.shadowBlur = 6;
    const body = rover.createLinearGradient(0, -11, 0, 11);
    body.addColorStop(0, '#f1ffffed');
    body.addColorStop(.43, '#8dcfe8ab');
    body.addColorStop(1, '#407fa9e6');
    for (const wheelX of [-15, 7]) {
      for (const wheelY of [-13, 8]) {
        rover.beginPath();
        rover.roundRect(wheelX, wheelY, 10, 5, 2);
        rover.fillStyle = '#183e59';
        rover.fill();
        rover.strokeStyle = '#b7e6ee';
        rover.stroke();
      }
    }
    rover.beginPath();
    rover.roundRect(-19, -10, 38, 20, 6);
    rover.fillStyle = body;
    rover.fill();
    rover.shadowBlur = 0;
    rover.strokeStyle = '#e7fdff';
    rover.stroke();
    rover.strokeStyle = '#beeaffcb';
    rover.beginPath();
    rover.moveTo(-13, -4);
    rover.lineTo(-7, -4);
    rover.lineTo(-3, 0);
    rover.lineTo(-13, 0);
    rover.lineTo(-13, 4);
    rover.lineTo(6, 4);
    rover.stroke();
    rover.beginPath();
    rover.roundRect(1, -7, 13, 14, 4);
    rover.fillStyle = '#345d84d9';
    rover.fill();
    rover.strokeStyle = '#c5f4ff';
    rover.stroke();
    rover.fillStyle = '#d7fcff';
    rover.beginPath();
    rover.arc(11, 0, 2.8, 0, Math.PI * 2);
    rover.fill();
    rover.restore();
  }

  function update() {
    frame = 0;
    rover.clearRect(0, 0, rover.canvas.width, rover.canvas.height);
    const heroBottom = hero.getBoundingClientRect().bottom + scrollY;
    const departure = Math.max(1, heroBottom - innerHeight * .58);
    const arrival = departure + Math.min(innerHeight * .28, 200);
    const end = Math.max(arrival, document.documentElement.scrollHeight - innerHeight);
    const offset = Math.min(170, innerHeight * .22);
    const scrollStops = sections.map((section, index) => {
      if (index === 0) return arrival;
      if (index === sections.length - 1) return end;
      return Math.max(arrival, Math.min(end, section.getBoundingClientRect().top + scrollY - offset));
    });
    const segment = scrollStops.findIndex(position => position > scrollY) - 1;
    const railProgress = scrollY <= arrival ? 0 : scrollY >= end ? 1 :
      (segment + clamp((scrollY - scrollStops[segment]) / (scrollStops[segment + 1] - scrollStops[segment]))) /
        (scrollStops.length - 1);
    const heroSize = narrow.matches ? 33 : 49;
    const railSize = narrow.matches ? 18 : 29;
    const transfer = clamp((scrollY - departure) / (arrival - departure));
    rail.style.setProperty('--terrain-reveal', clamp(transfer * 1.8));
    rail.inert = motion.matches || transfer === 0;
    if (motion.matches) return;

    const active = sections.reduce((current, section, index) =>
      section.getBoundingClientRect().top <= innerHeight * .42 ? index : current, 0);
    stops.forEach((stop, index) => {
      if (index === active) stop.setAttribute('aria-current', 'location');
      else stop.removeAttribute('aria-current');
    });

    if (transfer === 0) {
      drawRover(screenPose(layers[0], heroScene, scrollY / departure), heroSize);
      return;
    }
    const destination = screenPose(layers[1], railScene, railProgress);
    if (transfer === 1) {
      drawRover(destination, railSize);
      return;
    }
    const start = screenPose(layers[0], heroScene, 1);
    const eased = transfer * transfer * (3 - 2 * transfer);
    drawRover({
      ...destination,
      x: start.x + (destination.x - start.x) * eased,
      y: start.y + (destination.y - start.y) * eased,
      heading: start.heading + Math.atan2(Math.sin(destination.heading - start.heading),
        Math.cos(destination.heading - start.heading)) * eased,
      rocks: []
    }, heroSize + (railSize - heroSize) * eased);
  }

  function layout() {
    rail.hidden = motion.matches;
    const compact = narrow.matches;
    const railBounds = rail.getBoundingClientRect();
    const heroBounds = hero.getBoundingClientRect();
    const exitX = motion.matches ? .06 : (railBounds.left + railBounds.width * .5) / heroBounds.width;
    const heroRoute = compact
      ? [[.96, .36], [.95, .61], [.96, .82], [.84, .94], [.58, .95], [.33, .92], [exitX, .96]]
      : [[.51, .43], [.49, .61], [.51, .78], [.46, .93], [.33, .96], [.17, .90], [exitX, .96]];
    heroScene = makeScene(heroMap, heroRoute, true);
    if (!motion.matches) railScene = makeScene(railMap, railStops, false);
    const density = Math.min(devicePixelRatio || 1, 2);
    const bounds = rover.canvas.getBoundingClientRect();
    rover.canvas.width = Math.max(1, Math.round(bounds.width * density));
    rover.canvas.height = Math.max(1, Math.round(bounds.height * density));
    rover.setTransform(density, 0, 0, density, 0, 0);
    update();
  }

  stops.forEach((stop, index) => {
    const [x, y] = railStops[index];
    stop.style.setProperty('--stop-x', x * 100 + '%');
    stop.style.setProperty('--stop-y', y * 100 + '%');
  });
  document.body.classList.add('terrain-active');
  addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
  const observer = new ResizeObserver(layout);
  observer.observe(hero);
  addEventListener('resize', layout);
  motion.addEventListener('change', layout);
  layout();
})();
