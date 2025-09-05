<script>
/*! Improved Lazy Image & Progressive Picture (drop-in) */

// ---------- helpers ----------
const _swapDataToLive = (el) => {
  const ds = el.getAttribute('data-srcset');
  if (ds) el.setAttribute('srcset', ds);
  const s = el.getAttribute('data-src');
  if (s && el.tagName === 'IMG') el.setAttribute('src', s);
};
const _decodeSafe = (img) => ('decode' in img ? img.decode() : Promise.resolve());
const _inSmallView = () => !matchMedia('(min-width: 750px)').matches;

// ---------- LazyImage ----------
class LazyImage extends HTMLImageElement {
  constructor() {
    super();

    // wrapper detection (support your old class + a safer default)
    this.wrapper = this.closest('.media-wrapper, .media, picture') || this.parentElement;
    if (!this.wrapper) return;

    // defaults for faster paint
    if (!this.hasAttribute('loading')) this.setAttribute('loading', 'lazy');
    if (!this.hasAttribute('decoding')) this.setAttribute('decoding', 'async');
    this.classList.remove('loaded'); // reset if cloned

    // observe attribute changes (data-src/srcset) to (re)lazy
    this._mo = new MutationObserver((changes) => {
      for (const c of changes) {
        if (c.attributeName && /^(data-)?src(set)?$/.test(c.attributeName)) {
          this._observeOrHydrate();
          break;
        }
      }
    });
    this._mo.observe(this, { attributes: true });

    // re-evaluate on resize/DPR change
    this._onResize = this._onResize.bind(this);
    addEventListener('resize', this._onResize, { passive: true });

    // main
    this._observeOrHydrate();
  }

  disconnectedCallback() {
    this._cleanup();
  }

  _cleanup() {
    this._mo?.disconnect();
    removeEventListener('resize', this._onResize);
    this._io?.disconnect();
  }

  _onResize() {
    // if class-based visibility hides this image, skip
    if (!_inSmallView() && this.classList.contains('medium-hide')) return;
    if (_inSmallView() && this.classList.contains('small-hide')) return;
    // nudge browser to re-pick candidate on DPR/layout change
    const cur = this.getAttribute('srcset');
    if (cur) this.setAttribute('srcset', cur);
  }

  _observeOrHydrate() {
    // respect your visibility rules
    if (!_inSmallView() && this.classList.contains('medium-hide')) return;
    if (_inSmallView() && this.classList.contains('small-hide')) return;

    // already complete & marked
    if ((this.complete && this.currentSrc) || this.classList.contains('loaded')) return;

    // IntersectionObserver for just-in-time loading
    if ('IntersectionObserver' in window) {
      this._io?.disconnect?.();
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this._io.disconnect();
            this._lazyLoad();
          }
        }
      }, { rootMargin: '300px 0px', threshold: 0.01 });
      this._io.observe(this);
    } else {
      // fallback: hydrate immediately
      this._lazyLoad();
    }
  }

  async _lazyLoad() {
    if (this._hydrated) return;
    this._hydrated = true;

    // show loading state on wrapper
    this.wrapper.classList.add('loading');

    // activate <source> siblings first (if inside <picture>)
    const pic = this.closest('picture');
    if (pic) pic.querySelectorAll('source').forEach(_swapDataToLive);
    _swapDataToLive(this);

    // load + decode before reveal (prevents pixelation)
    const onLoaded = () => {
      const done = () => {
        this.classList.add('loaded');
        this.wrapper.classList.remove('loading');
      };
      (window.requestIdleCallback ? requestIdleCallback(done, { timeout: 200 }) : setTimeout(done, 0));
    };

    // ensure we catch both paths
    this.addEventListener('load', onLoaded, { once: true });
    this.addEventListener('error', () => this.wrapper.classList.remove('loading'), { once: true });

    try { await _decodeSafe(this); } catch { /* ignore */ }
  }
}
try {
  window.customElements.define('lazy-image', LazyImage, { extends: 'img' });
} catch { /* Safari <17 or unsupported: ignore, native lazy will still work */ }

// ---------- ProgPicture ----------
class ProgPicture extends HTMLPictureElement {
  constructor() {
    super();
    this.abortController = new AbortController();

    // If author provided data-hq, we’ll swap the FIRST <source> to HQ on zoom/DPR increase or pinch gesture
    this._maybeBindHQ();
  }

  disconnectedCallback() {
    this.abortController?.abort();
  }

  _maybeBindHQ() {
    const hq = this.getAttribute('data-hq');
    if (!hq) return;

    const signal = this.abortController.signal;
    const doSwap = () => {
      const firstSource = this.querySelector('source');
      if (!firstSource) return;
      firstSource.setAttribute('srcset', hq);
      // nudge the <img> to re-evaluate candidates
      const img = this.querySelector('img');
      if (img && img.getAttribute('srcset')) {
        img.setAttribute('srcset', img.getAttribute('srcset'));
      }
      this.abortController.abort(); // one-time upgrade
    };

    // 1) Visual viewport scale (modern mobile browsers)
    if ('visualViewport' in window) {
      const vv = window.visualViewport;
      const onVV = () => { if ((vv.scale || 1) > 1.01) doSwap(); };
      vv.addEventListener('resize', onVV, { signal });
      vv.addEventListener('scroll', onVV, { signal }); // some browsers update scale with scroll events too
    }

    // 2) DPR change (desktop zoom / some mobiles)
    let lastDPR = window.devicePixelRatio || 1;
    const onResize = () => {
      const now = window.devicePixelRatio || 1;
      if (now - lastDPR > 0.1) doSwap();
      lastDPR = now;
    };
    addEventListener('resize', onResize, { signal, passive: true });

    // 3) iOS gesture events (non-standard but useful)
    const onGesture = (ev) => { if (ev.scale && ev.scale > 1.01) doSwap(); };
    // Some browsers support these:
    addEventListener('gesturestart', onGesture, { signal });
    addEventListener('gesturechange', onGesture, { signal });

    // 4) As a fallback: first touchmove will check a synthetic scale via visualViewport if available
    this.addEventListener('touchmove', () => {
      if ('visualViewport' in window && window.visualViewport.scale > 1.01) doSwap();
    }, { signal });
  }
}
try {
  window.customElements.define('prog-picture', ProgPicture, { extends: 'picture' });
} catch { /* ignore if unsupported */ }

/* USAGE NOTES:
  <picture is="prog-picture" data-hq="/img/photo-2x.avif">
    <source type="image/avif" data-srcset="/img/photo-1x.avif 1x, /img/photo-1.5x.avif 1.5x">
    <img is="lazy-image"
         width="1200" height="800"
         alt=""
         data-src="/img/photo-1x.jpg"
         data-srcset="/img/photo-600.jpg 600w, /img/photo-900.jpg 900w, /img/photo-1200.jpg 1200w"
         sizes="(min-width:1100px) 800px, 92vw">
  </picture>

  - Low/normal sources go in data-src/data-srcset (no immediate network)
  - HQ variant path in picture[data-hq] (will swap into first <source> on zoom)
  - Keep width/height to avoid layout shift; set realistic "sizes"
*/
</script>
