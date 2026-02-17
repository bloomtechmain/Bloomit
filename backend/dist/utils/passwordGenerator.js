"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecurePassword = generateSecurePassword;
exports.validatePasswordStrength = validatePasswordStrength;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a secure random password that meets the following requirements:
 * - At least 10 characters long
 * - Contains at least 1 uppercase letter
 * - Contains at least 1 lowercase letter
 * - Contains at least 1 number
 * - Contains at least 1 special symbol
 */
function generateSecurePassword(length = 12) {
    if (length < 10) {
        throw new Error('Password length must be at least 10 characters');
    }
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    // Ensure at least one character from each required set
    const requiredChars = [
        uppercase[crypto_1.default.randomInt(0, uppercase.length)],
        lowercase[crypto_1.default.randomInt(0, lowercase.length)],
        numbers[crypto_1.default.randomInt(0, numbers.length)],
        symbols[crypto_1.default.randomInt(0, symbols.length)]
    ];
    // Fill the rest with random characters from all sets
    const allChars = uppercase + lowercase + numbers + symbols;
    const remainingLength = length - requiredChars.length;
    const remainingChars = [];
    for (let i = 0; i < remainingLength; i++) {
        remainingChars.push(allChars[crypto_1.default.randomInt(0, allChars.length)]);
    }
    // Combine and shuffle
    const passwordArray = [...requiredChars, ...remainingChars];
    // Fisher-Yates shuffle for cryptographic randomness
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = crypto_1.default.randomInt(0, i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    return passwordArray.join('');
}
/**
 * Validates if a password meets the security requirements
 */
function validatePasswordStrength(password) {
    const errors = [];
    if (password.length < 10) {
        errors.push('Password must be at least 10 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        errors.push('Password must contain at least one special symbol');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
