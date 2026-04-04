/* ==========================================================================
   Neuraware Systems Pvt. Ltd. - Main JavaScript
   Dependencies: Alpine.js, GSAP (ScrollTrigger), Three.js, Swiper
   ========================================================================== */

// ---------------------------------------------------------------------------
// 0. Utility Functions
// ---------------------------------------------------------------------------

function pad(num) {
  return String(num).padStart(2, '0');
}

function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit = 100) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      fn.apply(this, args);
    }
  };
}

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// ---------------------------------------------------------------------------
// 1. Three.js Helper - Reusable Particle Scene
// ---------------------------------------------------------------------------

function createParticleScene(canvas, options = {}) {
  if (typeof THREE === 'undefined') return () => {};

  const {
    particleCount = 1500,
    color = 0xffffff,
    size = 1.5,
    speed = 0.0003,
    spread = 400,
  } = options;

  let w = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
  let h = canvas.clientHeight || canvas.parentElement.clientHeight || 600;
  if (w === 0) w = 800;
  if (h === 0) h = 600;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 1, 1000);
  camera.position.z = spread * 0.6;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = (Math.random() - 0.5) * spread;
    positions[i3 + 2] = (Math.random() - 0.5) * spread;
    velocities[i3]     = (Math.random() - 0.5) * 0.05;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.35,
    sizeAttenuation: true, depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let animId = null;
  let destroyed = false;

  function animate() {
    if (destroyed) return;
    animId = requestAnimationFrame(animate);

    if (!prefersReducedMotion) {
      points.rotation.y += speed;
      points.rotation.x += speed * 0.4;
      const pos = geometry.attributes.position.array;
      const half = spread * 0.5;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        pos[i3]     += velocities[i3];
        pos[i3 + 1] += velocities[i3 + 1];
        pos[i3 + 2] += velocities[i3 + 2];
        if (pos[i3] > half) pos[i3] = -half;
        if (pos[i3] < -half) pos[i3] = half;
        if (pos[i3+1] > half) pos[i3+1] = -half;
        if (pos[i3+1] < -half) pos[i3+1] = half;
        if (pos[i3+2] > half) pos[i3+2] = -half;
        if (pos[i3+2] < -half) pos[i3+2] = half;
      }
      geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  animate();

  const onResize = debounce(() => {
    if (destroyed) return;
    const nw = canvas.clientWidth || 800;
    const nh = canvas.clientHeight || 600;
    if (nw === 0 || nh === 0) return;
    renderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
  }, 150);
  window.addEventListener('resize', onResize);

  return function destroy() {
    destroyed = true;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}

// ---------------------------------------------------------------------------
// 1b. Focus Dot Matrix – visible looping wave animation
// ---------------------------------------------------------------------------

function createFocusDotMatrix(canvas) {
  if (typeof THREE === 'undefined') return () => {};

  let w = canvas.clientWidth || window.innerWidth;
  let h = canvas.clientHeight || window.innerHeight;
  if (w === 0) w = window.innerWidth;
  if (h === 0) h = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 1, 100);
  camera.position.z = 10;

  const spacing = 14;
  const cols = Math.ceil(w / spacing) + 10;
  const rows = Math.ceil(h / spacing) + 10;
  const count = cols * rows;

  const positions = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 2);
  const sizes = new Float32Array(count);

  let idx = 0;
  let bIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - cols / 2) * spacing;
      const y = (r - rows / 2) * spacing;
      positions[idx]     = x;
      positions[idx + 1] = y;
      positions[idx + 2] = 0;
      basePositions[bIdx]     = x;
      basePositions[bIdx + 1] = y;
      sizes[idx / 3] = 2.0;
      idx += 3;
      bIdx += 2;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x444444) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float size;
      uniform float uPixelRatio;
      varying float vOpacity;
      void main() {
        // Map size range (2..4) to opacity range (0.25..0.9)
        vOpacity = 0.5 + (size - 2.0) / 2.0 * 0.45;
        vec4 mvp = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPixelRatio;
        gl_Position = projectionMatrix * mvp;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float alpha = smoothstep(1.0, 0.3, d) * vOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const dots = new THREE.Points(geo, mat);
  scene.add(dots);

  let destroyed = false;
  let animId;
  let time = 0;

  const animate = () => {
    if (destroyed) return;
    animId = requestAnimationFrame(animate);
    time += 0.014;

    if (!prefersReducedMotion) {
      const pos = geo.attributes.position.array;
      const sz = geo.attributes.size.array;
      let i3 = 0;
      let i2 = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = basePositions[i2];
          const by = basePositions[i2 + 1];

          // Distance from center for circular ripple
          const dist = Math.sqrt(bx * bx + by * by);
          const angle = Math.atan2(by, bx);

          // Slow concentric ripple waves expanding outward
          const ripple1 = Math.sin(dist * 0.02 - time * 1.5);
          const ripple2 = Math.sin(dist * 0.012 - time * 0.9 + 3.0);

          // Gentle radial displacement — keeps dots close to grid
          const radialPush = ripple1 * 2.5 + ripple2 * 1.5;
          pos[i3]     = bx + Math.cos(angle) * radialPush;
          pos[i3 + 1] = by + Math.sin(angle) * radialPush;

          // Opacity driven by ripple — vary size to fake opacity change
          // Troughs = small/faint, crests = large/bold
          const pulse = (ripple1 + 1) * 0.5; // 0..1
          sz[i3 / 3] = 2.0 + pulse * 2.0;

          i3 += 3;
          i2 += 2;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };
  animate();

  const onResize = debounce(() => {
    if (destroyed) return;
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.left = -w / 2; camera.right = w / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  }, 300);
  window.addEventListener('resize', onResize);

  return () => {
    destroyed = true;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    geo.dispose(); mat.dispose(); renderer.dispose();
  };
}

// ---------------------------------------------------------------------------
// 1c. Dot Matrix Grid - 2D orthographic grid of dots (ethos section)
// ---------------------------------------------------------------------------

function createDotMatrix(canvas) {
  if (typeof THREE === 'undefined') return () => {};

  // Always use full window width, large height
  let w = window.innerWidth;
  let h = Math.max(document.documentElement.scrollHeight, window.innerHeight * 3, 3000);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 1, 100);
  camera.position.z = 10;

  const spacing = 22;
  const cols = Math.ceil(w / spacing) + 8;
  const rows = Math.ceil(h / spacing) + 8;
  const count = cols * rows;
  const positions = new Float32Array(count * 3);

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[idx++] = (c - cols / 2) * spacing;
      positions[idx++] = (r - rows / 2) * spacing;
      positions[idx++] = 0;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x888888,
    size: 2.5,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: false,
  });

  const dots = new THREE.Points(geo, mat);
  scene.add(dots);

  let destroyed = false;
  let animId;
  let time = 0;

  const animate = () => {
    if (destroyed) return;
    animId = requestAnimationFrame(animate);
    time += 0.0015;

    if (!prefersReducedMotion) {
      const pos = geo.attributes.position.array;
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          pos[i]     = (c - cols/2) * spacing + Math.sin(time + r * 0.1 + c * 0.07) * 2;
          pos[i + 1] = (r - rows/2) * spacing + Math.cos(time + c * 0.08 + r * 0.05) * 2;
          i += 3;
        }
      }
      geo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };
  animate();

  const onResize = debounce(() => {
    if (destroyed) return;
    w = window.innerWidth;
    h = Math.max(document.documentElement.scrollHeight, window.innerHeight * 3, 3000);
    renderer.setSize(w, h);
    camera.left = -w/2; camera.right = w/2;
    camera.top = h/2; camera.bottom = -h/2;
    camera.updateProjectionMatrix();
  }, 300);
  window.addEventListener('resize', onResize);

  return () => {
    destroyed = true;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    geo.dispose(); mat.dispose(); renderer.dispose();
  };
}

