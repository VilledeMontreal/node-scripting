import caporal from '@caporal/core';
import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';

export interface Options {
  username: string;
}

export class TestingtestingHiddenScript extends ScriptBase<Options> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingHiddenScript`;
  }

  get description(): string {
    return `A testing hidden script`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.hide();
    command.option(`--username <name>`, `A username`, {
      required: true,
      validator: caporal.program.STRING,
    });
  }

  protected async main() {
    this.logger.info(`username is ${this.options.username}`);
  }
}
