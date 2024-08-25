import caporal from '@caporal/core';
import path from 'path';
import { configs } from '../src/config/configs.js';
import { ScriptBase } from '../src/index.js';

export interface Options {
  report?: string;
}

export class ShowCoverageScript extends ScriptBase<Options> {
  get name(): string {
    return 'show-coverage';
  }

  get description(): string {
    return `Open the tests coverage report.`;
  }

  protected get requiredDependencies(): string[] {
    return ['nyc'];
  }

  protected async configure(command: caporal.Command): Promise<void> {
    command.option(`--report <path>`, `The relative path to the coverage report directory.`, {
      default: `output/coverage`,
      validator: caporal.program.STRING,
    });
  }

  protected async main() {
    if (configs.isWindows) {
      await this.invokeShellCommand('start', ['', this.getReportDir()], {
        useShellOption: true,
      });
    } else {
      await this.invokeShellCommand('open', [this.getReportDir()]);
    }
  }

  protected getReportDir() {
    const reportDir = path.resolve(
      configs.projectRoot,
      this.options.report ?? 'output/coverage',
      'lcov-report/index.html',
    );
    return reportDir;
  }
}
