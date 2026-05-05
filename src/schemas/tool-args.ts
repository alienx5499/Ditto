import { z } from 'zod';

/**
 * zod schemas for each built-in tool's arguments.
 * Tools accept either a structured object OR a primitive string (legacy single-arg form
 * used by minimal LLM payloads).
 */

const safePath = z
  .string()
  .min(1)
  .max(2048)
  .refine((p) => !p.includes('\u0000'), 'Path must not contain null bytes');

export const executeCommandArgsSchema = z.union([
  z.string().min(1),
  z.object({
    cmd: z.string().min(1),
    timeoutMs: z.number().int().positive().max(120_000).optional(),
  }),
]);

export const writeFileArgsSchema = z.object({
  path: safePath,
  contents: z.string(),
});

export const readFileArgsSchema = z.union([safePath, z.object({ path: safePath })]);

export const makeDirectoryArgsSchema = z.union([safePath, z.object({ path: safePath })]);

export const listDirectoryArgsSchema = z.union([safePath, z.object({ path: safePath })]);

export const fetchUrlArgsSchema = z.union([z.string().url(), z.object({ url: z.string().url() })]);

export const openInBrowserArgsSchema = z.union([safePath, z.object({ path: safePath })]);

export type ExecuteCommandArgs = z.infer<typeof executeCommandArgsSchema>;
export type WriteFileArgs = z.infer<typeof writeFileArgsSchema>;
export type ReadFileArgs = z.infer<typeof readFileArgsSchema>;
export type MakeDirectoryArgs = z.infer<typeof makeDirectoryArgsSchema>;
export type ListDirectoryArgs = z.infer<typeof listDirectoryArgsSchema>;
export type FetchUrlArgs = z.infer<typeof fetchUrlArgsSchema>;
export type OpenInBrowserArgs = z.infer<typeof openInBrowserArgsSchema>;
