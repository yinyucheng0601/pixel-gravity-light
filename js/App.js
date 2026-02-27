/**
 * App - 启动态 + IDE 淡入
 *
 * 流程：
 *  0ms  → canvas 启动，打字机开始
 *  ~1.2s → "Code Your Dream" 打完，光标持续闪烁
 *  3000ms → intro 淡出（700ms）
 *  3700ms → IDE 淡入（600ms）
 *
 * 性能：图片由浏览器在后台并行加载，3s intro 即是加载缓冲期。
 */
(function () {
  'use strict';

  // ── 1. Canvas 立即启动（无任何图片依赖，几乎 0 延迟） ──
  const bgCanvas = document.getElementById('bg-layer');
  if (!bgCanvas) return;
  const pixelBg = new PixelBackground(bgCanvas);
  pixelBg.start();

  // ── 2. 打字机 ────────────────────────────────────────────
  const SLOGAN  = 'Code Your Dream';
  const twText  = document.getElementById('tw-text');
  let   charIdx = 0;

  function typeNext() {
    if (!twText || charIdx >= SLOGAN.length) return;
    twText.textContent = SLOGAN.slice(0, ++charIdx);
    // 65~125ms 随机间隔，模拟真实打字节奏
    setTimeout(typeNext, 65 + Math.random() * 60);
  }
  typeNext();

  // ── 3. 3s 后淡出 intro，淡入 IDE ────────────────────────
  const introScreen = document.getElementById('intro-screen');
  const ideShell    = document.getElementById('ide-shell');

  setTimeout(function () {
    // 淡出启动屏
    if (introScreen) {
      introScreen.style.opacity = '0';
    }
    // 700ms 后隐藏 DOM 节点，同时淡入 IDE
    setTimeout(function () {
      if (introScreen) introScreen.style.display = 'none';
      if (ideShell) {
        ideShell.style.opacity       = '1';
        ideShell.style.pointerEvents = 'auto';
      }
    }, 700);
  }, 3000);

})();
