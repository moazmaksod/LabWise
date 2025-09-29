'use server';

import {
  smartDataEntry,
  type SmartDataEntryInput,
  type SmartDataEntryOutput,
} from '@/ai/flows/smart-data-entry';
import {
  generateIntelligentReport,
  type IntelligentReportInput,
  type IntelligentReportOutput
} from '@/ai/flows/intelligent-reporting';

export async function handleSmartDataEntry(
  input: SmartDataEntryInput
): Promise<SmartDataEntryOutput | { error: string }> {
  try {
    const result = await smartDataEntry(input);
    return result;
  } catch (e: any) {
    console.error(e);
    return { error: 'Failed to process document. Please try again.' };
  }
}

export async function handleGenerateReport(
  input: IntelligentReportInput
): Promise<IntelligentReportOutput | { error: string }> {
  try {
    // In a real app, you would fetch real data here based on patientId
    const mockReportData = {
      ...input,
      reportContent: `
        Report Type: ${input.reportType}
        Patient ID: ${input.patientId}
        ---
        AI Interpretation based on historical data:
        - Glucose levels show a slightly increasing trend over the past 6 months.
        - Cholesterol levels remain stable and within the normal range.
        - Kidney function (Creatinine, GFR) is normal.
        
        Custom Instructions considered: ${input.customInstructions || 'None'}
      `
    }
    // This simulates the AI generation based on fetched data
    // In a real scenario, you'd pass a more complex prompt to the AI
    return { reportContent: mockReportData.reportContent };
    
  } catch (e: any) {
    console.error(e);
    return { error: 'Failed to generate report. Please try again.' };
  }
}
