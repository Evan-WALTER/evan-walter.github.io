/* main.js — animations, menu, theme, form handling, modal video */
(() => {
  // Helpers
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  // Set current year
  $('#year') && ($('#year').textContent = new Date().getFullYear());

  // Menu toggle (mobile, accessible, fixes)
  const navToggle = $('#nav-toggle');
  const menu = $('#menu');
  if (navToggle && menu) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        // Focus first link for accessibility
        const firstLink = menu.querySelector('a');
        firstLink && firstLink.focus();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !navToggle.contains(e.target) && menu.classList.contains('open')) {
        menu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close with Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });

    // Close when selecting a link
    $$('#menu a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // Single light theme — no theme toggle needed

  // Reveal on scroll
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          obs.unobserve(e.target);
        }
      });
    }, {threshold: 0.12});
    revealEls.forEach(el => obs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  // Counters
  const counters = $$('[data-count]');
  const runCounter = (el, to) => {
    const start = 0, duration = 1200;
    let startTime = null;
    const step = (t) => {
      if (!startTime) startTime = t;
      const progress = Math.min((t - startTime) / duration, 1);
      el.textContent = Math.floor(progress * (to - start) + start);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    const obsC = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const to = parseInt(e.target.getAttribute('data-count'), 10) || parseInt(e.target.textContent, 10) || 0;
          runCounter(e.target, to);
          obsC.unobserve(e.target);
        }
      });
    }, {threshold: 0.4});
    counters.forEach(c => obsC.observe(c));
  } else {
    counters.forEach(c => runCounter(c, parseInt(c.getAttribute('data-count'), 10) || 0));
  }

  // Contact form — sends to Formspree by default; fallback to mailto if not configured
  const contactForm = $('#contact-form');
  const statusEl = $('#form-status');
  if (contactForm) {
    contactForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      statusEl.textContent = 'Envoi en cours…';
      const endpoint = contactForm.dataset.endpoint || '';
      const formData = new FormData(contactForm);

      // Basic client-side validation (HTML handles required, but double-check)
      const email = formData.get('email') || '';
      if (!email || !email.includes('@')) {
        statusEl.textContent = 'Adresse email invalide.';
        return;
      }

      try {
        if (endpoint && !endpoint.includes('YOUR_FORMSPREE_ENDPOINT')) {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            contactForm.reset();
            statusEl.textContent = 'Message envoyé — merci !';
          } else {
            const data = await res.json().catch(() => ({}));
            statusEl.textContent = data.error || 'Erreur lors de l’envoi. Essaie plus tard.';
          }
        } else {
          // fallback: open mail client (mailto) with subject + body
          const name = formData.get('name') || '';
          const subject = formData.get('subject') || 'Contact portfolio';
          const message = formData.get('message') || '';
          const mailto = `mailto:ton.email@exemple.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(name + '\n\n' + message)}`;
          window.location.href = mailto;
          statusEl.textContent = 'Ouverture du client mail…';
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = 'Erreur réseau — vérifie ta connexion.';
      }
    });
  }

  // Video modal (fix miniature & modal)
  const videoModal = $('#video-modal');
  const modalBody = videoModal && $('.modal-body', videoModal);
  const modalClose = videoModal && $('.modal-close', videoModal);
  const openVideo = (src) => {
    if (!videoModal || !modalBody) return;
    let embedSrc = src;
    // Support both watch?v= and embed/ URLs
    let videoId = null;
    if (src.includes('youtube.com/watch')) {
      videoId = src.split('v=')[1]?.split('&')[0];
    } else if (src.includes('youtu.be/')) {
      videoId = src.split('youtu.be/')[1]?.split('?')[0];
    } else if (src.includes('youtube.com/embed/')) {
      videoId = src.split('embed/')[1]?.split('?')[0];
    }
    if (videoId) {
      embedSrc = `https://www.youtube.com/embed/${videoId}`;
    }
    // Si pas d'ID, ouvrir sur YouTube
    if (!videoId) {
      window.open(src, '_blank');
      return;
    }
    videoModal.setAttribute('aria-hidden', 'false');
    modalBody.innerHTML = `<iframe src="${embedSrc}?autoplay=1" title="Vidéo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;height:56vw;max-height:60vh;min-height:240px;"></iframe>`;
    modalClose && modalClose.focus();
  };
  const closeVideo = () => {
    if (!videoModal || !modalBody) return;
    videoModal.setAttribute('aria-hidden', 'true');
    modalBody.innerHTML = '';
  };
  // attach to cards
  $$('.video-card').forEach(card => {
    card.addEventListener('click', () => openVideo(card.dataset.video));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVideo(card.dataset.video);
      }
    });
  });
  modalClose && modalClose.addEventListener('click', closeVideo);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
  });
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideo();
    });
  }

  // Small polish: card hover
  $$('.card').forEach(c => {
    c.addEventListener('mouseenter', () => c.style.transform = 'translateY(-6px)');
    c.addEventListener('mouseleave', () => c.style.transform = '');
  });

})();