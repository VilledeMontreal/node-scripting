import caporal from '@caporal/core';
import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';
import { TestingExampleScript } from './testingExampleScript.js';
import { TestingScriptWithArgs } from './testingScriptWithArgs.js';

export interface Options {
  foo: number;
  bar?: string;
  delay?: number;
  throwError?: boolean;
  forceVerboseToFalse?: boolean;
}

export class TestingCallingScript extends ScriptBase<Options> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingCallingScript`;
  }

  get description(): string {
    return `A script that invokes another script.`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.option(`--foo <number>`, `A foo number`, {
      required: true,
      validator: caporal.program.NUMBER,
    });
    command.option(`--bar [text]`, `A bar text`, {
      validator: caporal.program.STRING,
    });
    command.option(`--delay [number]`, `A delay`, {
      validator: caporal.program.NUMBER,
    });
    command.option(`--throwError`, `Throw an error`);
    command.option(
      `--forceVerboseToFalse`,
      `Force --verbose to false when calling another script.`
    );
  }

  protected async main() {
    await this.invokeScript(
      TestingScriptWithArgs,
      {
        port: this.options.foo,
        delay: this.options.delay,
        throwError: this.options.throwError,
        ...(this.options.forceVerboseToFalse ? { verbose: false } : {}),
      },
      { name: this.options.bar ?? 'MyService' }
    );
    await this.invokeScript(TestingExampleScript, { lucky: this.options.foo }, {});
  }
}
