import type { ParsedStep } from '../schemas/step.js';
import { renderStep } from '../ui/step-renderer.js';

/**
 * Renders a step. Pure presentation - the agent owns control flow.
 * Kept as a tiny module for SRP and to make the renderer trivially mockable in tests.
 */
export class StepRouter {
  render(step: ParsedStep): void {
    renderStep(step);
  }
}
