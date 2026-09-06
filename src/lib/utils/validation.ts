/**
 * Email validation for college first-year students.
 * Accepts patterns like:
 *   - firstyear2026@college.edu
 *   - fy2026.john@college.edu
 *   - FY2026-1234@college.edu
 */

const COLLEGE_EMAIL_PATTERNS = [
	// TKMCE official email domain (e.g. student@tkmce.ac.in, rollno@tkmce.ac.in)
	/^[\w.+-]+@(?:[\w-]+\.)*tkmce\.ac\.in$/i,
	// Support first-year and college .edu emails
	/^[\w.+-]+@[\w.-]+\.edu$/i
];

const VALID_PASSCODES = ['ORIENT2026', 'FRESH2026', 'TKMCE2026'];

export function validateEmail(email: string): { valid: boolean; message: string } {
	if (!email || email.trim().length === 0) {
		return { valid: false, message: 'Email is required' };
	}

	const trimmed = email.trim().toLowerCase();

	if (!trimmed.includes('@')) {
		return { valid: false, message: 'Enter a valid email address' };
	}

	const isCollegeEmail = COLLEGE_EMAIL_PATTERNS.some((pattern) => pattern.test(trimmed));

	if (!isCollegeEmail) {
		return { valid: false, message: 'Use your college email (@tkmce.ac.in)' };
	}

	// Check for older senior batch indicators (e.g. 2022, 2023, 2024, 2025 or 25cs, 24ec)
	const olderYearPattern = /(?:202[0-5]|2[0-5][a-z]{2})/i;
	if (olderYearPattern.test(trimmed)) {
		return { valid: false, message: 'Only 1st-year students (Batch 2026) can participate!' };
	}

	return { valid: true, message: 'Looks good!' };
}

export function validateYear(year: string): { valid: boolean; message: string } {
	if (!year || year !== '1st Year') {
		return { valid: false, message: 'Secret Admirer is exclusive to 1st-year students!' };
	}
	return { valid: true, message: '' };
}

export function validatePasscode(passcode: string): boolean {
	return VALID_PASSCODES.includes(passcode.trim().toUpperCase());
}

export function validateName(name: string): { valid: boolean; message: string } {
	if (!name || name.trim().length === 0) {
		return { valid: false, message: 'Name is required' };
	}
	if (name.trim().length < 2) {
		return { valid: false, message: 'Name must be at least 2 characters' };
	}
	if (name.trim().length > 30) {
		return { valid: false, message: 'Name must be under 30 characters' };
	}
	return { valid: true, message: '' };
}
