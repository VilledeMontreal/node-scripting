import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';
import { ITestingGlobalOptions } from './testingGlobalOptions.js';

export interface Options {
  throwError?: boolean;
  port?: number;
}

export class TestingScriptGlobalCustomOptions2 extends ScriptBase<Options, ITestingGlobalOptions> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScriptGlobalCustomOptions2`;
  }

  get description(): string {
    return `A testing script with custom global options #2`;
  }

  protected async main() {
    // ==========================================
    // Uses the custom global option => compiled!
    // ==========================================
    this.logger.info(`custom #2: ${String(this.options.custom)}`);
  }
}
