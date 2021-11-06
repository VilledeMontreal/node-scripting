import { Command } from '@caporal/core';
import { URL } from 'url';
import { SONAR_SCANNER } from './sonar';
import { SonarBaseScript } from './sonarBase';
import { IGlobalOptions } from '../globalOptions';
import * as path from 'path';

export class SonarInitScript extends SonarBaseScript<IGlobalOptions> {
  get name(): string {
    return 'sonar-init';
  }

  get description(): string {
    return 'Initializes Sonar project and creates "master" and "develop" long-lived sonar branches.';
  }

  protected async configure(command: Command): Promise<void> {
    command.option(
      `-e, --should-already-exist`,
      `When this flag is enabled, sonar project is expected to already exist; its only effect is to change log
       messages depending on caller expectations...`
    );
  }

  protected async main() {
    const {sonarHostUrl, sonarProjectKey} = this.getSonarProjectInformation();

    this.logScriptStart(sonarProjectKey);

    if (await this.sonarProjectAlreadyExists(sonarProjectKey, sonarHostUrl)) {
      this.logSonarInitSkip(sonarProjectKey, sonarHostUrl);
    } else {
      await this.initSonarProject();
      this.logSonarInitSuccess(sonarProjectKey, sonarHostUrl);
    }
  }

  private async initSonarProject() {
    await this.invokeShellCommand(SONAR_SCANNER, []);
    await this.invokeShellCommand(SONAR_SCANNER, ['-Dsonar.branch.name=develop']);
  }

  private logScriptStart(sonarProjectKey: string) {
    this.logger.info(`Initializing '${sonarProjectKey}' Sonar project...`);
  }

  private logSonarInitSuccess(sonarProjectKey: string, sonarHostUrl: string) {
    const sonarProjectUrl = this.buildSonarProjectUrl(sonarProjectKey, sonarHostUrl);
    this.logger.info(
      `'${sonarProjectKey}' Sonar project successfully initialized, and available at ${sonarProjectUrl}`
    );
  }

  private logSonarInitSkip(sonarProjectKey: string, sonarHostUrl: string) {
    const sonarProjectUrl = this.buildSonarProjectUrl(sonarProjectKey, sonarHostUrl);
    this.logger.warn(
      `'${sonarProjectKey}' Sonar project already exists at ${sonarProjectUrl} ! Skipping sonar initialization...`
    );
  }

  private buildSonarProjectUrl(sonarProjectKey: string, sonarHostUrl: string): URL {
    const projectUrl = new URL(sonarHostUrl);
    projectUrl.pathname = path.join(projectUrl.pathname, 'dashboard');
    projectUrl.search = `?id=${sonarProjectKey}`;
    return projectUrl;
  }
}
