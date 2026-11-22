(() => {
  const canvas = document.querySelector('.perception-scene canvas');
  const context = canvas?.getContext('2d');
  if (!context) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let visible = true;

  function draw() {
    frame = 0;
    const bounds = canvas.getBoundingClientRect();
    const { width, height } = bounds;
    if (!width || !height) return;
    const density = Math.min(devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, width, height);

    const scale = Math.min(width / 1160, height / 235);
    const progress = reducedMotion.matches ? 0.5 :
      Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + height)));
    const travel = (progress - 0.5) * 490;
    const project = ([x, y, z = 0]) => [
      width * 0.5 + (x - y * 0.48) * scale,
      height * 0.57 + (x * 0.14 + y * 0.45 - z) * scale
    ];

    function path(points, stroke, fill) {
      context.beginPath();
      points.forEach((point, index) => {
        const [x, y] = project(point);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      if (fill) {
        context.closePath();
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke) {
        context.strokeStyle = stroke;
        context.stroke();
      }
    }

    for (let x = -1800; x <= 1800; x += 56) {
      path([[x, -440], [x, 450]], '#a3b4fa17');
    }
    for (let y = -440; y <= 450; y += 40) {
      path([[-1800, y], [1800, y]], '#a3b4fa17');
    }
    path([[-1800, -162], [1800, -162], [1800, 162], [-1800, 162]], '#91a8f547', '#101737aa');
    context.setLineDash([16 * scale, 15 * scale]);
    path([[-1800, 0], [1800, 0]], '#97abfa80');
    context.setLineDash([]);

    function vehicle(x, y, shape, color) {
      const footprint = [[-8, -9], [shape.length + 9, -9], [shape.length + 9, 72], [-8, 72]];
      const points = coordinates => coordinates.map(([a, b, c = 0]) => [x + a, y + b, c]);
      const line = (coordinates, opacity) => path(points(coordinates), color + opacity);
      const face = (coordinates, opacity) => path(points(coordinates), color + 'd6', color + opacity);

      context.setLineDash([4 * scale, 5 * scale]);
      line([...footprint, footprint[0]], 'aa');
      context.setLineDash([]);

      for (const axle of shape.axles) {
        for (const side of [0, 63]) {
          const wheel = Array.from({ length: 18 }, (_, index) => {
            const angle = index / 18 * Math.PI * 2;
            return [axle + Math.cos(angle) * 12, side, 13 + Math.sin(angle) * 12];
          });
          face(wheel, '36');
        }
      }

      const drawShell = profile => {
        const side = (depth) => profile.map(([a, z]) => [a, depth, z]);
        face(side(0), '19');
        for (let i = 1; i < profile.length; i++) {
          const [a, z] = profile[i - 1];
          const [b, w] = profile[i];
          if (z === 12 && w === 12) continue;
          face([[a, 0, z], [b, 0, w], [b, 63, w], [a, 63, z]], '33');
        }
        face(side(63), '24');
      };
      shape.shells.forEach(drawShell);
      for (const axle of shape.axles) {
        line([[axle - 15, 64, 13], [axle - 9, 64, 23], [axle + 9, 64, 23], [axle + 15, 64, 13]], 'de');
      }
    }

    const car = {length: 150, axles: [29, 120], shells: [
      [[0, 12], [0, 29], [26, 34], [45, 55], [92, 55], [113, 35], [150, 29], [150, 12]]
    ]};
    const truck = {length: 243, axles: [25, 58, 171, 219], shells: [
      [[0, 12], [0, 70], [166, 70], [166, 12]],
      [[172, 12], [172, 67], [214, 67], [236, 53], [243, 30], [243, 12]]
    ]};
    vehicle(118 - travel * 0.72, -123, car, '#a7d4ff');
    vehicle(-267 + travel, 38, truck, '#ad9cff');
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  new ResizeObserver(schedule).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
  }).observe(canvas);
  addEventListener('scroll', () => {
    if (visible && !reducedMotion.matches) schedule();
  }, { passive: true });
  reducedMotion.addEventListener('change', schedule);
  schedule();
})();
