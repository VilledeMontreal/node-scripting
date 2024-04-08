import path from 'path';
import request from 'superagent';
import { URL } from 'url';
import { ScriptBase } from '../../src/index.js';

import properties from 'java-properties';

export interface SonarProjectInformation {
  sonarHostUrl: string;
  sonarProjectKey: string;
}

export abstract class SonarBaseScript<Options> extends ScriptBase<Options> {
  protected async sonarProjectAlreadyExists(
    sonarProjectKey: string,
    sonarHostUrl: string
  ): Promise<boolean> {
    let res;

    this.logger.debug(
      `*** Calling Sonar host check whether ${sonarHostUrl} Sonar instance is reachable...`
    );

    try {
      res = await request.head(new URL(sonarHostUrl).toString()).redirects(5).timeout(20000);
    } catch (err) {
      this.logger.error(`"${sonarHostUrl}" Sonar server is not reachable.`);
      throw err;
    }

    this.logger.debug(
      `*** Calling Sonar API to check whether ${sonarProjectKey} project exists in ${sonarHostUrl} Sonar instance...`
    );

    try {
      res = await request
        .get(this.getBranchesListSonarEndpointUrl(sonarHostUrl))
        .query({ project: sonarProjectKey })
        .timeout(10000);
    } catch (err: any) {
      if (err.response?.notFound) {
        // 404 is the only http error we want to keep track of
        res = err.response;
      } else {
        throw err;
      }
    }

    this.logger.debug('*** Sonar API response :', { status: res.statusCode, text: res.text });

    if (res.ok) {
      return true;
    }
    if (res.notFound) {
      return false;
    }

    throw { msg: 'Unexpected response from Sonar API!', response: res };
  }
  protected getSonarProjectInformation(): SonarProjectInformation {
    const filename = 'sonar-project.properties';
    const sonarProperties = properties.of(filename);
    const result = {
      sonarHostUrl: getPropertyOf(filename, sonarProperties, 'sonar.host.url'),
      sonarProjectKey: getPropertyOf(filename, sonarProperties, 'sonar.projectKey'),
    };
    if (!result.sonarHostUrl) {
      throw new Error(
        '"sonar.host.url" property must be defined in "sonar-project.properties" file!'
      );
    }
    if (!result.sonarProjectKey) {
      throw new Error(
        '"sonar.projectKey" property must be defined in "sonar-project.properties" file!'
      );
    }
    return result;
  }
  private getBranchesListSonarEndpointUrl(sonarHostUrl: string) {
    const endpointUrl = new URL(sonarHostUrl);
    endpointUrl.pathname = path.join(endpointUrl.pathname, 'api/project_branches/list');
    return endpointUrl.toString();
  }
}

function getPropertyOf(filename: string, props: properties.PropertiesFile, name: string): string {
  const result = props.get(name);
  if (result === undefined) {
    throw new Error(`"${name}" property must be defined in "${filename}" file!`);
  }
  if (typeof(result) === 'string') {
    return result;
  }
  if (result.length != 1) {
    throw new Error(`Expected to find a single string in file '${filename}' for property '${name}'`);
  }
  return result[0];
}
