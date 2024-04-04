import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';
import { ITestingGlobalOptions } from './testingGlobalOptions.js';
import { TestingScriptGlobalCustomOptions2 } from './testingScriptCustomGlobalOptions2.js';

export interface Options {
  throwError?: boolean;
  port?: number;
}

export class TestingScriptGlobalCustomOptions1 extends ScriptBase<Options, ITestingGlobalOptions> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScriptGlobalCustomOptions1`;
  }

  get description(): string {
    return `A testing script with custom global options #1`;
  }

  protected async main() {
    // ==========================================
    // Uses the custom global option => compiled!
    // ==========================================
    this.logger.info(`custom #1: ${String(this.options.custom)}`);

    // ==========================================
    // Do not pass the custom global explicitly.
    // ==========================================
    await this.invokeScript(TestingScriptGlobalCustomOptions2, {}, {});
  }
}
