import caporal from '@caporal/core';
import path from 'path';
import { configs } from '../src/config/configs.js';
import { ScriptBase } from '../src/index.js';

export interface Options {
  bail?: boolean;
  jenkins?: boolean;
  report?: string;
}

export class TestUnitsScript extends ScriptBase<Options> {
  get name(): string {
    return 'test-units';
  }

  get description(): string {
    return `Run the unit tests.`;
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
      },
    );
  }

  protected get requiredDependencies(): string[] {
    const deps = ['jest'];
    if (this.options.jenkins) {
      deps.push('jest-junit');
    }
    return deps;
  }

  protected async main() {
    const cmdArgs: string[] = [];

    cmdArgs.push('--experimental-vm-modules');
    cmdArgs.push(path.join(configs.projectRoot, 'node_modules/jest/bin/jest'));
    cmdArgs.push(`--ci`);
    cmdArgs.push(`--no-colors`);
    cmdArgs.push(`--runInBand`);
    cmdArgs.push(`--detectOpenHandles`);

    // ==========================================
    // Stop testing as soon as one test fails?
    // ==========================================
    if (this.options.bail) {
      cmdArgs.push('--bail');
    }

    // ==========================================
    // For Jenkins, the path to the report to generate
    // can be passed :
    // - as a command line param :
    //   "run test-units --jenkins --report output/test-results/report.xml"
    // - as an "JUNIT_REPORT_PATH" environment variable.
    //
    // By default, the path will be "output/test-results/report.xml"
    // ==========================================
    if (this.options.jenkins) {
      if (this.options.report) {
        process.env.JEST_JUNIT_OUTPUT_FILE = this.options.report;
      } else if (!process.env.JEST_JUNIT_OUTPUT_FILE) {
        process.env.JEST_JUNIT_OUTPUT_FILE = 'output/test-results/report.xml';
      }

      this.logger.info('Exporting tests to junit file ' + process.env.JEST_JUNIT_OUTPUT_FILE);
      cmdArgs.push('--reporters');
      cmdArgs.push('default');
      cmdArgs.push('--reporters');
      cmdArgs.push('jest-junit');
    }

    try {
      await this.invokeShellCommand('node', cmdArgs, {
        useTestsNodeAppInstance: true,
      });

      this.logger.info(
        "   \u21b3  type 'run show-coverage' (or './run show-coverage' on Linux/Mac) to display the HTML report",
      );
    } catch (err) {
      throw new Error('Some unit tests failed');
    }
  }
}
