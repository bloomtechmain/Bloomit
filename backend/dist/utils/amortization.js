"use strict";
/**
 * Amortization calculation utilities for loan interest tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMonthlyPayment = calculateMonthlyPayment;
exports.generateAmortizationSchedule = generateAmortizationSchedule;
exports.calculateTotalInterest = calculateTotalInterest;
exports.calculateRemainingInterest = calculateRemainingInterest;
/**
 * Calculate monthly payment for a loan with interest
 * Formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
 * where:
 *   M = Monthly payment
 *   P = Principal (loan amount)
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Number of payments
 */
function calculateMonthlyPayment(principal, annualInterestRate, numberOfPayments) {
    if (annualInterestRate === 0) {
        return principal / numberOfPayments;
    }
    const monthlyRate = annualInterestRate / 12 / 100;
    const payment = principal *
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return Math.round(payment * 100) / 100; // Round to 2 decimal places
}
/**
 * Generate complete amortization schedule
 */
function generateAmortizationSchedule(principal, annualInterestRate, numberOfPayments, startDate, monthlyPayment) {
    const schedule = [];
    // If no monthly payment provided, calculate it
    const payment = monthlyPayment || calculateMonthlyPayment(principal, annualInterestRate, numberOfPayments);
    const monthlyRate = annualInterestRate / 12 / 100;
    let remainingBalance = principal;
    for (let i = 1; i <= numberOfPayments; i++) {
        // Calculate due date
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        // Calculate interest and principal portions
        const interestPortion = remainingBalance * monthlyRate;
        let principalPortion = payment - interestPortion;
        // Handle last payment to ensure we reach zero
        if (i === numberOfPayments) {
            principalPortion = remainingBalance;
        }
        remainingBalance -= principalPortion;
        // Ensure remaining balance doesn't go negative due to rounding
        if (remainingBalance < 0.01) {
            remainingBalance = 0;
        }
        schedule.push({
            installmentNumber: i,
            dueDate: dueDate.toISOString().split('T')[0],
            scheduledPayment: Math.round(payment * 100) / 100,
            principalPortion: Math.round(principalPortion * 100) / 100,
            interestPortion: Math.round(interestPortion * 100) / 100,
            remainingBalance: Math.round(remainingBalance * 100) / 100
        });
    }
    return schedule;
}
/**
 * Calculate total interest for a loan
 */
function calculateTotalInterest(principal, monthlyPayment, numberOfPayments) {
    const totalPaid = monthlyPayment * numberOfPayments;
    const totalInterest = totalPaid - principal;
    return Math.round(totalInterest * 100) / 100;
}
/**
 * Calculate remaining interest based on current installment
 */
function calculateRemainingInterest(schedule, currentInstallmentNumber) {
    const remainingInterest = schedule
        .filter(item => item.installmentNumber > currentInstallmentNumber)
        .reduce((sum, item) => sum + item.interestPortion, 0);
    return Math.round(remainingInterest * 100) / 100;
}
