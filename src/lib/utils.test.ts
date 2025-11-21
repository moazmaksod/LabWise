import { cn, calculateAge } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional class names', () => {
      expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
    });

    it('should handle arrays of class names', () => {
        expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('should merge tailwind classes', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });
  });

  describe('calculateAge', () => {
    beforeAll(() => {
        // Mock the date to ensure consistent results
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should calculate age correctly for a past date', () => {
      expect(calculateAge('1990-01-01')).toBe(34);
    });

    it('should calculate age correctly when birthday has not occurred yet this year', () => {
        // Born in Feb, current date is Jan
      expect(calculateAge('1990-02-01')).toBe(33);
    });

    it('should calculate age correctly when birthday is today', () => {
      expect(calculateAge('1990-01-15')).toBe(34);
    });

    it('should return 0 if no date provided', () => {
        expect(calculateAge('')).toBe(0);
    });

    it('should handle Date objects', () => {
        expect(calculateAge(new Date('1990-01-01'))).toBe(34);
    });
  });
});
