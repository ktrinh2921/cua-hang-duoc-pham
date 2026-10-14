const { randomInt } = require('node:crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '@#$%&*!';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function pick(characters) {
    return characters[randomInt(characters.length)];
}

function generateTempPassword() {
    const characters = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
    while (characters.length < 12) characters.push(pick(ALL));

    for (let i = characters.length - 1; i > 0; i -= 1) {
        const j = randomInt(i + 1);
        [characters[i], characters[j]] = [characters[j], characters[i]];
    }
    return characters.join('');
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return 'Mật khẩu không được để trống';
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
    if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
    if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt';
    return null;
}

module.exports = { generateTempPassword, validatePassword };
