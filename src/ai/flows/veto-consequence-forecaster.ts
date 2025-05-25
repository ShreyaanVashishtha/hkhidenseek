'use server';

/**
 * @fileOverview A flow that uses an LLM to generate a description of the consequences of vetoing a challenge.
 *
 * - vetoConsequenceForecaster - A function that generates a description of the consequences of vetoing a challenge.
 * - VetoConsequenceForecasterInput - The input type for the vetoConsequenceForecaster function.
 * - VetoConsequenceForecasterOutput - The return type for the vetoConsequenceForecaster function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VetoConsequenceForecasterInputSchema = z.object({
  challengeDescription: z.string().describe('The description of the challenge.'),
});
export type VetoConsequenceForecasterInput = z.infer<typeof VetoConsequenceForecasterInputSchema>;

const VetoConsequenceForecasterOutputSchema = z.object({
  consequenceDescription: z.string().describe('A description of the consequences of vetoing the challenge.'),
});
export type VetoConsequenceForecasterOutput = z.infer<typeof VetoConsequenceForecasterOutputSchema>;

export async function vetoConsequenceForecaster(
  input: VetoConsequenceForecasterInput
): Promise<VetoConsequenceForecasterOutput> {
  return vetoConsequenceForecasterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'vetoConsequenceForecasterPrompt',
  input: {schema: VetoConsequenceForecasterInputSchema},
  output: {schema: VetoConsequenceForecasterOutputSchema},
  prompt: `You are an assistant that describes the consequences of vetoing a challenge in a hide and seek game.
  The game is played in Hong Kong using the MTR.
  The challenges are physical or location-based tasks that seekers complete to earn coins.
  If a challenge is vetoed, seekers receive a 15-minute penalty (no MTR use and no questions).
  Describe the consequences of vetoing the following challenge:
  {{challengeDescription}}`,
});

const vetoConsequenceForecasterFlow = ai.defineFlow(
  {
    name: 'vetoConsequenceForecasterFlow',
    inputSchema: VetoConsequenceForecasterInputSchema,
    outputSchema: VetoConsequenceForecasterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
