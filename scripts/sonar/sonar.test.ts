/* eslint-disable @typescript-eslint/ban-ts-comment */

import { assert, should } from 'chai';
import fs from 'fs-extra';
import { createRequire } from 'module';
import nock from 'nock';
import sinon from 'sinon';
import {
  LoggerRecorder,
  simulateSonarProjectAlreadyExists,
  simulateSonarProjectDoesNotYetExist,
  simulateSonarServerIsNotFound,
} from '../../src/utils/sonarTestUtils.js';
import { assertText, setTestingConfigs } from '../../src/utils/testingUtils.js';
import { SONAR_SCANNER, SonarScript } from './sonar.js';
import { SonarInitScript } from './sonarInit.js';

const require = createRequire(import.meta.url);

should();

const sandbox = sinon.createSandbox();
let shellCommand: sinon.SinonStub;
let subScript: sinon.SinonStub;
const before = beforeAll;
const after = afterAll;

function getSonarScript(targetBranch: string | null, logger: any): SonarScript {
  let options = {};
  if (targetBranch) {
    options = {
      targetBranch,
    };
  }

  return new SonarScript({
    args: {},
    options,
    program: sinon.stub() as any,
    command: sinon.stub() as any,
    ddash: sinon.stub() as any,
    logger: logger,
  });
}

function simulateCurrentGitLocalBranchIs(currentLocalBranch: string) {
  shellCommand.withArgs('git', ['branch', '--show-current'], sinon.match.any).callThrough();
  const mockSpawn = require('mock-spawn');
  const mySpawn = mockSpawn();
  require('child_process').spawn = mySpawn;
  mySpawn.setDefault(mySpawn.simple(0 /* exit code */, currentLocalBranch /* stdout */));
}

function simulateThereIsNoLocalGitRepository() {
  shellCommand.withArgs('git', ['branch', '--show-current'], sinon.match.any).callThrough();
  const mockSpawn = require('mock-spawn');
  const mySpawn = mockSpawn();
  require('child_process').spawn = mySpawn;
  const gitOutputMessage = 'fatal: not a git repository (or any of the parent directories): .git';
  mySpawn.setDefault(mySpawn.simple(128 /* exit code */, gitOutputMessage /* stdout */));
}

const validPropertyFiles: string[] = [
  './src/utils/test-sonar-project_url-with-trailing-slash.properties',
  './src/utils/test-sonar-project_url-without-trailing-slash.properties',
];

