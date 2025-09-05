var i = class {
    slider;
    constructor() {
        this.slider = null
    }
},
o = class extends i {
    intervalDuration;
    timeoutDuration;
    debounceId;
    interval;
    events;
    constructor(e = 3141, t = 6282, s = ["touchmove", "wheel"]) {
        super(), this.intervalDuration = e, this.timeoutDuration = t, this.interval = null, this.events = s
    }
    get id() {
        return "ScrollSnapAutoplay"
    }
    enable = () => {
        this.debounceId && clearTimeout(this.debounceId), this.debounceId = null, this.interval = setInterval(this.onInterval, this.intervalDuration);
        for (let e of this.events) this.slider.addEventListener(e, this.disableTemporarily, {
            passive: !0
        })
    };
    disable() {
        for (let e of this.events) this.slider.removeEventListener(e, this.disableTemporarily);
        this.interval && clearInterval(this.interval), this.interval = null, this.debounceId && clearTimeout(this.debounceId), this.debounceId = null
    }
    disableTemporarily = () => {
        this.interval && (clearInterval(this.interval), this.interval = null, this.debounceId && clearTimeout(this.debounceId), this.debounceId = setTimeout(this.enable, this.timeoutDuration))
    };
    onInterval = () => {
        if (this.slider.plugins.has("ScrollSnapLoop")) {
            this.slider.slideTo(this.slider.slide + 1);
            return
        }
        requestAnimationFrame(() => {
            let {
                scrollLeft: e,
                offsetWidth: t,
                scrollWidth: s
            } = this.slider.element, n = e + t === s ? 0 : this.slider.slide + 1;
            this.slider.slideTo(n)
        })
    }
},
d = class extends i {
    quickSwipeDistance;
    lastX;
    startX;
    constructor(e = null) {
        super(), this.lastX = null, this.startX = null, this.slider = null, this.quickSwipeDistance = e
    }
    get id() {
        return "ScrollSnapDraggable"
    }
    enable() {
        this.slider.element.classList.add("-draggable"), this.slider.addEventListener("mousedown", this.startDragging), addEventListener("mouseup", this.stopDragging, {
            capture: !0
        })
    }
    disable() {
        this.slider.element.classList.remove("-draggable"), this.slider.removeEventListener("mousedown", this.startDragging), removeEventListener("mouseup", this.stopDragging, {
            capture: !0
        }), this.lastX = null
    }
    onSlideStopAfterDrag = () => {
        this.slider.element.style.scrollSnapStop = "", this.slider.element.style.scrollSnapType = ""
    };
    getFinalSlide() {
        if (!this.quickSwipeDistance) return this.slider.slide;
        let e = Math.abs(this.startX - this.lastX),
            t = this.quickSwipeDistance > e,
            s = e > this.slider.itemSize / 2;
        return t || s ? this.slider.slide : this.startX < this.lastX ? this.slider.slide - 1 : this.slider.slide + 1
    }
    mouseMove = e => {
        let t = this.lastX - e.clientX;
        this.lastX = e.clientX, requestAnimationFrame(() => {
            this.slider.element.scrollLeft += t
        })
    };
    startDragging = e => {
        e.preventDefault(), this.slider.removeEventListener("slide-stop", this.onSlideStopAfterDrag), this.startX = this.lastX = e.clientX, this.slider.element.style.scrollBehavior = "auto", this.slider.element.style.scrollSnapStop = "unset", this.slider.element.style.scrollSnapType = "none", this.slider.element.classList.add("-dragging");
        let t = this.slider.plugins.get("ScrollSnapAutoplay");
        t && t.disable(), addEventListener("mousemove", this.mouseMove)
    };
    stopDragging = e => {
        if (this.lastX === null) return;
        e.preventDefault();
        let t = this.getFinalSlide();
        removeEventListener("mousemove", this.mouseMove), this.lastX = null, this.slider.element.style.scrollBehavior = "", this.slider.element.classList.remove("-dragging"), this.slider.slideTo(t);
        let s = this.slider.plugins.get("ScrollSnapAutoplay");
        s && s.enable(), requestAnimationFrame(() => {
            let {
                scrollLeft: r,
                offsetWidth: n,
                scrollWidth: u
            } = this.slider.element;
            if (r === 0 || u - r - n === 0) {
                this.onSlideStopAfterDrag();
                return
            }
            this.slider.addEventListener("slide-stop", this.onSlideStopAfterDrag, {
                once: !0
            })
        })
    }
},
h = class extends i {
    get id() {
        return "ScrollSnapLoop"
    }
    enable() {
        this.slider.addEventListener("slide-pass", this.loopSlides), this.slider.addEventListener("slide-stop", this.loopSlides), this.loopSlides()
    }
    disable() {
        this.slider.removeEventListener("slide-pass", this.loopSlides), this.slider.removeEventListener("slide-stop", this.loopSlides);
        let e = this.slider.element.querySelectorAll("[data-index]"),
            t = Array.from(e).sort(this.sortFunction);
        Element.prototype.append.apply(this.slider.element, t)
    }
    removeSnapping() {
        this.slider.detachListeners(), this.slider.element.style.scrollBehavior = "auto", this.slider.element.style.scrollSnapStop = "unset", this.slider.element.style.scrollSnapType = "none"
    }
    addSnapping() {
        this.slider.element.style.scrollBehavior = "", this.slider.element.style.scrollSnapStop = "", this.slider.element.style.scrollSnapType = "", this.slider.attachListeners(), requestAnimationFrame(this.slider.update)
    }
    loopEndToStart() {
        requestAnimationFrame(() => {
            this.removeSnapping(), this.slider.element.prepend(this.slider.element.children[this.slider.element.children.length - 1]), this.slider.element.scrollLeft += this.slider.itemSize, this.addSnapping()
        })
    }
    loopStartToEnd() {
        requestAnimationFrame(() => {
            this.removeSnapping(), this.slider.element.append(this.slider.element.children[0]), this.slider.element.scrollLeft -= this.slider.itemSize, this.addSnapping()
        })
    }
    loopSlides = () => {
        this.slider.element.children.length < 3 || requestAnimationFrame(() => {
            let {
                scrollLeft: e,
                offsetWidth: t,
                scrollWidth: s
            } = this.slider.element;
            if (e < 5) {
                this.loopEndToStart();
                return
            }
            
            s - e - t < 5 && this.loopStartToEnd()
        })
    }; sortFunction(e, t) {
        return parseInt(e.dataset.index, 10) - parseInt(t.dataset.index, 10)
    }
},
a = class {
    element;
    plugins;
    removeEventListener;
    addEventListener;
    roundingMethod;
    scrollTimeout;
    itemSize;
    sizingMethod;
    slide;
    firstItemInView;
    lastItemInView;
    resizeObserver;
    scrollTimeoutId;
    slideScrollLeft;
    constructor(e) {
        Object.assign(this, {
            scrollTimeout: 100,
            roundingMethod: Math.round,
            sizingMethod: t => t.element.firstElementChild.nextElementSibling ? (t.element.firstElementChild.nextElementSibling.offsetLeft - t.element.firstElementChild.offsetLeft) : t.element.firstElementChild.offsetWidth,
            ...e
        }), this.scrollTimeoutId = null, this.firstItemInView = true, this.lastItemInView = false, this.addEventListener = this.element.addEventListener.bind(this.element), this.removeEventListener = this.element.removeEventListener.bind(this.element), this.plugins = new Map, this.resizeObserver = new ResizeObserver(this.rafSlideSize), this.resizeObserver.observe(this.element);
        for (let t of this.element.children) this.resizeObserver.observe(t);
        this.rafSlideSize(), this.attachListeners()
    }
    with(e, t = !0) {
        for (let s of e) s.slider = this, this.plugins.set(s.id, s), t && s.enable();
        return this
    }
    attachListeners() {
        this.addEventListener("scroll", this.onScroll, {
            passive: !0
        })
    }
    detachListeners() {
        this.removeEventListener("scroll", this.onScroll), this.scrollTimeoutId && clearTimeout(this.scrollTimeoutId)
    }
    slideTo = e => {
        requestAnimationFrame(() => {
            this.element.scrollTo({
                left: e * this.itemSize
            })
        })
    };
    destroy() {
        this.scrollTimeoutId && clearTimeout(this.scrollTimeoutId), this.detachListeners();
        for (let [e, t] of this.plugins) t.disable(), t.slider = null, this.plugins.delete(e)
    }
    update = () => {
        this.slide = this.roundingMethod(this.element.scrollLeft / this.itemSize), this.slideScrollLeft = this.slide * this.itemSize;
        this.firstItemInView = this.element.firstChild.getBoundingClientRect().left >= 0;
        this.lastItemInView = Math.floor(this.element.lastChild.getBoundingClientRect().right) <= this.element.getBoundingClientRect().right;
    };
    onScrollEnd = () => {
        requestAnimationFrame(() => {
            this.scrollTimeoutId = null, this.update(), this.dispatch("slide-stop", this.slide)
        })
    };
    rafSlideSize = e => {
        requestAnimationFrame(() => {
            this.itemSize = this.sizingMethod(this, e), this.update()
        })
    };
    dispatch(e, t) {
        return this.element.dispatchEvent(new CustomEvent(e, {
            detail: t
        }))
    }
    onScroll = () => {
        requestAnimationFrame(() => {
            let {
                scrollLeft: e
            } = this.element, t = this.roundingMethod(e / this.itemSize);
            if (this.scrollTimeoutId === null) {
                let s = e > this.slideScrollLeft ? 1 : -1;
                this.dispatch("slide-start", this.slide + s)
            }
            t !== this.slide && (this.update(), this.dispatch("slide-pass", this.slide)), this.scrollTimeoutId && clearTimeout(this.scrollTimeoutId), this.scrollTimeoutId = setTimeout(this.onScrollEnd, this.scrollTimeout);
        })
    }
};
export {
    o as ScrollSnapAutoplay,
    d as ScrollSnapDraggable, 
    h as ScrollSnapLoop, 
    i as ScrollSnapPlugin, 
    a as ScrollSnapSlider
};