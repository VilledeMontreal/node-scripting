import caporal from '@caporal/core';
import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';

export interface Options {
  throwError?: boolean;
  port?: number;
}

export class TestingScript extends ScriptBase<Options> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScript`;
  }

  get description(): string {
    return `A simple testing script`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.option(`--throwError`, `Throw an error`);
    command.option(`-p, --port <number>`, `A port number`, {
      validator: caporal.program.NUMBER,
    });
  }

  protected async main() {
    if (this.options.throwError) {
      throw new Error(`This is a regular error`);
    }

    this.logger.debug(`msg: debug`);
    this.logger.info(`msg: info`);
    this.logger.warn(`msg: warn`);
    this.logger.error(`msg: error`);

    this.logger.info(`port: ${this.options.port}`);

    this.logger.info(`silent: ${String(this.options.silent)}`);
  }
}
