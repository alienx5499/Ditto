import { z } from 'zod';

/**
 * Subset of fields Ditto needs from a Google Cloud service account JSON.
 */
export const gcpCredentialsSchema = z.object({
  project_id: z.string().min(1, 'gcp.json must contain a project_id'),
  client_email: z.string().email('gcp.json must contain a valid client_email'),
  private_key: z.string().min(1, 'gcp.json must contain a private_key'),
});

export type GcpCredentials = z.infer<typeof gcpCredentialsSchema>;
