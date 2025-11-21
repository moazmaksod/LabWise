import { smartDataEntry } from './smart-data-entry';

// Mock Genkit AI
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn().mockReturnValue(
      jest.fn().mockResolvedValue({
        output: {
          patientName: 'John Doe',
          address: '123 Main St',
          dateOfBirth: '1980-01-01',
          insurancePolicyNumber: 'POL123456'
        }
      })
    ),
    defineFlow: jest.fn().mockImplementation((config, handler) => handler),
  }
}));

// Mock Genkit Zod
jest.mock('genkit', () => ({
    z: {
        object: jest.fn().mockReturnThis(),
        string: jest.fn().mockReturnThis(),
        describe: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        infer: jest.fn(),
    }
}));

// Mock GoogleAI
jest.mock('@genkit-ai/googleai', () => ({
    googleAI: {
        model: jest.fn(),
    }
}));

describe('smartDataEntry', () => {
  it('should extract patient data from an image', async () => {
    const input = {
      photoDataUri: 'data:image/png;base64,fakebased64string'
    };

    const result = await smartDataEntry(input);

    expect(result).toEqual({
      patientName: 'John Doe',
      address: '123 Main St',
      dateOfBirth: '1980-01-01',
      insurancePolicyNumber: 'POL123456'
    });
  });
});