describe('sonar script', function () {
  before(() => {
    setTestingConfigs();

    // @ts-ignore
    shellCommand = sandbox.stub(SonarScript.prototype, 'invokeShellCommand');
    // @ts-ignore
    subScript = sandbox.stub(SonarScript.prototype, 'invokeScript');
  });

  afterEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    nock.cleanAll();
  });

  after(() => {
    sandbox.restore();
  });

  it(` should fail when sonar-project.properties is missing`, async () => {
    const loggerRecorder = new LoggerRecorder();
    const sonarScript = getSonarScript(null, loggerRecorder.logger);

    await expect(sonarScript.run()).rejects.toThrow(
      "ENOENT: no such file or directory, open 'sonar-project.properties'",
    );

    expect(loggerRecorder.recordedLogs).toBe(`info: Script "sonar" starting...
error: Script "sonar" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`);
  });

  validPropertyFiles.forEach((propertyFile) => {
    describe(` when using "${propertyFile}" valid file`, () => {
      before(async () => {
        await fs.copyFile(propertyFile, './sonar-project.properties');
      });
      after(async () => {
        await fs.unlink('./sonar-project.properties');
      });

      it(` should fail when there is no local git repository`, async () => {
        simulateThereIsNoLocalGitRepository();

        const loggerRecorder = new LoggerRecorder();
        const sonarScript = getSonarScript(null, loggerRecorder.logger);

        await expect(sonarScript.run()).rejects.toThrow(
          'Expected success codes were "0", but the process exited with "128".',
        );

        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar" starting...\n',
          },
          {
            kind: 'contains',
            value: 'info: Executing: git branch,--show-current\n',
          },
          {
            kind: 'endsWith',
            value:
              'error: Script "sonar" failed after 0 s with: Expected success codes were "0", but the process exited with "128".\n',
          },
        ]);

        assert.isFalse(subScript.called);

        assert.isTrue(shellCommand.calledOnceWith('git', ['branch', '--show-current']));
      });

      it(` should fail when sonar server is not found.`, async () => {
        simulateCurrentGitLocalBranchIs('current-local-branch');
        simulateSonarServerIsNotFound();

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarScript(null, loggerRecorder.logger);

        await expect(sonarInitScript.run()).rejects.toThrow('Not Found');

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`,
        );

        assertText(loggerRecorder.recordedLogs, [
          {
            kind: 'startsWith',
            value: 'info: Script "sonar" starting...\n',
          },
          {
            kind: 'contains',
            value: [
              'error: "https://example.com/sonar/" Sonar server is not reachable.\n',
              'error: "https://example.com/sonar" Sonar server is not reachable.\n',
            ],
          },
          {
            kind: 'endsWith',
            value: 'error: Script "sonar" failed after 0 s with: Not Found\n',
          },
          {
            kind: 'contains',
            invert: true,
            value: 'warn',
          },
        ]);

        assert.isTrue(shellCommand.calledOnceWith('git', ['branch', '--show-current']));
      });

      describe(' when project already exists in Sonar', () => {
        beforeEach(() => {
          simulateSonarProjectAlreadyExists();
          simulateCurrentGitLocalBranchIs('current-local-branch');
        });

        it(` should succeed when simple code analysis succeeds.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value: 'info: Script "sonar" successful after 0 s\n',
            },
          ]);

          assert.isFalse(subScript.called);

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
            ]),
          );
        });

        it(` should succeed when code analysis against a target branch succeeds.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript('develop', loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value: 'info: Script "sonar" successful after 0 s\n',
            },
          ]);

          assert.isFalse(subScript.called);

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
              '-Dsonar.branch.target=develop',
            ]),
          );
        });

        it(` should fail when simple code analysis fails.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand
            .withArgs(SONAR_SCANNER)
            .rejects(new Error('An error occurred while analyzing source code.'));

          await expect(sonarScript.run()).rejects.toThrow(
            'An error occurred while analyzing source code.',
          );

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value:
                'error: Script "sonar" failed after 0 s with: An error occurred while analyzing source code.\n',
            },
          ]);

          assert.isFalse(subScript.called);

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
            ]),
          );
        });
      });

      describe(' when project does not yet exist in Sonar', () => {
        beforeEach(() => {
          simulateSonarProjectDoesNotYetExist();
          simulateCurrentGitLocalBranchIs('current-local-branch');
        });

        it(` should initialize Sonar project with a warning and then successfully analyze code.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: [
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
              ],
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value: 'info: Script "sonar" successful after 0 s\n',
            },
          ]);

          assert.isTrue(subScript.calledOnceWithExactly(SonarInitScript, {}, {}));

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
            ]),
          );
        });

        it(` should initialize Sonar project with a warning and then successfully analyze code against a target branch.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript('develop', loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: [
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
              ],
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value: 'info: Script "sonar" successful after 0 s\n',
            },
          ]);

          assert.isTrue(subScript.calledOnceWithExactly(SonarInitScript, {}, {}));

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
              '-Dsonar.branch.target=develop',
            ]),
          );
        });

        it(` should fail when Sonar project initialization fails.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          subScript
            .withArgs(SonarInitScript)
            .rejects(new Error('An error occurred while calling sonar-init sub-script.'));

          await expect(sonarScript.run()).rejects.toThrow(
            'An error occurred while calling sonar-init sub-script.',
          );

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: [
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
              ],
            },
            {
              kind: 'endsWith',
              value:
                'error: Script "sonar" failed after 0 s with: An error occurred while calling sonar-init sub-script.\n',
            },
            {
              kind: 'contains',
              invert: true,
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
          ]);

          assert.isTrue(subScript.calledOnceWithExactly(SonarInitScript, {}, {}));

          assert.isTrue(shellCommand.calledOnceWith('git', ['branch', '--show-current']));
        });

        it(` should fail when code analysis fails after project initialization.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          subScript.withArgs(SonarInitScript).returns(0);
          shellCommand
            .withArgs(SONAR_SCANNER)
            .rejects(new Error('An error occurred while analyzing source code.'));

          await expect(sonarScript.run()).rejects.toThrow(
            'An error occurred while analyzing source code.',
          );

          assertText(loggerRecorder.recordedLogs, [
            {
              kind: 'startsWith',
              value: 'info: Script "sonar" starting...\n',
            },
            {
              kind: 'contains',
              value: [
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
                "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
              ],
            },
            {
              kind: 'contains',
              value: 'info: Analyzing current branch "current-local-branch" source code...\n',
            },
            {
              kind: 'endsWith',
              value:
                'error: Script "sonar" failed after 0 s with: An error occurred while analyzing source code.\n',
            },
          ]);

          assert.isTrue(subScript.calledOnceWithExactly(SonarInitScript, {}, {}));

          assert.equal(shellCommand.callCount, 2);
          assert.isTrue(shellCommand.calledWith('git', ['branch', '--show-current']));
          assert.isTrue(
            shellCommand.calledWithExactly(SONAR_SCANNER, [
              '-Dsonar.branch.name=current-local-branch',
            ]),
          );
        });
      });
    });
  });

  describe(' when using a sonar-project.properties file where Sonar host is missing', () => {
    before(async () => {
      await fs.copyFile(
        './src/utils/test-sonar-project_missing-host.properties',
        './sonar-project.properties',
      );
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    it(` should fail with a message about missing host url.`, async () => {
      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript(null, loggerRecorder.logger);

      await expect(sonarScript.run()).rejects.toThrow(
        '"sonar.host.url" property must be defined in "sonar-project.properties" file!',
      );

      assert.isFalse(subScript.called);
      assert.isFalse(shellCommand.called);
    });
  });

  describe(' when using a sonar-project.properties file where Sonar project key is missing', () => {
    before(async () => {
      await fs.copyFile(
        './src/utils/test-sonar-project_missing-project-key.properties',
        './sonar-project.properties',
      );
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    it(` should fail with a message about missing project key.`, async () => {
      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript(null, loggerRecorder.logger);

      await expect(sonarScript.run()).rejects.toThrow(
        '"sonar.projectKey" property must be defined in "sonar-project.properties" file!',
      );

      assert.isFalse(subScript.called);
      assert.isFalse(shellCommand.called);
    });
  });
});
