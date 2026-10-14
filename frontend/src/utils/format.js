/**
 * Format utility functions
 */

import { CURRENCY } from './constants';

/**
 * Format currency
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
    if (value === null || value === undefined) return '0' + CURRENCY;
    return new Intl.NumberFormat('vi-VN').format(value) + ' ' + CURRENCY;
}

/**
 * Format date
 * @param {Date|string} date
 * @param {string} format
 * @returns {string}
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * Get days until date
 * @param {Date|string} date
 * @returns {number}
 */
export function daysUntil(date) {
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Truncate text
 * @param {string} text
 * @param {number} maxLength
 */
export function truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Format currency ngắn gọn (cho Stat card, tránh tràn 2 dòng)
 *  - >= 1 tỷ  → "1.09 tỷ ₫"
 *  - >= 1 triệu → "234.5 tr ₫"
 *  - < 1 triệu → "12.345 ₫"
 *
 * Giữ đủ chữ số có nghĩa (1 decimal khi rút gọn).
 */
export function formatCurrencyCompact(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000_000) {
        return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + ' tỷ ₫';
    }
    if (n >= 1_000_000) {
        return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr ₫';
    }
    return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
}
