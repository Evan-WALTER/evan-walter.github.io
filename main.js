(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const navToggle = $('#nav-toggle');
  const menu = $('#menu');

  if (navToggle && menu) {
    const closeMenu = () => {
      menu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !navToggle.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    $$('#menu a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = Number.parseInt(el.dataset.count || el.textContent, 10) || 0;
    const duration = 1800;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * progress);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(runCounter);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $$('[data-carousel]').forEach((carousel) => {
    const track = $('.rail-track', carousel);
    if (!track) return;

    const cards = $$('[data-carousel-item], .card', track);
    const dots = $('.carousel-dots', carousel);
    const status = $('.carousel-status', carousel);
    if (!cards.length) return;

    const singularLabel = carousel.dataset.carouselSingular || 'Article';
    const pluralLabel = carousel.dataset.carouselPlural || `${singularLabel}s`;
    const dotLabel =
      carousel.dataset.carouselDotLabel || `Afficher les ${pluralLabel.toLowerCase()} à partir du`;
    const autoplayDelay = Number.parseInt(carousel.dataset.carouselAutoplay || '0', 10);
    const prevButtons = $$(`[data-carousel-prev="${track.id}"]`);
    const nextButtons = $$(`[data-carousel-next="${track.id}"]`);
    let dotButtons = [];
    let dotCount = 0;
    let frame = null;
    let autoplayTimer = null;

    const getStep = () => {
      const firstItem = cards[0];
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      return firstItem.getBoundingClientRect().width + gap;
    };

    const getVisibleCount = () => Math.max(1, Math.round(track.clientWidth / getStep()));
    const getMaxIndex = () => Math.max(0, cards.length - getVisibleCount());

    const scrollToIndex = (index) => {
      const nextIndex = Math.max(0, Math.min(index, getMaxIndex()));
      track.scrollTo({
        left: cards[nextIndex].offsetLeft,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    };

    const getActiveIndex = () => {
      const scrollLeft = track.scrollLeft;
      let activeIndex = 0;

      cards.forEach((card, index) => {
        if (
          Math.abs(card.offsetLeft - scrollLeft) <
          Math.abs(cards[activeIndex].offsetLeft - scrollLeft)
        ) {
          activeIndex = index;
        }
      });

      return activeIndex;
    };

    const renderDots = () => {
      if (!dots) return;

      const nextDotCount = getMaxIndex() + 1;
      if (nextDotCount === dotCount) return;

      dotCount = nextDotCount;
      dots.replaceChildren();
      dotButtons = [];

      for (let index = 0; index < dotCount; index += 1) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', `${dotLabel} ${index + 1}`);
        dot.addEventListener('click', () => scrollToIndex(index));
        dots.appendChild(dot);
        dotButtons.push(dot);
      }
    };

    const updateCarousel = () => {
      frame = null;
      renderDots();

      const activeIndex = Math.min(getActiveIndex(), getMaxIndex());
      const visibleCount = getVisibleCount();
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      const atStart = track.scrollLeft <= 2;
      const atEnd = track.scrollLeft >= maxScroll;

      prevButtons.forEach((button) => {
        button.disabled = atStart;
        button.setAttribute('aria-disabled', String(atStart));
      });

      nextButtons.forEach((button) => {
        button.disabled = atEnd;
        button.setAttribute('aria-disabled', String(atEnd));
      });

      if (status) {
        const first = activeIndex + 1;
        const last = Math.min(cards.length, activeIndex + visibleCount);
        status.textContent =
          first === last
            ? `${singularLabel} ${first} sur ${cards.length}`
            : `${pluralLabel} ${first}-${last} sur ${cards.length}`;
      }

      dotButtons.forEach((dot, index) => {
        dot.toggleAttribute('aria-current', index === activeIndex);
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateCarousel);
    };

    const stopAutoplay = () => {
      if (!autoplayTimer) return;
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      if (
        carousel.dataset.carouselPaused === 'true' ||
        reducedMotion ||
        !autoplayDelay ||
        autoplayTimer ||
        getMaxIndex() === 0
      )
        return;

      autoplayTimer = window.setInterval(() => {
        const activeIndex = getActiveIndex();
        const nextIndex = activeIndex >= getMaxIndex() ? 0 : activeIndex + 1;
        scrollToIndex(nextIndex);
      }, autoplayDelay);
    };

    prevButtons.forEach((button) => {
      button.addEventListener('click', () => scrollToIndex(getActiveIndex() - 1));
    });

    nextButtons.forEach((button) => {
      button.addEventListener('click', () => scrollToIndex(getActiveIndex() + 1));
    });

    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollToIndex(getActiveIndex() - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollToIndex(getActiveIndex() + 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        scrollToIndex(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        scrollToIndex(cards.length - 1);
      }
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    carousel.addEventListener('carousel:pause', () => {
      carousel.dataset.carouselPaused = 'true';
      stopAutoplay();
    });
    carousel.addEventListener('pointerdown', stopAutoplay);
    carousel.addEventListener('pointerup', startAutoplay);
    track.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', () => {
      requestUpdate();
      stopAutoplay();
      startAutoplay();
    });
    updateCarousel();
    startAutoplay();
  });

  $$('[data-expand-target]').forEach((button) => {
    const target = document.getElementById(button.dataset.expandTarget);
    if (!target) return;

    const defaultText = button.textContent;
    button.addEventListener('click', () => {
      const isHidden = target.hasAttribute('hidden');
      target.toggleAttribute('hidden', !isHidden);
      button.setAttribute('aria-expanded', String(isHidden));
      button.textContent = isHidden ? 'Réduire' : defaultText;

      if (isHidden) {
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    });
  });

  $$('.video-embed').forEach((embed) => {
    const playButton = $('.play-overlay', embed);
    if (!playButton) return;

    const videoUrl = embed.dataset.url;
    const isInstagram = videoUrl && videoUrl.includes('instagram.com');

    if (isInstagram) {
      playButton.classList.add('play-overlay--instagram');
      const span = playButton.querySelector('span');
      if (span) {
        span.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
      }
      playButton.addEventListener('click', () => {
        window.open(videoUrl, '_blank', 'noopener');
      });
      return;
    }

    const loadVideo = () => {
      const videoId = embed.dataset.videoId;
      const title = embed.dataset.title || 'Vidéo';
      if (!videoId) return;

      const carousel = embed.closest('[data-carousel]');
      if (carousel) carousel.dispatchEvent(new CustomEvent('carousel:pause'));

      if (window.location.protocol === 'file:') {
        if (videoUrl) window.open(videoUrl, '_blank', 'noopener');
        return;
      }

      const params = new URLSearchParams({
        autoplay: '1',
        enablejsapi: '1',
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
      });
      if (window.location.origin && window.location.origin !== 'null') {
        params.set('origin', window.location.origin);
      }

      const iframe = document.createElement('iframe');
      iframe.title = title;
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

      embed.replaceChildren(iframe);
    };

    playButton.addEventListener('click', loadVideo);
  });

  const copyButton = $('#copy-email');
  if (copyButton) {
    const originalText = copyButton.textContent;
    let copyTimer = null;

    const flashButton = (message) => {
      if (copyTimer) {
        clearTimeout(copyTimer);
        copyTimer = null;
      }
      if (copyButton) {
        copyButton.textContent = '✓ Copié !';
        copyButton.classList.add('copied');
        copyTimer = window.setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove('copied');
          copyTimer = null;
        }, 2000);
      }
    };

    copyButton.addEventListener('click', async () => {
      const email = copyButton.dataset.email;
      if (!email) return;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
        } else {
          const temp = document.createElement('textarea');
          temp.value = email;
          temp.setAttribute('readonly', '');
          temp.style.position = 'fixed';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        flashButton('Adresse copiée');
      } catch (error) {
        flashButton('Erreur lors de la copie');
      }
    });
  }

  // Smooth 'Retour en haut' handler for any page (prevents navigation and scrolls to top)
  $$('.back-to-top').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ── Barre de progression lecture ───────────────────────
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const updateProgress = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      progressBar.style.width = ((window.scrollY / total) * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ── Fade mobile contact (Disponibilité / Formations / Expériences) ──
  const contactCarouselMobile = document.querySelector('.contact-carousel-mobile');
  if (contactCarouselMobile) {
    const slides = $$('.contact-carousel-slide', contactCarouselMobile);
    let current = 0;
    let mobileTimer = null;

    const showSlide = (index) => {
      slides[current].classList.remove('is-active');
      current = ((index % slides.length) + slides.length) % slides.length;
      slides[current].classList.add('is-active');
    };

    if (!reducedMotion) {
      mobileTimer = window.setInterval(() => showSlide(current + 1), 3500);
    }
  }
})();
