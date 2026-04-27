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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = Number.parseInt(el.dataset.count || el.textContent, 10) || 0;
    const duration = 1100;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * progress);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(runCounter);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $$('[data-carousel]').forEach((carousel) => {
    const track = $('.rail-track', carousel);
    if (!track) return;

    const scrollNext = () => {
      const firstItem = track.firstElementChild;
      if (!firstItem) return;

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = firstItem.getBoundingClientRect().width + gap;
      const endReached = track.scrollLeft + track.clientWidth >= track.scrollWidth - step * 0.45;

      track.scrollTo({
        left: endReached ? 0 : track.scrollLeft + step,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    };

    let timer = null;
    const start = () => {
      if (reducedMotion || timer) return;
      timer = window.setInterval(scrollNext, 4200);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);
    start();
  });

  $$('[data-carousel-prev], [data-carousel-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.carouselPrev || button.dataset.carouselNext;
      const track = document.getElementById(targetId);
      const firstItem = track && track.firstElementChild;
      if (!track || !firstItem) return;

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = firstItem.getBoundingClientRect().width + gap;
      const direction = button.dataset.carouselPrev ? -1 : 1;

      track.scrollBy({
        left: step * direction,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    });
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

    const loadVideo = () => {
      const videoId = embed.dataset.videoId;
      const title = embed.dataset.title || 'Vidéo';
      const videoUrl = embed.dataset.url;
      if (!videoId) return;

      if (window.location.protocol === 'file:') {
        if (videoUrl) window.open(videoUrl, '_blank', 'noopener');
        return;
      }

      const params = new URLSearchParams({
        autoplay: '1',
        enablejsapi: '1',
        rel: '0',
        modestbranding: '1',
        playsinline: '1'
      });

      if (window.location.origin && window.location.origin !== 'null') {
        params.set('origin', window.location.origin);
      }

      const iframe = document.createElement('iframe');
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

      embed.replaceChildren(iframe);
      iframe.focus();
    };

    playButton.addEventListener('click', loadVideo);
  });

  const copyButton = $('#copy-email');
  if (copyButton) {
    const originalText = copyButton.textContent;
    const originalBg = copyButton.style.backgroundColor || '';
    let copyTimer = null;

    const flashButton = (message, color = 'var(--teal)') => {
      if (copyTimer) {
        clearTimeout(copyTimer);
        copyTimer = null;
      }
      if (copyButton) {
        copyButton.textContent = '✓ Copié !';
        copyButton.style.backgroundColor = color;
        copyTimer = window.setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.backgroundColor = originalBg;
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
        flashButton('Adresse copiée', 'var(--teal)');
      } catch (error) {
        flashButton('Erreur lors de la copie', 'var(--red)');
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
})();
