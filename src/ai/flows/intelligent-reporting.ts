'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating intelligent, customizable reports with AI-driven interpretations based on patient historical data.
 *
 * - generateIntelligentReport - The function to trigger the report generation flow.
 * - IntelligentReportInput - The input type definition for the flow.
 * - IntelligentReportOutput - The output type definition for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentReportInputSchema = z.object({
  patientId: z.string().describe('The ID of the patient for whom to generate the report.'),
  reportType: z.string().describe('The type of report to generate (e.g., Comprehensive, Summary).'),
  customInstructions: z
    .string()
    .optional()
    .describe('Optional custom instructions for the report generation.'),
});
export type IntelligentReportInput = z.infer<typeof IntelligentReportInputSchema>;

const IntelligentReportOutputSchema = z.object({
  reportContent: z
    .string()
    .describe('The generated report content, including AI-driven interpretations.'),
});
export type IntelligentReportOutput = z.infer<typeof IntelligentReportOutputSchema>;

export async function generateIntelligentReport(input: IntelligentReportInput): Promise<IntelligentReportOutput> {
  return intelligentReportingFlow(input);
}

const intelligentReportingPrompt = ai.definePrompt({
  name: 'intelligentReportingPrompt',
  input: {schema: IntelligentReportInputSchema},
  output: {schema: IntelligentReportOutputSchema},
  prompt: `You are an AI assistant specialized in generating medical reports with intelligent interpretations.

  Based on the patient's historical data and the specified report type, generate a comprehensive report that includes AI-driven interpretations.

  Patient ID: {{{patientId}}}
  Report Type: {{{reportType}}}
  Custom Instructions: {{{customInstructions}}}

  Ensure the report is accurate, informative, and aids in clinical decision-making and process improvement.
  `,
});

const intelligentReportingFlow = ai.defineFlow(
  {
    name: 'intelligentReportingFlow',
    inputSchema: IntelligentReportInputSchema,
    outputSchema: IntelligentReportOutputSchema,
  },
  async input => {
    const {output} = await intelligentReportingPrompt(input);
    return output!;
  }
);
