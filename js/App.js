/**
 * App - 业务逻辑层入口
 * 初始化 PixelBackground 及各 UI 模块
 */
(function () {
  const bgCanvas = document.getElementById('bg-layer');
  if (!bgCanvas) {
    console.error('App: 未找到 #bg-layer');
    return;
  }

  const pixelBg = new PixelBackground(bgCanvas);
  pixelBg.start();

  const inputWrap = document.querySelector('.workspace-input-wrap');
  const introBox = document.getElementById('intro-container');

  if (typeof pixelBg.triggerRipple !== 'function') {
    pixelBg.triggerRipple = function (opts = {}) {
      const x = opts.x ?? window.innerWidth / 2;
      const y = opts.y ?? window.innerHeight / 2;
      if (typeof this.setIntroCenter === 'function') {
        this.setIntroCenter(x, y);
      }
    };
  }
  const rect = inputWrap ? inputWrap.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const typeWriter = (el, text, min = 50, max = 100, onDone) => {
    let i = 0;
    const next = () => {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        const dt = Math.random() * (max - min) + min;
        setTimeout(next, dt);
      } else if (typeof onDone === 'function') {
        onDone();
      }
    };
    next();
  };
  setTimeout(() => {
    pixelBg.triggerRipple({ x: cx, y: cy, velocity: 5 });
    setTimeout(() => pixelBg.triggerRipple({ x: cx, y: cy, velocity: 5 }), 800);
    if (introBox) introBox.classList.add('active');
    const hero = document.querySelector('.workspace-hero');
    if (hero) {
      const h1 = hero.querySelector('h1');
      hero.classList.remove('intro-hidden');
      hero.classList.add('intro-fade-in');
      if (h1) {
        h1.textContent = '';
        h1.classList.add('typewriter');
        typeWriter(h1, 'Code Your Dream', 45, 90, () => {
          if (inputWrap) {
            inputWrap.classList.remove('intro-hidden');
            inputWrap.classList.add('intro-fade-in');
            const input = inputWrap.querySelector('.workspace-input');
            if (input) {
              input.focus();
            }
          }
        });
      }
    }
  }, 600);

  // 其余业务逻辑

  // 项目列表：为每个项目图标分配随机 Material 风格颜色，并使用项目名首字母
  const materialColors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFC107', '#FF9800', '#FF5722'
  ];

  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach((item, index) => {
    const iconEl = item.querySelector('.project-icon');
    const nameEl = item.querySelector('.project-name');
    if (!iconEl || !nameEl) return;

    const nameText = nameEl.textContent || '';
    const firstCharMatch = nameText.trim().charAt(0);
    const letter = firstCharMatch ? firstCharMatch.toUpperCase() : '?';

    // 随机挑选一个 Material 颜色（使用 index 做轻微偏移，避免完全随机闪烁感）
    const colorIndex = (index * 3 + Math.floor(Math.random() * materialColors.length)) % materialColors.length;
    const bgColor = materialColors[colorIndex];

    iconEl.textContent = letter;
    iconEl.style.backgroundColor = bgColor;
    iconEl.style.color = '#ffffff';
    iconEl.style.fontFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  });

  // 可在此挂载其他业务逻辑
  // 例如：路由、侧边栏交互、内容区数据加载等
})();
