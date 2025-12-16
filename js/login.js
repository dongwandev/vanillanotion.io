// Theme Logic
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

// Login Logic
const form = document.getElementById('loginForm');
const btn = document.getElementById('submitBtn');
const USERS_KEY = 'vnotion:users';

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value;

  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (err) {
      users = [];
    }

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      localStorage.setItem('vnotion:currentUser', JSON.stringify(user));
      // 버튼 성공 피드백
      btn.style.background =
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      btn.querySelector('.text').style.display = 'block';
      btn.querySelector('.text').innerText = 'SUCCESS!';
      btn.querySelector('.spinner').style.display = 'none';

      setTimeout(() => {
        location.href = 'app.html';
      }, 800);
    } else {
      // 실패 피드백 (흔들림 효과 추가 가능)
      const card = document.querySelector('.login-card');
      card.style.animation = 'none';
      card.offsetHeight; /* trigger reflow */
      card.style.animation = 'shake 0.5s';

      // CSS Shake animation dynamically added just for error
      if (!document.getElementById('shakeStyle')) {
        const style = document.createElement('style');
        style.id = 'shakeStyle';
        style.innerHTML = `
                @keyframes shake {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    50% { transform: translateX(10px); }
                    75% { transform: translateX(-10px); }
                    100% { transform: translateX(0); }
                }
              `;
        document.head.appendChild(style);
      }

      alert('이메일 또는 비밀번호가 올바르지 않습니다.');
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }, 1500);
});
