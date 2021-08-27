import { Command } from '@caporal/core';
import { SonarInitScript } from './sonarInit';
import { IGlobalOptions } from '../globalOptions';
import { ScriptBase } from '../scriptBase';

export const SONAR_SCANNER = './node_modules/.bin/sonar-scanner';

export interface Options extends IGlobalOptions {
  targetBranch?: string;
}

export class SonarScript extends ScriptBase<Options> {
  get name(): string {
    return 'sonar';
  }

  get description(): string {
    return 'Analyze current local branch source code and send results to Sonar server';
  }

  protected async configure(command: Command): Promise<void> {
    command.option(
      `-t, --target-branch <branch>`,
      `Sonar target branch: current source code will be analyzed and compared to this target branch. ` +
        `See https://docs.sonarqube.org/7.5/branches/overview/#header-2 for more information. ` +
        `Usually set to 'develop'; default target branch is 'master'.`
    );
  }

  protected async main() {
    await this.invokeScript(SonarInitScript, { shouldAlreadyExist: true }, {});

    this.logger.info(`Analyzing current branch source code...`);
    // npx sonar-scanner -Dsonar.branch.name=`git branch --show-current` -Dsonar.branch.target=develop

    let currentBranch = '';
    await this.invokeShellCommand('git', ['branch', '--show-current'], {
      outputHandler: (stdoutOutput: string) => {
        currentBranch = stdoutOutput.trim();
      }
    });

    const args = [`-Dsonar.branch.name=${currentBranch}`];
    if (this.options.targetBranch) {
      args.push(`-Dsonar.branch.target=${this.options.targetBranch}`);
    }
    await this.invokeShellCommand(SONAR_SCANNER, args);
  }
}
