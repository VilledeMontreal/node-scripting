import { Command } from '@caporal/core';
import { IGlobalOptions } from '../../src/index.js';
import { SonarBaseScript } from './sonarBase.js';
import { SonarInitScript } from './sonarInit.js';

export const SONAR_SCANNER = './node_modules/.bin/sonar-scanner';

export interface Options extends IGlobalOptions {
  targetBranch?: string;
}

export class SonarScript extends SonarBaseScript<Options> {
  get name(): string {
    return 'sonar';
  }

  get description(): string {
    return `Analyze current local branch source code and send results to Sonar server
* NOTE *: git v2.22 or above is required (git branch --show-current must be available)`;
  }

  protected async configure(command: Command): Promise<void> {
    command.option(
      `-t, --target-branch <branch>`,
      `Sonar target branch: current source code will be analyzed and compared to this target branch. ` +
        `See https://docs.sonarqube.org/7.5/branches/overview/#header-2 for more information. ` +
        `Usually set to 'develop'; default target branch is 'master'.`,
    );
  }

  protected async main() {
    const { sonarHostUrl, sonarProjectKey } = this.getSonarProjectInformation();

    const currentBranch = await this.findCurrentGitLocalBranch();

    if (!(await this.sonarProjectAlreadyExists(sonarProjectKey, sonarHostUrl))) {
      this.logger.warn(
        `'${sonarProjectKey}' Sonar project does not yet exist on ${sonarHostUrl} ! Initializing it first...`,
      );
      await this.invokeScript(SonarInitScript, {}, {});
    }

    // npx sonar-scanner -Dsonar.branch.name=`git branch --show-current` -Dsonar.branch.target=develop

    this.logger.info(`Analyzing current branch "${currentBranch}" source code...`);

    const args = [`-Dsonar.branch.name=${currentBranch}`];
    if (this.options.targetBranch) {
      args.push(`-Dsonar.branch.target=${this.options.targetBranch}`);
    }
    await this.invokeShellCommand(SONAR_SCANNER, args);
  }

  private async findCurrentGitLocalBranch() {
    let currentBranch = '';
    await this.invokeShellCommand('git', ['branch', '--show-current'], {
      outputHandler: (stdoutOutput: string) => {
        currentBranch = stdoutOutput.trim();
      },
    });
    return currentBranch;
  }
}
