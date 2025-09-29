'use server';

/**
 * @fileOverview An OCR-powered data extraction flow for patient information.
 *
 * - smartDataEntry - A function that extracts patient data from a document image.
 * - SmartDataEntryInput - The input type for the smartDataEntry function.
 * - SmartDataEntryOutput - The return type for the smartDataEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const SmartDataEntryInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SmartDataEntryInput = z.infer<typeof SmartDataEntryInputSchema>;

const SmartDataEntryOutputSchema = z.object({
  patientName: z.string().describe("The patient's full name.").optional(),
  address: z.string().describe("The patient's address.").optional(),
  dateOfBirth: z.string().describe("The patient's date of birth (YYYY-MM-DD).").optional(),
  insurancePolicyNumber: z.string().describe("The patient's insurance policy number.").optional(),
});
export type SmartDataEntryOutput = z.infer<typeof SmartDataEntryOutputSchema>;

export async function smartDataEntry(input: SmartDataEntryInput): Promise<SmartDataEntryOutput> {
  return smartDataEntryFlow(input);
}

const smartDataEntryPrompt = ai.definePrompt({
  name: 'smartDataEntryPrompt',
  input: {schema: SmartDataEntryInputSchema},
  output: {schema: SmartDataEntryOutputSchema},
  prompt: `You are an OCR reader that extracts data from a document image.

  Extract the following fields from the image:
  - Patient Name
  - Address
  - Date of Birth
  - Insurance Policy Number

  Return the extracted information in JSON format.

  Image: {{media url=photoDataUri}}
  `,
  config: {
    model: googleAI.model('gemini-2.5-flash'),
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const smartDataEntryFlow = ai.defineFlow(
  {
    name: 'smartDataEntryFlow',
    inputSchema: SmartDataEntryInputSchema,
    outputSchema: SmartDataEntryOutputSchema,
  },
  async input => {
    const {output} = await smartDataEntryPrompt(input);
    return output!;
  }
);
