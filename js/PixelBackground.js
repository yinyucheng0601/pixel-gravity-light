/**
 * PixelBackground - 点阵引力 + 蓝紫色光照 + 动态边缘发光
 * 背景视效层，绑定到指定 canvas 元素
 */
const _lerp = (start, end, t) => start * (1 - t) + end * t;
const _num = (v, d) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : d;
};
const _hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(v => Number.isNaN(v))) return null;
  return [r, g, b];
};
const _rgbStringToArray = (s) => {
  if (typeof s !== 'string') return null;
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(',').map(x => parseFloat(x.trim())).slice(0, 3);
  if (parts.length !== 3 || parts.some(v => !Number.isFinite(v))) return null;
  return parts;
};
const _parseColor = (v, d) => {
  if (Array.isArray(v) && v.length === 3) return v;
  return _hexToRgb(v) || _rgbStringToArray(v) || d;
};
class PixelBackground {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl?.getContext('2d');
    if (!this.ctx) throw new Error('PixelBackground: 需要有效的 canvas 元素');

    // 点阵间距（越大越稀疏）
    this.spacing = options.spacing ?? 28;
    this.lightRadius = options.lightRadius ?? 380;
    // 光标引力强度（越小扭曲越弱）
    this.gravityStrength = options.gravityStrength ?? 0.25;
    this.defaultDotAlpha = options.defaultDotAlpha ?? 0.05;

    this.particles = [];
    this.time = 0;
    this.mouse = { x: -1000, y: -1000, active: false };
    this.width = 0;
    this.height = 0;
    this.rafId = null;

    this.ripples = [];
    const ds = this.canvas?.dataset || {};
    this.ripple = {
      thickness: _num(options?.ripple?.thickness ?? ds.rippleThickness, 80),
      strength: _num(options?.ripple?.strength ?? ds.rippleStrength, 25),
      velocity: _num(options?.ripple?.velocity ?? ds.rippleVelocity, 6),
      decay: _num(options?.ripple?.decay ?? ds.rippleDecay, 0.005)
    };
    this.colors = {
      purple: _parseColor(options?.colors?.purple ?? ds.colorPurple, [180, 70, 255]),
      white: _parseColor(options?.colors?.white ?? ds.colorWhite, [255, 255, 255]),
      blue: _parseColor(options?.colors?.blue ?? ds.colorBlue, [70, 130, 255])
    };

    // 启动涟漪效果配置
    this.introRipple = {
      active: true,
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      startTime: 1,
      waveCount: 3,          // 扩散三次
      period: 6.0,           // 每次大约 3 秒
      thickness: 80,         // 波纹带宽度
      strength: 30,          // 对像素点的位移强度
      brightnessBoost: 1   // 对亮度的增强倍数
    };

