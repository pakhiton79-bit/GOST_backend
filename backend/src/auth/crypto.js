// Аккаунты: пароли (scrypt с солью), токены сессий и коды подтверждения -
// встроенный модуль crypto Node.js, без сторонних зависимостей.
const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;

// scrypt - асинхронно (около 50 мс на хеш): пока считается, сервер отвечает
// другим посетителям (при потоке входов сайт не подвисает).
function scrypt(password, salt, len) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, len, (err, key) => err ? reject(err) : resolve(key)));
}
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN);
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');
}
async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[2], 'hex');
  const hash = await scrypt(password, Buffer.from(parts[1], 'hex'), expected.length);
  return crypto.timingSafeEqual(hash, expected);
}

// Токен сессии - в cookie у пользователя, на сервере хранится только его хэш.
function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}
function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Код подтверждения - 6 цифр; на сервере хранится хэш (с почтой как солью).
function newCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}
function hashCode(email, code) {
  return sha256(email + ':' + code);
}
function sameHash(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { hashPassword, verifyPassword, newToken, sha256, newCode, hashCode, sameHash };
