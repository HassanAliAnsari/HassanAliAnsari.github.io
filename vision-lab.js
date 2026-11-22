(() => {
  const lab = document.querySelector('#vision-lab');
  if (!lab) return;
  const image = lab.querySelector('.vision-stage img');
  const canvas = lab.querySelector('canvas');
  const view = canvas.getContext('2d');
  if (!view) return;
  const controls = lab.querySelector('.vision-controls');
  const comparison = lab.querySelector('.vision-compare');
  const slider = comparison.querySelector('input');
  const readout = lab.querySelector('#vision-mode-description');
  const descriptions = {
    rgb: 'RGB preserves color and texture, from the lens reflections to the surface of the glass prism.',
    edges: 'A Sobel filter highlights abrupt changes in brightness. The bright outlines trace boundaries, reflections, and texture.',
    features: 'The crosses mark corners with strong brightness changes in two directions. Points like these can help match details across frames.'
  };
  let source;
  let renderedModes;
  let mode = 'rgb';

  function buildModes() {
    const width = source.width;
    const height = source.height;
    const pixels = source.getContext('2d').getImageData(0, 0, width, height).data;
    const gray = new Float32Array(width * height);
    const gx = new Float32Array(gray.length);
    const gy = new Float32Array(gray.length);
    const edges = view.createImageData(width, height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = pixels[i * 4] * 0.2126 + pixels[i * 4 + 1] * 0.7152 + pixels[i * 4 + 2] * 0.0722;
    }
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        gx[i] = gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1] -
          gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1];
        gy[i] = gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1] -
          gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1];
      }
    }
    for (let i = 0; i < gray.length; i++) {
      const edge = Math.min(1, Math.max(0, (Math.hypot(gx[i], gy[i]) - 12) / 235));
      edges.data.set([10 + edge * 134, 16 + edge * 189, 37 + edge * 218, 255], i * 4);
    }
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = width;
    edgeCanvas.height = height;
    edgeCanvas.getContext('2d').putImageData(edges, 0, 0);

    const candidates = [];
    for (let y = 10; y < height - 10; y += 3) {
      for (let x = 10; x < width - 10; x += 3) {
        let xx = 0, yy = 0, xy = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const i = (y + dy) * width + x + dx;
            xx += gx[i] ** 2;
            yy += gy[i] ** 2;
            xy += gx[i] * gy[i];
          }
        }
        const score = (xx + yy - Math.hypot(xx - yy, 2 * xy)) / 2;
        if (score > 1600) candidates.push({ x, y, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const corners = [];
    for (const point of candidates) {
      if (corners.every(p => Math.hypot(p.x - point.x, p.y - point.y) > 21)) corners.push(point);
      if (corners.length >= 80) break;
    }

    const featureCanvas = document.createElement('canvas');
    featureCanvas.width = width;
    featureCanvas.height = height;
    const ctx = featureCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0);
    ctx.fillStyle = '#1113379e';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#9dfbf0';
    ctx.lineWidth = 1.5;
    for (const { x, y } of corners) {
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    }
    return { edges: edgeCanvas, features: featureCanvas };
  }

  function render() {
    canvas.hidden = mode === 'rgb';
    comparison.hidden = mode === 'rgb';
    if (mode === 'rgb') return;
    renderedModes ??= buildModes();
    view.drawImage(renderedModes[mode], 0, 0);
    const revealed = Math.round(canvas.width * Number(slider.value) / 100);
    if (revealed <= 0) return;
    view.drawImage(source, 0, 0, revealed, canvas.height, 0, 0, revealed, canvas.height);
    if (revealed < canvas.width) {
      view.fillStyle = '#d4e0ff';
      view.fillRect(revealed - 1, 0, 2, canvas.height);
    }
  }

  function init() {
    if (!image.naturalWidth || source) return;
    source = document.createElement('canvas');
    source.width = Math.min(image.naturalWidth, 880);
    source.height = Math.round(image.naturalHeight * source.width / image.naturalWidth);
    source.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, source.width, source.height);
    canvas.width = source.width;
    canvas.height = source.height;
    controls.hidden = false;
    controls.addEventListener('click', event => {
      const button = event.target.closest('button[data-mode]');
      if (!button || button.dataset.mode === mode) return;
      mode = button.dataset.mode;
      for (const option of controls.querySelectorAll('button')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      readout.textContent = descriptions[mode];
      render();
    });
    slider.addEventListener('input', render);
  }

  if (image.complete) init();
  else image.addEventListener('load', init, { once: true });
})();