    this._bindEvents();
  }

  setRippleOptions(partial = {}) {
    const ds = {};
    this.ripple = {
      thickness: _num(partial.thickness ?? this.ripple.thickness, this.ripple.thickness),
      strength: _num(partial.strength ?? this.ripple.strength, this.ripple.strength),
      velocity: _num(partial.velocity ?? this.ripple.velocity, this.ripple.velocity),
      decay: _num(partial.decay ?? this.ripple.decay, this.ripple.decay)
    };
  }

  setColors(partial = {}) {
    this.colors = {
      purple: _parseColor(partial.purple ?? this.colors.purple, this.colors.purple),
      white: _parseColor(partial.white ?? this.colors.white, this.colors.white),
      blue: _parseColor(partial.blue ?? this.colors.blue, this.colors.blue)
    };
  }

  _bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;

      // 用户移动光标后，打断启动涟漪
      if (this.introRipple?.active) {
        this.introRipple.active = false;
      }
    });
    window.addEventListener('resize', () => this.init());
  }

  init() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.particles = [];

    for (let y = 0; y < this.height; y += this.spacing) {
      for (let x = 0; x < this.width; x += this.spacing) {
        const alpha = Math.random() * 0.5 + 0.1;
        const breathe = Math.random() < 0.1;
        const phase = Math.random() * Math.PI * 2;
        // 每个像素独立的缓慢闪烁速度
        const flickerSpeed = 0.8 + Math.random() * 0.6; // 大约 5–10 秒一个完整周期
        this.particles.push({
          baseX: x,
          baseY: y,
          x,
          y,
          alpha,
          breathe,
          phase,
          flickerSpeed
        });
      }
    }
  }

  triggerRipple(opts = {}) {
    const x = opts.x ?? window.innerWidth / 2;
    const y = opts.y ?? window.innerHeight / 2;
    const maxR = opts.maxR ?? Math.max(window.innerWidth, window.innerHeight) * 0.8;
    const velocity = opts.velocity ?? this.ripple.velocity;
    const opacity = opts.opacity ?? 1;
    this.ripples.push({ x, y, r: 0, maxR, velocity, opacity });
  }

  /**
   * 设置启动涟漪的中心点（通常为输入框所在位置的中心）
   */
  setIntroCenter(x, y) {
    if (!this.introRipple) return;
    this.introRipple.centerX = x;
    this.introRipple.centerY = y;
    this.introRipple.startTime = this.time;
    this.introRipple.active = true;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ripples = this.ripples
      .map(r => ({ ...r, r: r.r + r.velocity, opacity: r.opacity - this.ripple.decay }))
      .filter(r => r.opacity > 0 && r.r < r.maxR);

    // 启动涟漪：计算当前有哪些波前在场
    const ir = this.introRipple;
    let activeWaves = [];
    if (ir && ir.active && ir.centerX != null && ir.centerY != null) {
      const maxR = Math.sqrt(this.width * this.width + this.height * this.height);
      const totalDuration = ir.waveCount * ir.period;
      const t = this.time - ir.startTime;

      if (t > totalDuration) {
        ir.active = false;
      } else if (t >= 0) {
        for (let i = 0; i < ir.waveCount; i++) {
          const phase = t - i * ir.period;
          if (phase >= 0 && phase <= ir.period) {
            const radius = (phase / ir.period) * maxR;
            activeWaves.push(radius);
          }
        }
      }
    }

    this.particles.forEach(p => {
      const dx = this.mouse.x - p.baseX;
      const dy = this.mouse.y - p.baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let targetX = p.baseX;
      let targetY = p.baseY;

      let finalRgba = null;
      if (this.ripples.length) {
        for (let i = 0; i < this.ripples.length; i++) {
          const rip = this.ripples[i];
          const rdx = p.baseX - rip.x;
          const rdy = p.baseY - rip.y;
          const dist = Math.sqrt(rdx * rdx + rdy * rdy);
          const thickness = this.ripple.thickness;
          if (dist > rip.r - thickness / 2 && dist < rip.r + thickness / 2) {
            const angle = Math.atan2(rdy, rdx);
            const normalizedPos = (dist - (rip.r - thickness / 2)) / thickness; // 0..1
            const peakIntensity = Math.pow(1 - Math.abs(normalizedPos - 0.5) * 2, 3);
            const distortion = peakIntensity * this.ripple.strength * rip.opacity;
            targetX += Math.cos(angle) * distortion;
            targetY += Math.sin(angle) * distortion;

            const { purple, white, blue } = this.colors;
            let r, g, b;
            if (normalizedPos < 0.5) {
              const t = normalizedPos * 2;
              r = _lerp(purple[0], white[0], t);
              g = _lerp(purple[1], white[1], t);
              b = _lerp(purple[2], white[2], t);
            } else {
              const t = (normalizedPos - 0.5) * 2;
              r = _lerp(white[0], blue[0], t);
              g = _lerp(white[1], blue[1], t);
              b = _lerp(white[2], blue[2], t);
            }
            let finalA = Math.min(1, rip.opacity * peakIntensity * 1.5);
            if (finalA > 0.01) {
              finalRgba = [r, g, b, finalA];
            }
          }
        }
      }

      // 启动涟漪对像素点的扭曲与照亮
      let introBoost = 0;
      if (activeWaves.length && ir && ir.active) {
        const cx = ir.centerX;
        const cy = ir.centerY;
        const pdx = p.baseX - cx;
        const pdy = p.baseY - cy;
        const distToCenter = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
        const dirX = pdx / distToCenter;
        const dirY = pdy / distToCenter;

        activeWaves.forEach(radius => {
          const band = 1 - Math.abs(distToCenter - radius) / ir.thickness;
          if (band > 0) {
            const eased = band * band; // 柔和一点
            introBoost = Math.max(introBoost, eased);
            targetX += dirX * eased * ir.strength;
            targetY += dirY * eased * ir.strength;
          }
        });
      }

      if (distance < this.lightRadius * 1.4) {
        const force = (this.lightRadius * 1.4 - distance) / (this.lightRadius * 1.4);
        targetX += dx * force * this.gravityStrength;
        targetY += dy * force * this.gravityStrength;
      }

      p.x += (targetX - p.x) * 0.1;
      p.y += (targetY - p.y) * 0.1;

      if (finalRgba) {
        this.ctx.fillStyle = `rgba(${finalRgba[0] | 0}, ${finalRgba[1] | 0}, ${finalRgba[2] | 0}, ${finalRgba[3]})`;
        const size = 2 + finalRgba[3] * 1.5;
        this.ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        return;
      }

      const opacity = Math.max(0, 1 - distance / this.lightRadius);

      // 统一的缓慢闪烁透明度（0.4 ~ 1.0 倍）
      const flickerBase = 0.5 + 0.5 * Math.sin(this.time * p.flickerSpeed + p.phase);
      const flickerFactor = 0.4 + 0.6 * flickerBase;

      // 启动涟漪对亮度的加成（只在启动阶段生效）
      const introBrightness = 3 + (introBoost * (ir ? ir.brightnessBoost : 0));

      // 基础白点：尺寸减半，透明度缓慢闪烁
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.defaultDotAlpha * flickerFactor * introBrightness})`;
      this.ctx.fillRect(p.x, p.y, 1, 1);

      if (p.breathe) {
        const breath = 0.5 + 0.5 * Math.sin(this.time * 0.6 + p.phase);
        const glowAlpha = (0.08 + breath * 0.2) * flickerFactor * introBrightness;
        this.ctx.fillStyle = `rgba(220, 235, 255, ${glowAlpha})`;
        // 呼吸光晕尺寸也减半
        this.ctx.fillRect(p.x - 0.5, p.y - 0.5, 2, 2);
      }

      if (opacity > 0) {
        const shift = (1 - opacity) * 5;
        // 彩色偏移高光：尺寸减半，并随闪烁同步变化
        this.ctx.fillStyle = `rgba(0, 223, 255, ${opacity * p.alpha * 0.95 * flickerFactor * introBrightness})`;
        this.ctx.fillRect(p.x - shift, p.y, 1, 1);
        this.ctx.fillStyle = `rgba(180, 100, 255, ${opacity * p.alpha * 0.5 * flickerFactor * introBrightness})`;
        this.ctx.fillRect(p.x + shift, p.y, 1, 1);
        this.ctx.fillStyle = `rgba(0, 223, 255, ${opacity * 0.9 * flickerFactor * introBrightness})`;
        this.ctx.fillRect(p.x, p.y, 1, 1);
      }
    });

    this._drawEdgeGlow();
    this.time += 0.015;
    this.rafId = requestAnimationFrame(() => this.animate());
  }

  _drawEdgeGlow() {
    const { width, height } = this;
    const baseWidth = 80;
    const widthWave = 70;

    const breath = Math.sin(this.time * 0.4) * 0.5 + 0.5;
    const flow1 = Math.sin(this.time * 0.9) * 0.5 + 0.5;
    const flow2 = Math.sin(this.time * 1.2 + 2.1) * 0.5 + 0.5;
    const flow3 = Math.sin(this.time * 0.6 + 4.2) * 0.5 + 0.5;

    const cursorZone = 400;
    const reactTop = Math.max(0, 1 - this.mouse.y / cursorZone);
    const reactBottom = Math.max(0, 1 - (height - this.mouse.y) / cursorZone);
    const reactLeft = Math.max(0, 1 - this.mouse.x / cursorZone);
    const reactRight = Math.max(0, 1 - (width - this.mouse.x) / cursorZone);

    const topWidth = baseWidth + widthWave * (0.3 + 0.7 * breath) * (0.6 + 0.4 * flow1) + reactTop * 60;
    const bottomWidth = baseWidth + widthWave * (0.3 + 0.7 * flow2) * (0.6 + 0.4 * breath) + reactBottom * 60;
    const leftWidth = baseWidth + widthWave * (0.3 + 0.7 * flow3) * (0.6 + 0.4 * flow1) + reactLeft * 60;
    const rightWidth = baseWidth + widthWave * (0.3 + 0.7 * flow1) * (0.6 + 0.4 * flow2) + reactRight * 60;

    const baseIntensity = 0.06;
    const topIntensity = baseIntensity * (0.7 + 0.5 * breath) * (1 + reactTop * 1.2);
    const bottomIntensity = baseIntensity * (0.7 + 0.5 * flow2) * (1 + reactBottom * 1.2);
    const leftIntensity = baseIntensity * (0.7 + 0.5 * flow3) * (1 + reactLeft * 1.2);
    const rightIntensity = baseIntensity * (0.7 + 0.5 * flow1) * (1 + reactRight * 1.2);

    const blue = '0, 223, 255';
    const purple = '150, 100, 255';

    const grad = (dir, w, i) => {
      const g = dir === 'top' ? this.ctx.createLinearGradient(0, 0, 0, w)
        : dir === 'bottom' ? this.ctx.createLinearGradient(0, height, 0, height - w)
        : dir === 'left' ? this.ctx.createLinearGradient(0, 0, w, 0)
        : this.ctx.createLinearGradient(width, 0, width - w, 0);
      g.addColorStop(0, `rgba(${blue}, ${i * 0.9})`);
      g.addColorStop(0.4, `rgba(${purple}, ${i * 0.4})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      return g;
    };

    this.ctx.fillStyle = grad('top', topWidth, topIntensity);
    this.ctx.fillRect(0, 0, width, topWidth);
    this.ctx.fillStyle = grad('bottom', bottomWidth, bottomIntensity);
    this.ctx.fillRect(0, height - bottomWidth, width, bottomWidth);
    this.ctx.fillStyle = grad('left', leftWidth, leftIntensity);
    this.ctx.fillRect(0, 0, leftWidth, height);
    this.ctx.fillStyle = grad('right', rightWidth, rightIntensity);
    this.ctx.fillRect(width - rightWidth, 0, rightWidth, height);
  }

  start() {
    this.init();
    this.animate();
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
