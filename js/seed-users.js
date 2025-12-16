// Seed a test user for development / testing purposes.
// Email: test@gmail.com
// Password: 1541
(function seedTestUser() {
  const USERS_KEY = 'vnotion:users';
  try {
    const raw = localStorage.getItem(USERS_KEY) || '[]';
    const users = JSON.parse(raw);
    const exists = users.some((u) => u && u.email === 'test@gmail.com');
    if (!exists) {
      users.push({
        id: 'test-' + Date.now().toString(36),
        name: 'Test User',
        email: 'test@gmail.com',
        password: '1541',
        createdAt: Date.now(),
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      console.info('[seed-users] seeded test user: test@gmail.com');
    }
  } catch (e) {
    console.warn('[seed-users] failed to seed test user', e);
  }
})();
