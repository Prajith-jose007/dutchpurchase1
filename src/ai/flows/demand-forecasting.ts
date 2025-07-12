
'use server';

/**
 * @fileOverview An AI agent that forecasts demand for ingredients based on historical order data.
 *
 * - forecastDemand - A function that handles the demand forecasting process.
 * - ForecastDemandInput - The input type for the forecastDemand function.
 * - ForecastDemandOutput - The return type for the forecastDemand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ForecastDemandInputSchema = z.object({
  historicalOrderData: z
    .string()
    .describe('Historical order data in CSV format, including date, item code, quantity, and branch.'),
  forecastHorizon: z
    .string()
    .describe('The forecast horizon, such as "next week", "next month", or "next quarter".'),
  branch: z.string().describe('The specific branch for which the demand forecast is needed.'),
});
export type ForecastDemandInput = z.infer<typeof ForecastDemandInputSchema>;

const ForecastDemandOutputSchema = z.object({
  forecastedDemand: z
    .string()
    .describe(
      'A list of ingredients and their forecasted demand for the specified horizon, including item code, item description, and quantity.'
    ),
  confidenceLevel: z.string().describe('The confidence level of the forecast (e.g., high, medium, low).'),
  recommendations: z
    .string()
    .describe(
      'Recommendations for optimizing inventory levels based on the forecasted demand, such as adjusting order quantities or safety stock levels.'
    ),
});
export type ForecastDemandOutput = z.infer<typeof ForecastDemandOutputSchema>;

export async function forecastDemand(input: ForecastDemandInput): Promise<ForecastDemandOutput> {
  return forecastDemandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecastDemandPrompt',
  input: {schema: ForecastDemandInputSchema},
  output: {schema: ForecastDemandOutputSchema},
  prompt: `You are an AI-powered demand forecasting tool for restaurant ingredients. Analyze the historical order data and provide a forecast for the specified horizon and branch.

Historical Order Data (CSV format):
{{historicalOrderData}}

Forecast Horizon: {{forecastHorizon}}
Branch: {{branch}}

Based on this data, generate a demand forecast, estimate the confidence level, and provide recommendations for inventory optimization.

Output Format:
Forecasted Demand: (item code, item description, quantity)
Confidence Level: (high, medium, low)
Recommendations: (inventory optimization strategies)

Ensure that the output adheres to the ForecastDemandOutputSchema description.`,
});

const forecastDemandFlow = ai.defineFlow(
  {
    name: 'forecastDemandFlow',
    inputSchema: ForecastDemandInputSchema,
    outputSchema: ForecastDemandOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
