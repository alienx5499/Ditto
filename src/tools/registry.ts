import { ToolError } from '../errors/index.js';
import type { ToolDescriptor, ToolExecutionContext } from '../types/index.js';

/**
 * Open/Closed-friendly tool registry. Adding a new tool means dropping a file
 * in `src/tools/` and calling `register()`. Agent loop never changes.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDescriptor>();

  register(tool: ToolDescriptor): void {
    this.tools.set(tool.name, tool as ToolDescriptor);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): ToolDescriptor[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError(name, `Unknown tool: ${name}`, { code: 'TOOL_UNKNOWN' });
    }
    return tool.execute(args as never, ctx);
  }
}
