(() => {
  const road = document.querySelector('.portfolio-road');
  if (!road) return;
  const stops = [...road.querySelectorAll('a')];
  const sections = stops.map(stop => document.getElementById(stop.hash.slice(1)));
  if (sections.some(section => !section)) return;
  const map = road.querySelector('.road-map');
  const context = map?.getContext('2d');
  const car = road.querySelector('.road-car');
  const desktop = matchMedia('(min-width: 1041px)');
  const mapWidth = 100;
  const mapHeight = 500;
  const waypoints = [[50, 26], [72, 138], [28, 250], [72, 362], [50, 474]];
  const route = waypoints.slice(0, -1).map(([x, y], index) => {
    const [nextX, nextY] = waypoints[index + 1];
    return [[x, y], [x, y + 45], [nextX, nextY - 45], [nextX, nextY]];
  });

  function trace(t) {
    const segment = Math.min(route.length - 1, Math.floor(t));
    const f = t - segment;
    const u = 1 - f;
    const [a, b, c, d] = route[segment];
    return a.map((value, axis) => u ** 3 * value + 3 * u ** 2 * f * b[axis] +
      3 * u * f ** 2 * c[axis] + f ** 3 * d[axis]);
  }

  function drawRoad(t) {
    if (!context || !desktop.matches) return;
    const { width, height } = map.getBoundingClientRect();
    if (!width || !height) return;
    const density = Math.min(devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * density);
    const pixelsHigh = Math.round(height * density);
    if (map.width !== pixelsWide || map.height !== pixelsHigh) {
      map.width = pixelsWide;
      map.height = pixelsHigh;
    }
    context.setTransform(pixelsWide / mapWidth, 0, 0, pixelsHigh / mapHeight, 0, 0);
    context.clearRect(0, 0, mapWidth, mapHeight);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(...waypoints[0]);
    for (const [, b, c, d] of route) context.bezierCurveTo(...b, ...c, ...d);
    context.lineWidth = 23;
    context.strokeStyle = '#e0e8f6';
    context.stroke();
    context.lineWidth = 19;
    context.strokeStyle = '#f1f5fb';
    context.stroke();
    context.lineWidth = 1.6;
    context.setLineDash([4, 6]);
    context.strokeStyle = '#98a9cf';
    context.stroke();
    context.setLineDash([]);

    for (const [x, y] of [[23, 79], [79, 192], [21, 306], [28, 419]]) {
      context.beginPath();
      context.roundRect(x - 9, y - 16, 18, 32, 8);
      context.fillStyle = '#dcebe5';
      context.fill();
      context.strokeStyle = '#a8bdb6';
      context.lineWidth = 1;
      context.stroke();
      context.beginPath();
      context.roundRect(x - 4, y - 10, 8, 20, 4);
      context.fillStyle = '#a5c8bb';
      context.fill();
    }

    const [x, y] = trace(t);
    const [aheadX, aheadY] = trace(Math.min(route.length, t + 0.015));
    const [behindX, behindY] = trace(Math.max(0, t - 0.015));
    const heading = Math.atan2((aheadY - behindY) * height / mapHeight,
      (aheadX - behindX) * width / mapWidth) - Math.PI / 2;
    car.style.setProperty('--car-x', `${x / mapWidth * 100}%`);
    car.style.setProperty('--car-y', `${y / mapHeight * 100}%`);
    car.style.setProperty('--car-heading', `${heading}rad`);
  }

  if (context) {
    road.classList.add('has-curves');
    stops.forEach((stop, index) => {
      const [x, y] = waypoints[index];
      stop.style.setProperty('--road-x', `${x / mapWidth * 100}%`);
      stop.style.setProperty('--road-y', `${y / mapHeight * 100}%`);
    });
  }
  let frame = 0;
  let current = -1;

  function update() {
    frame = 0;
    const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const y = Math.min(Math.max(scrollY, 0), end);
    const offset = Math.min(innerHeight * 0.22, 160);
    const positions = sections.map((section, index) => index === 0 ? 0 :
      Math.max(0, Math.min(end, section.getBoundingClientRect().top + scrollY - offset)));
    const contactStart = positions.at(-1);
    positions[positions.length - 1] = end;

    let index = 0;
    while (index < positions.length - 1 && y >= positions[index + 1] - 1) index++;
    const next = Math.min(index + 1, positions.length - 1);
    const span = positions[next] - positions[index];
    const fraction = span > 0 ? Math.max(0, Math.min(1, (y - positions[index]) / span)) : 0;
    road.style.setProperty('--drive', `${(index + fraction) / (stops.length - 1) * 100}%`);
    drawRoad(index + fraction);

    const active = y >= contactStart - 1 && end > 0 ? stops.length - 1 : index;
    if (active !== current) {
      stops[current]?.removeAttribute('aria-current');
      stops[active].setAttribute('aria-current', 'location');
      current = active;
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  update();
})();
