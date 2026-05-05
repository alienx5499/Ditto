import type { ToolDescriptor } from '../types/index.js';
import { ToolRegistry } from './registry.js';
import { executeCommandTool } from './execute-command.js';
import { writeFileTool } from './write-file.js';
import { readFileTool } from './read-file.js';
import { makeDirectoryTool } from './make-directory.js';
import { listDirectoryTool } from './list-directory.js';
import { fetchUrlTool } from './fetch-url.js';
import { openInBrowserTool } from './open-in-browser.js';
import { extractSiteTool } from './extract-site.js';

export const BUILTIN_TOOLS: ToolDescriptor[] = [
  executeCommandTool as unknown as ToolDescriptor,
  writeFileTool as unknown as ToolDescriptor,
  readFileTool as unknown as ToolDescriptor,
  makeDirectoryTool as unknown as ToolDescriptor,
  listDirectoryTool as unknown as ToolDescriptor,
  fetchUrlTool as unknown as ToolDescriptor,
  openInBrowserTool as unknown as ToolDescriptor,
  extractSiteTool as unknown as ToolDescriptor,
];

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of BUILTIN_TOOLS) registry.register(tool);
  return registry;
}

export { ToolRegistry } from './registry.js';
