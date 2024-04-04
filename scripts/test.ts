import caporal from '@caporal/core';
import { ScriptBase } from '../src/index.js';
import { LintScript } from './lint.js';
import { TestUnitsScript } from './testUnits.js';

export interface Options {
  bail?: boolean;
  jenkins?: boolean;
  report?: string;
}

export class TestScript extends ScriptBase<Options> {
  get name(): string {
    return 'test';
  }

  get description(): string {
    return `Run the unit tests + the linting validations.`;
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.option(`--bail`, `Stop the execution of the tests as soon as an error occures.`);
    command.option(`--jenkins`, `Configure the tests to be run by Jenkins.`);
    command.option(
      `--report <path>`,
      `The relative path to the report, when the tests are run for Jenkins.`,
      {
        default: `output/test-results/report.xml`,
        validator: caporal.program.STRING,
      }
    );
  }

  protected async main() {
    await this.invokeScript(LintScript, {}, {});
    await this.invokeScript(TestUnitsScript, this.options, {});
  }
}
