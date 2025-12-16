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

// Forgot Password Logic
const form = document.getElementById('resetForm');
const btn = document.getElementById('submitBtn');
const USERS_KEY = 'vnotion:users';

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('inputEmail').value.trim();
  if (!email) return;

  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (err) {
      users = [];
    }

    const user = users.find((u) => u.email === email);

    if (user) {
      // 성공 시 UI 피드백
      btn.style.background =
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      btn.querySelector('.text').style.display = 'block';
      btn.querySelector('.text').innerText = 'SIGNAL SENT!';
      btn.querySelector('.spinner').style.display = 'none';

      setTimeout(() => {
        alert(`[시스템 메시지] 암호 통신 수신 완료:\n"${user.password}"`);
        location.href = 'login.html';
      }, 800);
    } else {
      // 실패 시 흔들림 효과
      const card = document.querySelector('.login-card');
      card.style.animation = 'none';
      card.offsetHeight;
      card.style.animation = 'shake 0.5s';

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

      alert('식별되지 않은 신호입니다. (이메일을 확인해주세요)');
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }, 1500);
});
