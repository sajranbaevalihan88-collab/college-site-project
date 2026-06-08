document.addEventListener('DOMContentLoaded', () => {
  // Прогресс бар прокрутки страницы
  const progressBar = document.getElementById('progressBar');
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
  });

  // Логика работы навигации
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (navToggle) {
    navToggle.addEventListener('click', () => mobileMenu.classList.add('open'));
  }
  if (mobileClose) {
    mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
  }

  document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });

  // Reveal-анимация при скролле
  const reveals = document.querySelectorAll('.reveal');
  const revealOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('active');
      
      const countEl = entry.target.querySelector('[data-count]');
      if (countEl && !entry.target.classList.contains('counted')) {
        entry.target.classList.add('counted');
        animateValue(countEl, 0, parseInt(countEl.getAttribute('data-count')), 2000);
      }
      observer.unobserve(entry.target);
    });
  }, revealOptions);

  reveals.forEach(reveal => revealOnScroll.observe(reveal));

  // Утилита для анимации чисел
  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      obj.innerHTML = Math.floor(easeProgress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end;
      }
    };
    window.requestAnimationFrame(step);
  }

  // Печатающийся текст
  const typedTextSpan = document.getElementById('typedText');
  const textArray = ["IT", "Бизнесе", "Дизайне", "Разработке"];
  const typingDelay = 100;
  const erasingDelay = 50;
  const newTextDelay = 2000; 
  let textArrayIndex = 0;
  let charIndex = 0;

  function type() {
    if (charIndex < textArray[textArrayIndex].length) {
      typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
      charIndex++;
      setTimeout(type, typingDelay);
    } else {
      setTimeout(erase, newTextDelay);
    }
  }

  function erase() {
    if (charIndex > 0) {
      typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex - 1);
      charIndex--;
      setTimeout(erase, erasingDelay);
    } else {
      textArrayIndex = (textArrayIndex + 1) % textArray.length;
      setTimeout(type, typingDelay + 1100);
    }
  }
  
  if (typedTextSpan && textArray.length) {
    setTimeout(type, newTextDelay + 250);
  }

  // Эффект наклона карточек
  const tiltElements = document.querySelectorAll('.tilt');
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10;
      const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10;
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  });

  // Аккордеон FAQ
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Кнопка "Наверх"
  const btt = document.getElementById('btt');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) btt.classList.add('visible');
    else btt.classList.remove('visible');
  });
  btt?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Фоновые частицы
  const particlesContainer = document.getElementById('heroParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      Object.assign(particle.style, {
        position: 'absolute',
        width: (Math.random() * 5 + 2) + 'px',
        height: (Math.random() * 5 + 2) + 'px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animation: `float ${Math.random() * 10 + 10}s linear infinite`
      });
      particlesContainer.appendChild(particle);
    }
  }

  // кейфреймы для частиц
  if (!document.getElementById('particle-style')) {
    const style = document.createElement('style');
    style.id = 'particle-style';
    style.innerHTML = `
      @keyframes float {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-1000px) translateX(${Math.random() * 200 - 100}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // чек авторизации
  const token = localStorage.getItem('token');
  if (token) {
    const navBtns = document.getElementById('navAuthBtns');
    if (navBtns) {
      navBtns.innerHTML = '<a href="/dashboard.html" class="btn btn-accent btn-sm"><i class="fas fa-user-circle"></i> Личный кабинет</a>';
    }
    const mobileBtns = document.getElementById('mobileAuthBtns');
    if (mobileBtns) {
      mobileBtns.innerHTML = '<a href="/dashboard.html" class="btn btn-accent"><i class="fas fa-user-circle"></i> Личный кабинет</a>';
    }
  }

  // карусель сертификатов
  const certTrack = document.getElementById('certTrack');
  const certPrev = document.getElementById('certPrev');
  const certNext = document.getElementById('certNext');
  if (certTrack && certPrev && certNext) {
    certNext.addEventListener('click', () => {
      certTrack.scrollBy({ left: 300, behavior: 'smooth' });
    });
    certPrev.addEventListener('click', () => {
      certTrack.scrollBy({ left: -300, behavior: 'smooth' });
    });
  }
});
