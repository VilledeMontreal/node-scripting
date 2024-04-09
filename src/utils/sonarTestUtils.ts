/* eslint-disable @typescript-eslint/ban-types */
import nock from 'nock';
import stripAnsi from 'strip-ansi';

export function simulateSonarServerIsNotFound() {
  nock('https://example.com').head(RegExp('/sonar/{0,1}')).reply(404).persist();
}

function simulateSonarServerIsOk() {
  nock('https://example.com').head(RegExp('/sonar/{0,1}')).reply(200).persist();
}

export function simulateSonarProjectDoesNotYetExist() {
  simulateSonarServerIsOk();
  nock('https://example.com')
    .get('/sonar/api/project_branches/list')
    .query({ project: 'my-test-project-key' })
    .reply(404)
    .persist();
}

export function simulateSonarProjectAlreadyExists() {
  simulateSonarServerIsOk();
  nock('https://example.com')
    .get('/sonar/api/project_branches/list')
    .query({ project: 'my-test-project-key' })
    .reply(200)
    .persist();
}

export class LoggerRecorder {
  logger: {};
  recordedLogs: string;

  constructor() {
    this.recordedLogs = '';
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    this.logger = new Proxy(
      {},
      {
        get: (target, prop) => {
          return function () {
            // eslint-disable-next-line prefer-rest-params
            that.recordedLogs += stripAnsi(`${prop.toString()}: ${arguments[0]}\n`);
          };
        },
      }
    );
  }
}
