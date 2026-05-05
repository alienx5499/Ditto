import { z } from 'zod';

/**
 * Schemas for the JSON shape Ditto requires the LLM to output.
 *
 * Every assistant turn MUST be a single object matching one of these.
 */

const baseStep = z.object({
  step: z.enum(['START', 'THINK', 'TOOL', 'OBSERVE', 'OUTPUT']),
});

export const startStepSchema = baseStep.extend({
  step: z.literal('START'),
  content: z.string().min(1),
});

export const thinkStepSchema = baseStep.extend({
  step: z.literal('THINK'),
  content: z.string().min(1),
});

export const toolStepSchema = baseStep.extend({
  step: z.literal('TOOL'),
  tool_name: z.string().min(1),
  tool_args: z.unknown().optional(),
});

export const observeStepSchema = baseStep.extend({
  step: z.literal('OBSERVE'),
  content: z.unknown(),
});

export const outputStepSchema = baseStep.extend({
  step: z.literal('OUTPUT'),
  content: z.string().min(1),
});

export const stepUnionSchema = z.discriminatedUnion('step', [
  startStepSchema,
  thinkStepSchema,
  toolStepSchema,
  observeStepSchema,
  outputStepSchema,
]);

export type StartStep = z.infer<typeof startStepSchema>;
export type ThinkStep = z.infer<typeof thinkStepSchema>;
export type ToolStep = z.infer<typeof toolStepSchema>;
export type ObserveStep = z.infer<typeof observeStepSchema>;
export type OutputStep = z.infer<typeof outputStepSchema>;
export type ParsedStep = z.infer<typeof stepUnionSchema>;
