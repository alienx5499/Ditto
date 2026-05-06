import { ParseError, ToolError } from '../errors/index.js';
import type { ILLMProvider } from '../providers/llm-provider.js';
import { stepUnionSchema, type ParsedStep, type ToolStep } from '../schemas/step.js';
import { renderTurnFooter } from '../ui/step-renderer.js';
import { startSpinner } from '../ui/spinner.js';
import { newTraceId } from '../utils/trace-id.js';
import { parseLlmJson, stringifyForLog } from '../utils/safe-json.js';
import { getLogger } from '../utils/logger.js';
import type { InlineImage, ResolvedConfig } from '../types/index.js';
import { Conversation } from './conversation.js';
import { StepRouter } from './step-router.js';
import type { ToolRegistry } from '../tools/registry.js';

const MAX_ITERATIONS = 80;
const MAX_PARSE_RETRIES = 2;
const MAX_PARSE_HARD_RECOVERIES = 6;

export interface AgentDeps {
  provider: ILLMProvider;
  registry: ToolRegistry;
  systemPrompt: string;
  config: ResolvedConfig;
}

/**
 * The conversational agent. Drives one user turn to OUTPUT (or graceful stop)
 * by repeatedly asking the provider for a single step, dispatching TOOL steps
 * to the registry, and feeding OBSERVE results back into the conversation.
 */
export class Agent {
  private readonly conversation = new Conversation();
  private readonly router = new StepRouter();

  constructor(private readonly deps: AgentDeps) {}

  resetConversation(): void {
    this.conversation.reset();
  }

  history(): readonly ReturnType<Conversation['list']>[number][] {
    return this.conversation.list();
  }

  /**
   * Runs the agent loop for a single user turn. Returns the final OUTPUT text
   * (or a graceful stop message if the budget / iteration cap is hit).
   *
   * Optionally accepts inline images attached to the user turn (multimodal).
   */
  async runTurn(
    userInput: string,
    options: { signal?: AbortSignal; images?: InlineImage[] } = {},
  ): Promise<string> {
    const { signal, images } = options;
    const logger = getLogger();
    const traceId = newTraceId();
    if (images && images.length > 0) {
      this.conversation.pushUserWithImages(userInput, images);
    } else {
      this.conversation.pushUser(userInput);
    }

    const wallClock = setTimeout(() => abortController.abort(), this.deps.config.budgetMs);
    const abortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
    const combinedSignal = abortController.signal;

    try {
      let parseRetries = 0;
      let parseHardRecoveries = 0;
      for (let i = 0; i < MAX_ITERATIONS; i += 1) {
        if (combinedSignal.aborted) {
          return 'Stopped: budget or user abort.';
        }

        const spinner = startSpinner('Ditto is thinking…');
        let providerResult;
        try {
          providerResult = await this.deps.provider.generate(
            this.conversation.toGeminiContents(this.deps.systemPrompt),
            { signal: combinedSignal },
          );
          spinner.stop();
        } catch (err) {
          spinner.stop();
          throw err;
        }

        let parsed: ParsedStep;
        try {
          const json = parseLlmJson(providerResult.text);
          const result = stepUnionSchema.safeParse(json);
          if (!result.success) {
            throw new ParseError(
              `Step did not match schema: ${result.error.issues.map((iss) => iss.message).join('; ')}`,
              providerResult.text,
            );
          }
          parsed = result.data;
          parseRetries = 0;
        } catch (err) {
          if (err instanceof ParseError && parseRetries < MAX_PARSE_RETRIES) {
            parseRetries += 1;
            logger.warn(
              { traceId, attempt: parseRetries },
              'malformed step, asking model to retry',
            );
            this.conversation.pushAssistant(providerResult.text);
            this.conversation.pushDeveloper(
              JSON.stringify({
                step: 'OBSERVE',
                content:
                  'Your last response was not valid single-step JSON. Re-emit ONE valid step JSON object only. Do not include markdown or prose.',
              }),
            );
            continue;
          }
          if (err instanceof ParseError && parseHardRecoveries < MAX_PARSE_HARD_RECOVERIES) {
            parseHardRecoveries += 1;
            parseRetries = 0;
            logger.warn(
              { traceId, hardRecovery: parseHardRecoveries },
              'parse hard-recovery triggered',
            );
            this.conversation.pushAssistant(providerResult.text);
            this.conversation.pushDeveloper(
              JSON.stringify({
                step: 'OBSERVE',
                content:
                  'STRICT MODE: Reply with exactly one JSON object only. Allowed shapes: {"step":"START","content":"..."} | {"step":"THINK","content":"..."} | {"step":"TOOL","tool_name":"...","tool_args":...} | {"step":"OUTPUT","content":"..."}. No extra text.',
              }),
            );
            continue;
          }
          throw err;
        }

        this.conversation.pushAssistant(JSON.stringify(parsed));
        this.router.render(parsed);

        renderTurnFooter({
          model: providerResult.modelUsed,
          latencyMs: providerResult.latencyMs,
          ...(providerResult.usage?.inputTokens !== undefined
            ? { inputTokens: providerResult.usage.inputTokens }
            : {}),
          ...(providerResult.usage?.outputTokens !== undefined
            ? { outputTokens: providerResult.usage.outputTokens }
            : {}),
          traceId,
        });
        logger.info(
          {
            traceId,
            step: parsed.step,
            model: providerResult.modelUsed,
            latencyMs: providerResult.latencyMs,
            usage: providerResult.usage,
          },
          'agent step',
        );

        if (parsed.step === 'OUTPUT') {
          return parsed.content;
        }

        if (parsed.step === 'TOOL') {
          await this.handleToolStep(parsed, traceId, combinedSignal);
        }
      }
      const stopped = `Stopped after ${MAX_ITERATIONS} iterations without producing OUTPUT.`;
      logger.warn({ traceId }, stopped);
      return stopped;
    } finally {
      clearTimeout(wallClock);
    }
  }

  private async handleToolStep(
    step: ToolStep,
    traceId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const logger = getLogger();
    const toolName = step.tool_name;
    if (!this.deps.registry.has(toolName)) {
      const observation = {
        step: 'OBSERVE',
        content: `Tool "${toolName}" is not available. Pick one from the catalog.`,
      };
      this.conversation.pushDeveloper(JSON.stringify(observation));
      logger.warn({ traceId, toolName }, 'unknown tool requested');
      return;
    }
    try {
      const result = await this.deps.registry.execute(toolName, step.tool_args, {
        cwd: process.cwd(),
        traceId,
        signal,
      });
      const observation = { step: 'OBSERVE', content: result };
      this.conversation.pushDeveloper(JSON.stringify(observation));
      logger.info({ traceId, toolName, result: stringifyForLog(result, 1000) }, 'tool ok');
    } catch (err) {
      const message =
        err instanceof ToolError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      const observation = {
        step: 'OBSERVE',
        content: { error: true, message, tool: toolName },
      };
      this.conversation.pushDeveloper(JSON.stringify(observation));
      logger.error({ traceId, toolName, message }, 'tool failed');
    }
  }
}
