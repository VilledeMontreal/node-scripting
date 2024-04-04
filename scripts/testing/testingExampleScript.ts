import caporal from '@caporal/core';
import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';

export interface Options {
  lucky: number;
}

export class TestingExampleScript extends ScriptBase<Options> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingExampleScript`;
  }

  get description(): string {
    return `Project specific script example. Display a lucky number passed as an argument.`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.option(`--lucky <number>`, `A lucky number`, {
      required: true,
      validator: caporal.program.NUMBER,
    });
  }

  protected async main() {
    const luckyNumber = this.options.lucky;
    this.logger.info(`The lucky number is ${luckyNumber}`);
    this.logger.debug(`This is a debug message, only displayed if "--verbose" is used.`);
  }
}
