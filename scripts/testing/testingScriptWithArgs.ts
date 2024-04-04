import caporal from '@caporal/core';
import { IGlobalOptions, ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';

export type Args = {
  name: string;
};

export interface Options {
  port: number;
  delay?: number;
  throwError?: boolean;
}

export class TestingScriptWithArgs extends ScriptBase<Options, IGlobalOptions, Args> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScriptWithArgs`;
  }

  get description(): string {
    return `Example of script with arguments and options that will be called by another script.`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.argument(`<name>`, `a name`);
    command.option(`--port <number>`, `A port number`, {
      required: true,
      validator: caporal.program.NUMBER,
    });
    command.option(`--delay <number>`, `A delay in ms`, {
      validator: caporal.program.NUMBER,
    });
    command.option(`--throwError`, `Throw an error`);
  }

  protected async main() {
    this.logger.info(
      `Start service ${this.args.name} on port ${this.options.port} with delay ${String(
        this.options.delay
      )}, --verbose: ${String(this.options.verbose)}`
    );
    if (this.options.throwError) {
      throw new Error('Some error...');
    }
  }
}