// ---------------------------------------------------------------------------
// 2. Alpine Components
// ---------------------------------------------------------------------------

document.addEventListener('alpine:init', () => {

  // ---- Loader (kept for compatibility, no-op if element missing) ----
  Alpine.data('loader', () => ({
    progress: 0,
    done: false,
    init() {},
    onComplete() {},
  }));

  // ---- Header ----
  Alpine.data('header', () => ({
    scrolled: false,
    hidden: false,
    lightBg: false,
    activeSection: null,
    mobileMenuOpen: false,
    lastScroll: 0,

    init() {
      // Detect background brightness behind the header
      const detectBg = () => {
        const headerEl = this.$el;
        const headerBottom = headerEl.getBoundingClientRect().bottom;
        const sampleX = window.innerWidth / 2;
        const sampleY = headerBottom + 2;

        headerEl.style.pointerEvents = 'none';
        const behind = document.elementFromPoint(sampleX, sampleY);
        headerEl.style.pointerEvents = '';

        if (!behind) return;

        let node = behind;
        while (node && node !== document.documentElement) {
          const bg = window.getComputedStyle(node).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const match = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
              const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
              this.lightBg = luminance > 0.5;
            }
            return;
          }
          node = node.parentElement;
        }
        this.lightBg = false;
      };

      // Track which section is in view
      const sectionIds = ['ethos', 'portfolio', 'team', 'contact'];
      const observerCallback = (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.activeSection = entry.target.id;
            this.$nextTick(() => this.positionPill());
          }
        });
      };
      const observer = new IntersectionObserver(observerCallback, {
        rootMargin: '-30% 0px -60% 0px',
      });
      sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });

      // Reposition pill on resize
      window.addEventListener('resize', debounce(() => this.positionPill(), 150));

      window.addEventListener('scroll', throttle(() => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        const direction = y > this.lastScroll ? 'down' : 'up';
        this.scrolled = y > vh * 0.25;
        this.hidden = direction === 'down' && y > vh;
        this.lastScroll = y;

        // In the hero zone, always dark — don't sample
        if (y < vh * 0.8) {
          this.lightBg = false;
        } else {
          detectBg();
        }

        // Clear active section if at the very top
        if (y < vh * 0.3) {
          this.activeSection = null;
          this.positionPill();
        }
      }, 50), { passive: true });

      detectBg();
    },

    positionPill() {
      const pill = this.$refs.navPill;
      const nav = this.$refs.nav;
      if (!pill || !nav) return;

      if (!this.activeSection) {
        pill.style.opacity = '0';
        pill.style.scale = '0.8 1';
        return;
      }

      const activeLink = nav.querySelector(`[data-section="${this.activeSection}"]`);
      if (!activeLink) {
        pill.style.opacity = '0';
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      pill.style.opacity = '1';
      pill.style.scale = '1 1';
      pill.style.left = (linkRect.left - navRect.left) + 'px';
      pill.style.width = linkRect.width + 'px';
      pill.style.height = linkRect.height + 'px';
    },

    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
    },

    scrollToLink(target) {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    },

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    onNavEnter() {},
    onNavLeave() {},
  }));

  // ---- Home Hero ----
  Alpine.data('homeHero', () => ({
    _cleanup: null,

    init() {
      try {
        const canvas = this.$refs.heroCanvas;
        if (canvas) {
          this._cleanup = createParticleScene(canvas, {
            particleCount: 2000, color: 0xf0f0f0,
            size: 1.2, speed: 0.0002, spread: 500,
          });
        }
      } catch (e) {
        console.warn('Hero canvas failed:', e);
      }
      this.$nextTick(() => this.animateIn());
    },

    animateIn() {
      if (this._animated) return;
      this._animated = true;

      if (typeof gsap === 'undefined' || prefersReducedMotion) {
        document.querySelectorAll('.hero-title-left, .hero-title-right').forEach(el => {
          el.style.opacity = '1';
        });
        const bottom = document.querySelector('.hero-bottom');
        if (bottom) bottom.style.opacity = '1';
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-title-left',
        { x: -40, opacity: 0, duration: 0.9, stagger: 0.08 }
      )
      .from('.hero-title-right',
        { x: 40, opacity: 0, duration: 0.9, stagger: 0.08 },
        '<0.1'
      )
      .from('.hero-bottom',
        { y: 30, opacity: 0, duration: 0.7 },
        '-=0.3'
      );
    },

    destroy() { if (this._cleanup) this._cleanup(); },
  }));

  // ---- Ethos Section (stacked cards via CSS sticky + dot matrix) ----
  Alpine.data('ethos', () => ({
    _canvasCleanup: null,

    init() {
      // Init dot matrix after layout
      setTimeout(() => {
        try {
          const canvas = this.$refs.ethosCanvas;
          if (canvas) {
            this._canvasCleanup = createDotMatrix(canvas);
          }
        } catch (e) { console.warn('Ethos canvas failed:', e); }
      }, 500);

      // Simple heading fade-in
      if (!prefersReducedMotion && typeof gsap !== 'undefined') {
        const heading = this.$el.querySelector('.ethos__heading');
        if (heading) {
          gsap.from(heading, {
            y: 50, opacity: 0, duration: 0.8, ease: 'power2.out',
            scrollTrigger: { trigger: heading, start: 'top 85%' },
          });
        }
      }
      // Cards use pure CSS sticky — no GSAP needed
    },

    destroy() {
      if (this._canvasCleanup) this._canvasCleanup();
    },
  }));

  // ---- Split Text Reveal ----
  Alpine.data('splitTextReveal', () => ({
    init() {
      if (prefersReducedMotion || typeof gsap === 'undefined') return;
      const el = this.$el;

      // Simple fade-up on the whole element — no innerHTML manipulation
      gsap.from(el, {
        y: 25, opacity: 0,
        duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    },
  }));

  // ---- Focus Industries ----
  Alpine.data('focusIndustries', () => ({
    _cleanup: null,
    init() {
      try {
        const canvas = this.$refs.focusCanvas;
        if (canvas) {
          this._cleanup = createFocusDotMatrix(canvas);
        }
      } catch (e) { console.warn('Focus canvas failed:', e); }
      if (prefersReducedMotion || typeof gsap === 'undefined') return;
      gsap.from('.focus-intro-text', {
        y: 64, opacity: 0, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: '.focus-intro-text', start: 'top 85%', toggleActions: 'play none none none' },
      });
    },
    destroy() { if (this._cleanup) this._cleanup(); },
  }));

  // ---- Industries List ----
  Alpine.data('industriesList', () => ({
    activeLink: -1,
    isMobile: window.innerWidth < 768,
    highlight: { width: 0, height: 0, top: 0, visible: false },

    init() {
      window.addEventListener('resize', debounce(() => {
        this.isMobile = window.innerWidth < 768;
      }));
    },

    setActive(index) {
      if (this.isMobile) {
        this.activeLink = this.activeLink === index ? -1 : index;
      } else {
        this.activeLink = index;
        this.updateHighlight(index);
      }
    },

    onHover(index) {
      if (this.isMobile) return;
      this.activeLink = index;
      this.updateHighlight(index);
    },

    updateHighlight(index) {
      const items = this.$el.querySelectorAll('.industry-item');
      if (!items[index]) { this.highlight.visible = false; return; }
      const rect = items[index].getBoundingClientRect();
      const parentRect = this.$el.getBoundingClientRect();
      this.highlight = {
        width: rect.width, height: rect.height,
        top: rect.top - parentRect.top, visible: true,
      };
    },

    isExpanded(index) { return this.activeLink === index; },

    getDescriptionStyle(index) {
      return {
        display: 'grid',
        gridTemplateRows: this.isExpanded(index) ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.4s ease',
      };
    },

    getHeadingStyle(index) {
      return {
        transform: this.isExpanded(index) ? 'translateY(0)' : 'translateY(4px)',
        transition: 'transform 0.3s ease',
      };
    },
  }));

  // ---- Portfolio Slider ----
  Alpine.data('slider', (config = {}) => ({
    swiper: null,
    activeIndex: 0,
    isBeginning: true,
    isEnd: false,

    init() {
      if (typeof Swiper === 'undefined') return;
      const container = this.$refs.swiperContainer || this.$el.querySelector('.swiper');
      if (!container) return;

      this.$nextTick(() => {
        this.swiper = new Swiper(container, {
          centeredSlides: true,
          slidesPerView: 'auto',
          speed: 500,
          slideToClickedSlide: true,
          initialSlide: config.initialSlide || 0,
          spaceBetween: config.spaceBetween || 20,
          on: {
            slideChange: (sw) => {
              this.activeIndex = sw.activeIndex;
              this.isBeginning = sw.isBeginning;
              this.isEnd = sw.isEnd;
            },
          },
        });
        this.activeIndex = this.swiper.activeIndex;
      });
    },

    prev() { if (this.swiper) this.swiper.slidePrev(); },
    next() { if (this.swiper) this.swiper.slideNext(); },
    slideTo(index) { if (this.swiper) this.swiper.slideTo(index); },
    pad(num) { return pad(num); },
    isActive(index) { return this.activeIndex === index; },

    destroy() { if (this.swiper) this.swiper.destroy(true, true); },
  }));

  // ---- Partners / Leadership ----
  Alpine.data('partners', () => ({
    activePartnerIndex: 0,
    expandedPartnerIndex: -1,
    isMobile: window.innerWidth < 768,

    init() {
      window.addEventListener('resize', debounce(() => {
        this.isMobile = window.innerWidth < 768;
      }));
    },

    expandPartner(index) {
      if (this.isMobile) { this.activePartnerIndex = index; return; }
      this.expandedPartnerIndex = index;
      this.activePartnerIndex = index;
    },

    collapsePartner() {
      if (this.isMobile) return;
      this.expandedPartnerIndex = -1;
    },

    prevPartner() {
      const count = this.$el.querySelectorAll('.partner-card').length;
      this.activePartnerIndex = (this.activePartnerIndex - 1 + count) % count;
    },

    nextPartner() {
      const count = this.$el.querySelectorAll('.partner-card').length;
      this.activePartnerIndex = (this.activePartnerIndex + 1) % count;
    },

    getPartnerInfo() {
      const cards = this.$el.querySelectorAll('.partner-card');
      const card = cards[this.activePartnerIndex];
      if (!card) return { name: '', bio: '', linkedin: '' };
      return {
        name: card.dataset.name || '',
        bio: card.dataset.bio || '',
        linkedin: card.dataset.linkedin || '',
      };
    },

    isExpanded(index) { return this.expandedPartnerIndex === index; },
    isActive(index) { return this.activePartnerIndex === index; },
  }));

  // ---- Team Modal ----
  Alpine.data('teamModal', () => ({
    open: false,
    swiper: null,

    init() {
      window.addEventListener('team-modal:open', (e) => {
        this.openModal(e.detail?.index || 0);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.open) this.closeModal();
      });
    },

    openModal(index) {
      this.open = true;
      document.body.style.overflow = 'hidden';
      this.$nextTick(() => {
        if (typeof Swiper === 'undefined') return;
        const container = this.$el.querySelector('.swiper');
        if (container && !this.swiper) {
          this.swiper = new Swiper(container, {
            slidesPerView: 1, speed: 400, initialSlide: index,
          });
        } else if (this.swiper) {
          this.swiper.slideTo(index, 0);
        }
      });
    },

    closeModal() {
      this.open = false;
      document.body.style.overflow = '';
    },
  }));

  // ---- Investors ----
  Alpine.data('investors', () => ({
    init() {
      if (prefersReducedMotion || typeof gsap === 'undefined') return;
      this.$el.querySelectorAll('.investor-card').forEach((card) => {
        gsap.fromTo(card,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' } }
        );
      });
    },
  }));

  // ---- Founders ----
  Alpine.data('founders', () => ({
    init() {
      if (prefersReducedMotion || typeof gsap === 'undefined') return;
      this.$el.querySelectorAll('.founder-card').forEach((card) => {
        gsap.fromTo(card,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' } }
        );
      });
    },
  }));

  // ---- Footer ----
  Alpine.data('footer', () => ({
    _cleanup: null,
    init() {
      try {
        const canvas = this.$refs.footerCanvas;
        if (canvas) {
          this._cleanup = createParticleScene(canvas, {
            particleCount: 600, color: 0xcccccc, size: 1.3, speed: 0.0001, spread: 250,
          });
        }
      } catch (e) { console.warn('Footer canvas failed:', e); }
    },
    destroy() { if (this._cleanup) this._cleanup(); },
  }));

  // ---- Contact Modal ----
  Alpine.data('contactModal', () => ({
    open: false,
    contactType: 'general',

    init() {
      window.addEventListener('contact-modal:open', (e) => {
        this.contactType = e.detail?.type || 'general';
        this.openModal();
      });
      if (window.location.hash === '#contact') {
        this.$nextTick(() => this.openModal());
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.open) this.closeModal();
      });
    },

    openModal() {
      this.open = true;
      document.body.style.overflow = 'hidden';
    },

    closeModal() {
      this.open = false;
      document.body.style.overflow = '';
    },

    onBackdropClick(e) {
      if (e.target === this.$el || e.target.classList.contains('modal-backdrop')) {
        this.closeModal();
      }
    },

    getTitle() {
      return { investor: 'Partnership Inquiry', founder: 'Learn More',
        partner: 'Partnership Inquiry', general: 'Get in Touch' }[this.contactType] || 'Get in Touch';
    },

    getDescription() {
      return { investor: 'Interested in partnering with Neuraware Systems?',
        founder: 'Want to learn more about our technology platform?',
        partner: 'Interested in partnering with Neuraware Systems?',
        general: 'Whether you\'re a healthcare partner, a student curious about semiconductors, or someone who believes heart disease detection should be better — we\'d love to hear from you.' }[this.contactType] || 'We\'d love to hear from you.';
    },
  }));

});

// ---------------------------------------------------------------------------
// 3. Initialize GSAP on DOM Ready
// ---------------------------------------------------------------------------

// Register ScrollTrigger IMMEDIATELY — Alpine components need it during init()
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof ScrollTrigger !== 'undefined') {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    window.addEventListener('resize', debounce(() => ScrollTrigger.refresh(), 300));
  }
});

