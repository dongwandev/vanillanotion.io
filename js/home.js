// === 테마 관리 ===
const THEME_KEY = 'vnotion:theme';
const themeBtn = document.getElementById('themeBtn');

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.innerHTML = theme === 'light' ? '☀️' : '🌙';
}

let currentTheme = loadTheme();
applyTheme(currentTheme);

themeBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem(THEME_KEY, currentTheme);
});

// === 스크롤 애니메이션 (Intersection Observer) ===
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

// === 네비게이션 바 스크롤 효과 ===
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// === FAQ 아코디언 인터랙션 ===
document.querySelectorAll('.faq-question').forEach((item) => {
  item.addEventListener('click', () => {
    const parent = item.parentElement;
    parent.classList.toggle('active');
  });
});
