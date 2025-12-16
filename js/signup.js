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

// Signup Logic
const form = document.getElementById('signupForm');
const btn = document.getElementById('submitBtn');
const USERS_KEY = 'vnotion:users';

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('inputName').value.trim();
  const email = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value;

  if (!name || !email || !password) return;

  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (err) {
      users = [];
    }

    // 중복 이메일 체크
    const exists = users.find((user) => user.email === email);
    if (exists) {
      // 에러 시 흔들림 애니메이션 효과
      const card = document.querySelector('.login-card');
      card.style.animation = 'none';
      card.offsetHeight; /* trigger reflow */
      card.style.animation = 'shake 0.5s';

      // 스타일 동적 추가 (흔들림 효과)
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

      alert('이미 존재하는 이메일입니다.');
      btn.classList.remove('loading');
      btn.disabled = false;
      return;
    }

    // 새 유저 생성
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name,
      email: email,
      password: password,
      createdAt: Date.now(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // 성공 피드백
    btn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    btn.querySelector('.text').style.display = 'block';
    btn.querySelector('.text').innerText = 'WELCOME ABOARD!';
    btn.querySelector('.spinner').style.display = 'none';

    setTimeout(() => {
      alert('회원가입 완료! 로그인 페이지로 이동합니다.');
      location.href = 'login.html';
    }, 800);
  }, 1500);
});
