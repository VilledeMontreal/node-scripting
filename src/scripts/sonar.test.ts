// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// tslint:disable:max-func-body-length
// tslint:disable:no-unused-expression
// ==========================================
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { setTestingConfigs, timeout } from '../utils/testingUtils';
import { SONAR_SCANNER, SonarScript } from './sonar';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import { SonarInitScript } from './sonarInit';
import {
  LoggerRecorder,
  simulateSonarProjectAlreadyExists,
  simulateSonarProjectDoesNotYetExist
} from '../utils/sonarTestUtils';

const nock = require('nock');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require("sinon-chai"));
chai.use(require("chai-string"));

const sandbox = sinon.createSandbox();
// @ts-ignore
const shellCommand = sandbox.stub(SonarScript.prototype, 'invokeShellCommand');
// @ts-ignore
const subScript = sandbox.stub(SonarScript.prototype, 'invokeScript');

function getSonarScript(targetBranch: string, logger: {}): SonarScript {
  let options = {};
  if (targetBranch) {
    options = {
      targetBranch
    };
  }

  return new SonarScript({
    args: {},
    options,
    program: sinon.stub() as any,
    command: sinon.stub() as any,
    ddash: sinon.stub() as any,
    logger: logger as any
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

describe('sonar script', function () {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();
  });

  afterEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  })

  after(() => {
    sandbox.restore();
  })

  it(` should fail when sonar-project.properties is missing`, async () => {
    const loggerRecorder = new LoggerRecorder();
    const sonarScript = getSonarScript(null, loggerRecorder.logger);

    await expect(sonarScript.run()).to.be.rejectedWith(
      Error,
      "ENOENT: no such file or directory, open 'sonar-project.properties'"
    );

    expect(loggerRecorder.recordedLogs).to.equal(`info: Script "sonar" starting...
error: Script "sonar" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`);
  });

  describe(' with valid sonar-project.properties file', async () => {
    before(async () => {
      await fs.copyFile('./src/utils/test-sonar-project.properties', './sonar-project.properties');
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it(` should fail when there is no local git repository`, async () => {
      simulateThereIsNoLocalGitRepository();

      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript(null, loggerRecorder.logger);

      await expect(sonarScript.run()).to.be.rejectedWith(
        Error,
        'Expected success codes were "0", but the process exited with "128".'
      );

      expect(loggerRecorder.recordedLogs)
      .to.startWith(`info: Script "sonar" starting...\n`)
      .and.to.contain('info: Executing: git branch,--show-current\n')
      .and.to.endWith('error: Script "sonar" failed after 0 s with: Expected success codes were "0", but the process exited with "128".\n');

      subScript.should.not.have.been.called;

      shellCommand.should.have.been.calledOnceWith('git', ['branch', '--show-current']);
    });

    describe(' when project already exists in Sonar', () => {
      beforeEach(() => {
        simulateCurrentGitLocalBranchIs('current-local-branch');
        simulateSonarProjectAlreadyExists();
      });

      it(` should succeed when simple code analysis succeeds.`, async () => {
        const loggerRecorder = new LoggerRecorder();
        const sonarScript = getSonarScript(undefined, loggerRecorder.logger);

        await sonarScript.run();

        expect(loggerRecorder.recordedLogs)
        .to.startsWith('info: Script "sonar" starting...\n')
        .and.to.contain('info: Analyzing current branch "current-local-branch" source code...\n')
        .and.to.endWith('info: Script "sonar" successful after 0 s\n');

        subScript.should.not.have.been.called;

        shellCommand.should.have.been.calledTwice;
        shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
        shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, ['-Dsonar.branch.name=current-local-branch']);
      });

      it(` should succeed when code analysis against a target branch succeeds.`, async () => {
        const loggerRecorder = new LoggerRecorder();
        const sonarScript = getSonarScript('develop', loggerRecorder.logger);

        await sonarScript.run();

        expect(loggerRecorder.recordedLogs)
        .to.startsWith('info: Script "sonar" starting...\n')
        .and.to.contain('info: Analyzing current branch "current-local-branch" source code...\n')
        .and.to.endWith('info: Script "sonar" successful after 0 s\n');

        subScript.should.not.have.been.called;

        shellCommand.should.have.been.calledTwice;
        shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
        shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, ['-Dsonar.branch.name=current-local-branch', '-Dsonar.branch.target=develop']);
      });
    });

    it(` should initialize Sonar project with a warning and then successfully analyze code when project does not yet exist in Sonar.`, async () => {
      simulateSonarProjectDoesNotYetExist();
      simulateCurrentGitLocalBranchIs('current-local-branch');

      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript('develop', loggerRecorder.logger);

      await sonarScript.run();

      expect(loggerRecorder.recordedLogs)
      .to.startsWith('info: Script "sonar" starting...\n')
      .and.to.contain('info: Analyzing current branch "current-local-branch" source code...\n')
      .and.to.endWith('info: Script "sonar" successful after 0 s\n');

      expect(loggerRecorder.recordedLogs)
      .to.contain("warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n");

      subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

      shellCommand.should.have.been.calledTwice;
      shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
      shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, ['-Dsonar.branch.name=current-local-branch', '-Dsonar.branch.target=develop']);
    });

    // TODO Geraud : add more test cases:
    //               - when git branch fails
    //               - when passing no target branch
    //               - when sonar project does not yet exists

  });

});
