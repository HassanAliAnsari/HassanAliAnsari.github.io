(() => {
  const road = document.querySelector('.portfolio-road');
  if (!road) return;
  const stops = [...road.querySelectorAll('a')];
  const sections = stops.map(stop => document.getElementById(stop.hash.slice(1)));
  if (sections.some(section => !section)) return;
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
