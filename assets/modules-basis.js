class ScrollSnapSlider extends HTMLUListElement {
  constructor() {
    super();
    
    this.prevButton = this.parentNode.querySelector(".slider-buttons .slider-button--prev");
    this.nextButton = this.parentNode.querySelector(".slider-buttons .slider-button--next");
    this.isAutoplay = (this.dataset.autoplay || "false") === 'true';
    this.isLoop = (this.dataset.loop || "false") === 'true';
    this.isDraggable = (this.dataset.draggable || "false") === 'true';
    this.autoplayInterval = this.dataset.autoplayInterval ? this.dataset.autoplayInterval : 3000;

    theme.initWhenVisible({
      element: this,
      callback: this.init.bind(this),
      threshold: 200
    });
  }

  async init() {
    const { ScrollSnapSlider, ScrollSnapDraggable, ScrollSnapAutoplay, ScrollSnapLoop } = await import(theme.modules.scrollsnap);

    const sliderSimple = new ScrollSnapSlider({ element: this });
    const draggablePlugin = new ScrollSnapDraggable(70);
    const autoplayPlugin = new ScrollSnapAutoplay(this.autoplayInterval);
    const loopPlugin = new ScrollSnapLoop();
    this.slider = sliderSimple;
    draggablePlugin.slider = sliderSimple;
    autoplayPlugin.slider = sliderSimple;
    loopPlugin.slider = sliderSimple;

    this.prevButton?.addEventListener("click", () => {
      autoplayPlugin.disableTemporarily();
      sliderSimple.slideTo(sliderSimple.slide - 1);
    });
    this.nextButton?.addEventListener("click", () => {
      autoplayPlugin.disableTemporarily();
      sliderSimple.slideTo(sliderSimple.slide + 1);
    });

    this.slider.addEventListener("slide-stop", (e) => {
      const children = e.target.children; 
      if (!children || e.detail < 0 || e.detail >= children.length) {
        return; 
      }
      for (let child of children) {
        child.classList.remove('-active');
      }
      children[e.detail].classList.add('-active');
    });

    if (!this.isLoop || this.isDraggable) {
      this.slider.addEventListener("slide-stop", () => {
        this.prevButton?.removeAttribute('disabled');
        this.nextButton?.removeAttribute('disabled');
        if (sliderSimple.firstItemInView) {
          this.prevButton?.setAttribute('disabled', 'disabled');
        }
        if (sliderSimple.lastItemInView) {
          this.nextButton?.setAttribute('disabled', 'disabled');
        }
      });
    }

    if (this.isAutoplay) {
      this.enablePlugin(autoplayPlugin);
    }

    if (this.isLoop) {
      this.enablePlugin(loopPlugin);
    }

    if (this.isDraggable) {
      this.enablePlugin(draggablePlugin);
      if (this.isLoop) {
        this.disablePlugin(loopPlugin);
      }
      return;
    }
    this.disablePlugin(draggablePlugin);
  }

  enablePlugin(plugin) {
    plugin.enable();
    this.slider.plugins.set(plugin.id, plugin);
  }

  disablePlugin(plugin) {
    plugin.disable();
    this.slider.plugins.delete(plugin.id);
  }
}
customElements.define('scroll-snap-slider', ScrollSnapSlider, { extends: 'ul' });