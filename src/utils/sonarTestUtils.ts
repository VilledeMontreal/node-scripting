const nock = require('nock');

export function simulateSonarServerIsNotFound() {
  nock('https://example.com')
    .head(RegExp('/sonar/{0,1}'))
    .reply(404);
}

function simulateSonarServerIsOk() {
  nock('https://example.com')
    .head(RegExp('/sonar/{0,1}'))
    .reply(200);
}

export function simulateSonarProjectDoesNotYetExist() {
  simulateSonarServerIsOk();
  nock('https://example.com')
    .get('/sonar/api/project_branches/list')
    .query({ project: 'my-test-project-key' })
    .reply(404);
}

export function simulateSonarProjectAlreadyExists() {
  simulateSonarServerIsOk();
  nock('https://example.com')
    .get('/sonar/api/project_branches/list')
    .query({ project: 'my-test-project-key' })
    .reply(200);
}

export class LoggerRecorder {
  logger: {};
  recordedLogs: string;

  constructor() {
    this.recordedLogs = '';
    // tslint:disable-next-line:no-this-assignment
    const that = this;
    this.logger = new Proxy(
      {},
      {
        get: (target, prop) => {
          // tslint:disable-next-line: only-arrow-functions
          return function() {
            that.recordedLogs += `${prop.toString()}: ${arguments[0]}\n`;
          };
        }
      }
    );
  }
}
