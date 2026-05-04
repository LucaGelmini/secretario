/**
 * Base error class for Secretario-specific errors
 */
export class SecretarioError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SecretarioError';
  }
}

/**
 * Error thrown when a workflow step fails
 */
export class WorkflowStepError extends SecretarioError {
  constructor(
    public readonly stepName: string,
    message: string,
    details?: unknown
  ) {
    super(`Workflow step '${stepName}' failed: ${message}`, 'WORKFLOW_STEP_ERROR', details);
    this.name = 'WorkflowStepError';
  }
}

/**
 * Error thrown when configuration is missing or invalid
 */
export class ConfigurationError extends SecretarioError {
  constructor(message: string, missingKeys?: string[]) {
    super(message, 'CONFIGURATION_ERROR', { missingKeys });
    this.name = 'ConfigurationError';
  }
}

/**
 * Validates that required environment variables are present
 *
 * @param env - Environment object
 * @param requiredKeys - Array of required key names
 * @throws {ConfigurationError} if any required keys are missing
 */
export function validateEnv(env: Record<string, unknown>, requiredKeys: string[]): void {
  const missingKeys = requiredKeys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
      missingKeys
    );
  }
}
