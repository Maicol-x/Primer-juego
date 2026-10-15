import * as THREE from 'three';

/**
 * Generador de texturas procedurales HD (1024x1024 y 2048x2048)
 * Gráficos de alta fidelidad estilo 2020+ (Halo 4 / Sci-Fi / Resident Evil)
 * Sin dependencias externas, totalmente nítidas y optimizadas para materiales PBR.
 */

/**
 * Textura HD de Armadura Spartan / Mech Humanoide (1024x1024)
 * Placas cerámicas de titanio, micro-trama hexagonal, biseles de protección, serigrafía militar
 */
export function createHDArmorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Capa base de titanio perlado
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Micro-ruido de fibra de carbono y motas metálicas
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n + 2));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Patrón hexagonal nano-compuesto MJOLNIR
  const hexRadius = 18;
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = 2 * hexRadius;
  const rowHeight = hexHeight * 0.75;

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.4;

  for (let y = -hexRadius; y < 1024 + hexRadius; y += rowHeight) {
    const isOdd = Math.round(y / rowHeight) % 2 !== 0;
    const xOffset = isOdd ? hexWidth / 2 : 0;

    for (let x = -hexWidth; x < 1024 + hexWidth; x += hexWidth) {
      const cx = x + xOffset;
      const cy = y;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = cx + hexRadius * Math.cos(angle);
        const hy = cy + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // 4. Juntas mecánicas de paneles y biseles angulares
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 960, 960);
  ctx.strokeRect(64, 64, 896, 896);

  // 5. Serigrafía militar táctica (Halo UNSC / Spartan)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px "JetBrains Mono", monospace';
  ctx.fillText('UNSC // SPARTAN-IV [117]', 90, 140);

  ctx.font = '20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('TACTICAL COMBAT CHASSIS · GEN-3', 90, 180);
  ctx.fillText('HYDRAULIC FORCE: 6800 N · COMPOSITE ARMOR', 90, 210);

  // Franjas de advertencia de emergencia
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(820, 100, 100, 16);
  ctx.fillRect(820, 130, 100, 16);

  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DANGER', 840, 114);

  // Rejillas de ventilación técnicas
  ctx.fillStyle = '#1e293b';
  for (let r = 0; r < 8; r++) {
    ctx.fillRect(90, 800 + r * 18, 300, 10);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura HD para Armas Tácticas (1024x1024)
 * Metal pavonado negro mate, rayado técnico, ranuras Picatinny y fibra de carbono
 */
export function createHDWeaponTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Pavonado oscuro de armería
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Micro-arañazos y desgaste de combate en bordes
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain + 2));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Ranuras del riel Picatinny táctico
  ctx.fillStyle = '#05080e';
  for (let x = 40; x < 980; x += 32) {
    ctx.fillRect(x, 100, 18, 120);
  }

  // 4. Grip de textura en panal para la empuñadura
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
  ctx.lineWidth = 2;
  for (let y = 400; y < 800; y += 24) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(480, y);
    ctx.stroke();
  }

  // Marcas de calibre y serigrafía
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillText('BR55-HB // 9.5x40mm HP-SAP', 80, 300);
  ctx.font = '16px "JetBrains Mono", monospace';
  ctx.fillText('MISRIAH ARMORY · SEMI/BURST/AUTO', 80, 330);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura HD del Asfalto y Campo de Batalla (2048x2048)
 * Pavimento militar desgastado con charcos reflectantes, rejillas de drenaje y líneas de helipuerto
 */
