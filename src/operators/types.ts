import type { Env } from '@/shared/env';

/**
 * OperatorContext provides access to the Worker environment and other contextual data
 * that operators might need to execute their logic.
 */
export interface OperatorContext {
  /**
   * Cloudflare Workers environment bindings (secrets, workflows, KV, etc.)
   */
  env: Env;

  /**
   * Optional metadata that can be passed between operators
   */
  metadata?: Record<string, unknown>;
}

/**
 * Operator is the core abstraction for a unit of work in the system.
 *
 * Operators are composable, type-safe building blocks that can be used
 * within Workflow steps to perform specific tasks.
 *
 * @template TInput - The input type this operator expects
 * @template TOutput - The output type this operator produces
 *
 * @example
 * ```ts
 * const summarizeOperator: Operator<string, string> = {
 *   name: 'summarize-text',
 *   execute: async (input, ctx) => {
 *     // Call AI service to summarize
 *     return summarizedText;
 *   }
 * };
 * ```
 */
export interface Operator<TInput, TOutput> {
  /**
   * Unique identifier for this operator (used for logging and debugging)
   */
  name: string;

  /**
   * Execute the operator's logic
   *
   * @param input - The input data for this operator
   * @param ctx - Execution context with access to env and metadata
   * @returns Promise resolving to the operator's output
   */
  execute: (input: TInput, ctx: OperatorContext) => Promise<TOutput>;
}

/**
 * Helper type to extract the input type from an Operator
 */
export type OperatorInput<T> = T extends Operator<infer I, unknown> ? I : never;

/**
 * Helper type to extract the output type from an Operator
 */
export type OperatorOutput<T> = T extends Operator<unknown, infer O> ? O : never;
