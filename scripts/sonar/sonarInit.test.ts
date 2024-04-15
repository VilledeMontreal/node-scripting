/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-console */
/* eslint-disable max-lines-per-function */
/* eslint-disable prettier/prettier */
import { assert, should } from 'chai';
// import fs from 'fs-extra';
// import nock from 'nock';
import fs from 'fs-extra';
import sinon from 'sinon';
import {
  LoggerRecorder, simulateSonarProjectAlreadyExists, simulateSonarProjectDoesNotYetExist, simulateSonarServerIsNotFound,
} from '../../src/utils/sonarTestUtils.js';
import { assertText, setTestingConfigs, shouldFail } from '../../src/utils/testingUtils.js';
// import { SONAR_SCANNER } from './sonar.js';
import nock from 'nock';
import { SONAR_SCANNER } from './sonar.js';
import { SonarInitScript } from './sonarInit.js';

should();

const sandbox = sinon.createSandbox();

function getSonarInitScript(logger: {}): SonarInitScript {
  return new SonarInitScript({
    args: {},
    options: {},
    program: sinon.stub() as any,
    command: sinon.stub() as any,
    ddash: sinon.stub() as any,
    logger: logger as any,
  });
}

const validPropertyFiles = [
  './src/utils/test-sonar-project_url-with-trailing-slash.properties',
  './src/utils/test-sonar-project_url-without-trailing-slash.properties',
];

describe('sonar-init script', function () {

  beforeAll(() => {
    setTestingConfigs();
  });

  it(` should fail when sonar-project.properties is missing`, async () => {
    const loggerRecorder = new LoggerRecorder();
    const sonarInitScript = getSonarInitScript(loggerRecorder.logger);

    await shouldFail(() => sonarInitScript.run(), err => err.message === "ENOENT: no such file or directory, open 'sonar-project.properties'");

    assertText(loggerRecorder.recordedLogs.trim(), [
      {
        kind: 'equals',
        value: `info: Script "sonar-init" starting...\nerror: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'`,
      },
    ]);
  });

  validPropertyFiles.forEach((propertyFile) => {
    // eslint-disable-next-line @typescript-eslint/require-await
    describe(` when using "${propertyFile}" valid property file`, () => {
      beforeAll(async () => {
        await fs.copyFile(propertyFile, './sonar-project.properties');
      });
      afterAll(async () => {
        await fs.unlink('./sonar-project.properties');
      });

      afterEach(() => {
        nock.cleanAll();
        sandbox.restore();
      });

      it(` should skip sonar project initialization with a warning when it does already exist.`, async () => {
        simulateSonarProjectAlreadyExists();

        // @ts-ignore
        const shellCommand = sandbox.spy(SonarInitScript.prototype, 'invokeShellCommand');

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(loggerRecorder.logger);
        await sonarInitScript.run();

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`
        );

        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar-init" starting...\n',
          },
          {
            kind: 'contains',
            value: "info: Initializing 'my-test-project-key' Sonar project...\n",
          },
          {
            kind: 'contains',
            value: "warn: 'my-test-project-key' Sonar project already exists at https://example.com/sonar/dashboard?id=my-test-project-key ! Skipping sonar initialization...\n",
          },
          {
            kind: 'endsWith',
            value: 'info: Script "sonar-init" successful after 0 s\n',
          },
        ]);

        assert.isFalse(shellCommand.called);
      });

      it(` should initialize sonar project when it does not yet exist.`, async () => {
        simulateSonarProjectDoesNotYetExist();

        // @ts-ignore
        const shellCommand = sandbox.stub(SonarInitScript.prototype, 'invokeShellCommand');
        shellCommand.withArgs(SONAR_SCANNER).resolves(0);

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(loggerRecorder.logger);

        await sonarInitScript.run();

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`
        );
        
        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar-init" starting...\n',
          },
          {
            kind: 'contains',
            value: "info: Initializing 'my-test-project-key' Sonar project...\n",
          },
          {
            kind: 'contains',
            value: "info: 'my-test-project-key' Sonar project successfully initialized, and available at https://example.com/sonar/dashboard?id=my-test-project-key\n",
          },
          {
            kind: 'endsWith',
            value: 'info: Script "sonar-init" successful after 0 s\n',
          },
          {
            kind: 'contains',
            invert: true,
            value: 'warn',
          },
        ]);
      });

      it(` should fail when sonar project initialization fails.`, async () => {
        simulateSonarProjectDoesNotYetExist();

        // @ts-ignore
        const shellCommand = sandbox.stub(SonarInitScript.prototype, 'invokeShellCommand');
        shellCommand
          .withArgs(SONAR_SCANNER)
          .rejects(new Error('An error occured while analyzing code.'));

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(loggerRecorder.logger);

        await shouldFail(() => sonarInitScript.run(), err => err.message === 'An error occured while analyzing code.');

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`
        );
        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar-init" starting...\n',
          },
          {
            kind: 'contains',
            value: "info: Initializing 'my-test-project-key' Sonar project...\n",
          },
          {
            kind: 'endsWith',
            value: 'error: Script "sonar-init" failed after 0 s with: An error occured while analyzing code.\n',
          },
          {
            kind: 'contains',
            invert: true,
            value: 'warn',
          },
        ]);

        assert.isTrue(shellCommand.calledOnceWithExactly(SONAR_SCANNER, []));
      });

      it(` should fail when sonar server is not found.`, async () => {
        simulateSonarServerIsNotFound();

        // @ts-ignore
        const shellCommand = sandbox.spy(SonarInitScript.prototype, 'invokeShellCommand');

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(loggerRecorder.logger);

        await shouldFail(() => sonarInitScript.run(), err =>  err.message === 'Not Found');

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`
        );

        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar-init" starting...\n',
          },
          {
            kind: 'contains',
            value: "info: Initializing 'my-test-project-key' Sonar project...\n",
          },
          {
            kind: 'contains',
            value: [
              'error: "https://example.com/sonar/" Sonar server is not reachable.',
              'error: "https://example.com/sonar" Sonar server is not reachable.',  
            ],
          },
          {
            kind: 'endsWith',
            value: 'error: Script "sonar-init" failed after 0 s with: Not Found\n',
          },
          {
            kind: 'contains',
            invert: true,
            value: 'warn',
          },
        ]);

        assert.isFalse(shellCommand.called);
      });
    });
  });
});