export function createModernAsphaltTexture(maxAnisotropy: number = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Asfalto táctico oscuro
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Micro-ruido mineral de grava y hormigón
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 26;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain + 4));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Charcos de lluvia oscuros y profundos (altamente reflectantes en PBR)
  ctx.fillStyle = 'rgba(4, 7, 14, 0.65)';
  for (let p = 0; p < 36; p++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const prx = 40 + Math.random() * 95;
    const pry = 30 + Math.random() * 75;
    ctx.beginPath();
    ctx.ellipse(px, py, prx, pry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Juntas de dilatación de hormigón militar
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4;
  const step = 128;
  for (let x = 0; x < 1024; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y < 1024; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 5. Señalizaciones tácticas amarillas de advertencia perimetral
  ctx.save();
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
  ctx.lineWidth = 14;
  ctx.strokeRect(48, 48, 928, 928);

  // Letras tácticas de helipuerto en el centro
  ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.font = 'bold 72px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SECTOR 04 // DEFENSE ZONE', 512, 512);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  return texture;
}

/**
 * Mapa de rugosidad para dar reflejos húmedos en zonas de charcos
 */
export function createAsphaltRoughnessMap(maxAnisotropy: number = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#111111';
  for (let p = 0; p < 32; p++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    ctx.beginPath();
    ctx.ellipse(px, py, 30 + Math.random() * 50, 20 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.anisotropy = maxAnisotropy;

  return texture;
}

/**
 * Textura HD para el Búnker y Base Central (1024x1024)
 * Placas de acero blindado con remaches hexagonales y franjas de precaución
 */
export function createHDBaseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Acero balístico militar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1024, 1024);

  // Líneas de paneles de blindaje
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(32, 32, 960, 960);
  ctx.strokeRect(128, 128, 768, 768);

  // Remaches de titanio en los bordes
  ctx.fillStyle = '#94a3b8';
  for (let x = 64; x < 960; x += 64) {
    ctx.beginPath();
    ctx.arc(x, 48, 6, 0, Math.PI * 2);
    ctx.arc(x, 976, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 64; y < 960; y += 64) {
    ctx.beginPath();
    ctx.arc(48, y, 6, 0, Math.PI * 2);
    ctx.arc(976, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Franjas de advertencia amarillas y negras en diagonal
  ctx.save();
  ctx.beginPath();
  ctx.rect(128, 128, 768, 80);
  ctx.clip();
  for (let x = -200; x < 1200; x += 50) {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 25, 128);
    ctx.lineTo(x - 15, 208);
    ctx.lineTo(x - 40, 208);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura HD para Zombies Infectados (512x512)
 * Piel putrefacta con venas infectadas, carne viva y necrosis
 */
export function createHDZombieTexture(type: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  let baseColor = '#334155';
  let veinColor = '#dc2626';

  if (type === 'runner') {
    baseColor = '#7f1d1d';
    veinColor = '#f59e0b';
  } else if (type === 'brute' || type === 'boss') {
    baseColor = '#2e1065';
    veinColor = '#9333ea';
  } else if (type === 'spitter') {
    baseColor = '#14532d';
    veinColor = '#84cc16';
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Micro-textura orgánica necrosada
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 35;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Venas y heridas sangrantes
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = 2.5;
  for (let v = 0; v < 16; v++) {
    ctx.beginPath();
    let vx = Math.random() * 512;
    let vy = Math.random() * 512;
    ctx.moveTo(vx, vy);
    for (let seg = 0; seg < 6; seg++) {
      vx += (Math.random() - 0.5) * 60;
      vy += (Math.random() - 0.5) * 60;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Manchas de pudrición oscura
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let m = 0; m < 20; m++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 30, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura de mancha de sangre orgánica con salpicaduras direccionales
 */
export function createVisceralBloodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
  grad.addColorStop(0, '#550000');
  grad.addColorStop(0.5, '#770000');
  grad.addColorStop(0.85, '#990000');
  grad.addColorStop(1, 'rgba(120, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#660000';
  for (let s = 0; s < 18; s++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 75;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const rad = 6 + Math.random() * 18;

    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Textura de cráter y quemadura de plasma / explosión
 */
export function createPlasmaScorchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.2, '#0f172a');
  grad.addColorStop(0.65, '#05070a');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSpartanArmorTexture(): THREE.CanvasTexture {
  return createHDArmorTexture();
}

export function createCarbonArmorTexture(): THREE.CanvasTexture {
  return createHDArmorTexture();
}
