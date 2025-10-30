/**
 * @fileoverview This file contains custom TypeScript decorators for use across the application,
 * primarily for aspect-oriented programming patterns like logging and monitoring.
 */

/**
 * A method decorator that automatically logs the start, end, and errors of a method call,
 * and emits progress events for the monitoring dashboard.
 * It assumes the class using it has `logger`, `emitProgress`, and `getTaskName` methods.
 *
 * @param target The prototype of the class.
 * @param propertyKey The name of the method being decorated.
 * @param descriptor The property descriptor for the method.
 */
export function loggable(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value; // The original method (e.g., navigate, execute)

  // We replace the original method with our new function
  descriptor.value = async function(...args: any[]) {
    // `this` refers to the instance of the task class (e.g., TaskReadGmail)
    const logger = this.logger;
    const taskName = this.getTaskName();
    const stepName = propertyKey; // e.g., "navigate", "execute"

    logger(`[${taskName}] ==> Starting '${stepName}'...`);
    // 1. Emit a progress event that the method is starting
    await this.emitProgress('in_progress', stepName, `Starting step: ${stepName}`);

    try {
      // Call the original method with its arguments
      const result = await originalMethod.apply(this, args);

      logger(`[${taskName}] <== Finished '${stepName}' successfully.`);
      // 2. Emit a progress event that the method completed successfully
      await this.emitProgress('completed', stepName, `Finished step: ${stepName}`);

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger(`[${taskName}] <== ❌ Failed '${stepName}': ${errorMessage}`);
      // 3. Emit a progress event that the method failed
      await this.emitProgress('failed', stepName, `Failed step: ${stepName} - ${errorMessage}`, { error: errorMessage });

      // Re-throw the error so the application's error handling can take over
      throw error;
    }
  };

  return descriptor;
}
