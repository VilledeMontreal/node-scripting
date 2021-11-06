// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:max-func-body-length
// tslint:disable: no-console
// ==========================================
import { program as caporal, Program } from '@caporal/core';
import { globalConstants, utils } from '@villedemontreal/general-utils';
import { assert } from 'chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import { TestingScript } from '../scripts/testing/testingScript';
import { configs } from './config/configs';
import {
  containsText,
  isMainHelpDisplayed,
  run,
  setTestingConfigs,
  timeout,
  withCustomRunFile,
  withLogNodeInstance
} from './utils/testingUtils';
const nock = require('nock');

describe(`Scripts tests`, function() {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();
  });

  describe(`Compilation`, () => {
    it(`Default`, async function() {
      timeout(this, 60000);

      const distDir = path.resolve(`${__dirname}/..`);

      await utils.deleteDir(distDir);
      assert.isFalse(fs.existsSync(distDir));

      const { output, isSuccess } = await run(`testing:testingScript`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`Compilation done.`) > -1);
      assert.isFalse(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(output.indexOf(`msg: info`) > -1);

      // ==========================================
      // The "dist" folder has been generated
      // ==========================================
      assert.isTrue(fs.existsSync(distDir));
    });

    it(`No compilation`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isTrue(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(output.indexOf(`msg: info`) > -1);
    });

    it(`Compilation silent option`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--silent`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isFalse(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isFalse(output.indexOf(`msg: info`) > -1);
    });
  });

  describe(`Logs`, () => {
    it(`Default is info`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`msg: debug`) > -1);
      assert.isTrue(output.indexOf(`msg: info`) > -1);
      assert.isTrue(output.indexOf(`msg: warn`) > -1);
      assert.isTrue(output.indexOf(`msg: error`) > -1);
    });

    it(`Silent arg`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--silent`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`msg: debug`) > -1);
      assert.isFalse(output.indexOf(`msg: info`) > -1);
      assert.isFalse(output.indexOf(`msg: warn`) > -1);
      assert.isFalse(output.indexOf(`msg: error`) > -1);
    });

    it(`Quiet arg`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--quiet`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`msg: debug`) > -1);
      assert.isFalse(output.indexOf(`msg: info`) > -1);
      assert.isTrue(output.indexOf(`msg: warn`) > -1);
      assert.isTrue(output.indexOf(`msg: error`) > -1);
    });

    it(`Verbose arg`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--verbose`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`msg: debug`) > -1);
      assert.isTrue(output.indexOf(`msg: info`) > -1);
      assert.isTrue(output.indexOf(`msg: warn`) > -1);
      assert.isTrue(output.indexOf(`msg: error`) > -1);
    });

    it(`Verbose short arg`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `-v`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`msg: debug`) > -1);
      assert.isTrue(output.indexOf(`msg: info`) > -1);
      assert.isTrue(output.indexOf(`msg: warn`) > -1);
      assert.isTrue(output.indexOf(`msg: error`) > -1);
    });
  });

  describe(`Main Help`, () => {
    it(`No args at all - compilation is done and main help is displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run();
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`Compilation done.`) > -1);
      assert.isFalse(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Just "help" and "--nc" - no compilation is done and main help is displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`help`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isTrue(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);
      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Just "--help" - compilation is done and main help is displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`--help`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`Compilation done.`) > -1);
      assert.isFalse(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);
      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Just "-h" - compilation is done and main help is displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`-h`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`Compilation done.`) > -1);
      assert.isFalse(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Just "--nc" - No compilation is done and main help is displayed`, async () => {
      const { output, isSuccess } = await run(`--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isTrue(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`"--help" and "--nc" - No compilation is done and main help is displayed`, async () => {
      const { output, isSuccess } = await run(`--help`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isTrue(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`"-h" and "--nc" - No compilation is done and main help is displayed`, async () => {
      const { output, isSuccess } = await run(`-h`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isFalse(output.indexOf(`Compilation done.`) > -1);
      assert.isTrue(output.indexOf(`Compilation skipped because of the "--nc" parameter...`) > -1);

      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Unknown command - Main help is displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`NOPE`, `--nc`);
      assert.isFalse(isSuccess);

      assert.isTrue(output.indexOf(`Unknown command NOPE`) > -1);
      assert.isTrue(isMainHelpDisplayed(output));
    });

    it(`Unknown command with --silent arg - Main help not displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`NOPE`, `--nc`, `--silent`);
      assert.isFalse(isSuccess);

      assert.isTrue(output.indexOf(`Unknown command NOPE`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    it(`Unknown command with --quiet arg - Main help not displayed`, async function() {
      timeout(this, 60000);

      const { output, isSuccess } = await run(`NOPE`, `--nc`, `--quiet`);
      assert.isFalse(isSuccess);

      assert.isTrue(output.indexOf(`Unknown command NOPE`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });
  });

  describe(`Command Help`, () => {
    it(`Using "--help"`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--help`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`A simple testing script`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    it(`Using "-h"`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `-h`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`A simple testing script`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    it(`Help command`, async () => {
      const { output, isSuccess } = await run(`help`, `testing:testingScript`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`A simple testing script`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    it(`Command Help for hidden scripts works too`, async () => {
      const { output, isSuccess } = await run(
        `testing:testingHiddenScript`,
        `--nc`,
        `--userName`,
        `Stromgol`,
        `--help`
      );
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`A testing hidden script`) > -1);
    });
  });

  describe(`Varia`, () => {
    it(`Custom short option`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `-p`, `123`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`port: 123`) > -1);
    });

    it(`Custom long option`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--port`, `123`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`port: 123`) > -1);
    });

    it(`Option not specified but required ("--userName" here) - The help of the command is displayed`, async () => {
      const { output, isSuccess } = await run(`testing:testingHiddenScript`, `--nc`);
      assert.isFalse(isSuccess);

      assert.isFalse(output.indexOf(`userName is`) > -1);
      assert.isTrue(output.indexOf(`Missing required flag --username`) > -1);
      assert.isTrue(output.indexOf(`USAGE — testing:testingHiddenScript`) > -1); // command help
    });

    it(`Regular Error (the help of the command is not printed!)`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--throwError`);
      assert.isFalse(isSuccess);

      assert.isTrue(output.indexOf(`This is a regular error`) > -1);
      assert.isFalse(output.indexOf(`userName is`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
      assert.isFalse(output.indexOf(`USAGE — testing:testingHiddenScript`) > -1); // NO command help!
    });

    it(`Invalid argument`, async () => {
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`, `--port`, `notANumber`);
      assert.isFalse(isSuccess);

      assert.isTrue(output.indexOf(`Invalid value for option`) > -1);
      assert.isFalse(output.indexOf(`userName is`) > -1);
      assert.isTrue(output.indexOf(`USAGE — testing:testingScript`) > -1); // command help
    });

    it(`Hidden script can still be called`, async () => {
      const { output, isSuccess } = await run(`testing:testingHiddenScript`, `--nc`, `--username`, `Stromgol`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`username is Stromgol`) > -1);
    });

    it(`We can register a script without passing action parameters`, async () => {
      const prog = new Program();
      assert.isFalse(caporal.getCommands().some(command => command.name === 'testing:testingScript'));

      const script = new TestingScript(null); // no params!
      await script.registerScript(prog);

      let found = false;
      for (let i = prog.getCommands().length - 1; i >= 0; --i) {
        if (prog.getCommands()[i].name === 'testing:testingScript') {
          found = true;
          prog.getCommands().splice(i, 1);
          break;
        }
      }
      assert.isTrue(found);
    });

    it(`Calling a script using NPM`, async () => {
      let output = ``;
      await utils.exec(configs.isWindows ? 'npm.cmd' : 'npm', [`run`, `prettier`, `--`, `--nc`, `--help`], {
        outputHandler: (stdoutData: string, stderrData: string) => {
          const newOut = `${stdoutData ? ' ' + stdoutData : ''} ${stderrData ? ' ' + stderrData : ''} `;
          output += newOut;
        }
      });

      assert.isTrue(output.indexOf(`Validate that the project respects the Prettier rules`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    /**
     * Note that it is way easier to call a script
     * programatically *from another script*, since you
     * can simply use `this.invokeScript()`.
     *
     * Also, if some logic is required in a script
     * *and* elsewhere in the application, it may be a good
     * idea to move this code in a service or in an utility!
     */
    it(`Calling a script programmatically`, async () => {
      let output = '';
      const logger = new Proxy(
        {},
        {
          get: (target, prop) => {
            // tslint:disable-next-line: only-arrow-functions
            return function() {
              if (prop === 'info') {
                output += arguments[0] + '\n';
              }
            };
          }
        }
      );

      await new TestingScript({
        args: {},
        options: {
          port: 789
        },
        program: sinon.stub() as any,
        command: sinon.stub() as any,
        ddash: sinon.stub() as any,
        logger: logger as any
      }).run();

      assert.isTrue(output.indexOf(`port: 789`) > -1);
    });

    it(`OutputName - Regular script`, async () => {
      // Core script
      const { output, isSuccess } = await run(`testing:testingScript`, `--nc`);
      assert.isTrue(isSuccess);
      assert.isTrue(output.indexOf(`Script "testing:testingScript"`) > -1);
    });

    it(`OutputName - Core script`, async () => {
      // Core script
      const { output, isSuccess } = await run(`testing:testingCoreScript`, `--nc`);
      assert.isTrue(isSuccess);
      assert.isTrue(output.indexOf(`Script "testing:testingCoreScript (core)"`) > -1);
    });

    /**
     * Since the `run()` command starts a new process, we
     * can't add a global option to the proper Caporal
     * instance directly here. We need to tweak the `run`
     * file and add it there.
     */
    it(`Custom global options`, async () => {
      const { output, isSuccess } = await withCustomRunFile(
        `const caporal = require('@caporal/core').program;`,
        `const caporal = require('@caporal/core').program;
       caporal.option('--custom', 'Custom global option', {
         global: true
       });
    `,
        `testing:testingScriptGlobalCustomOptions1`,
        `--nc`,
        `--custom`
      );

      assert.isTrue(isSuccess);
      assert.isTrue(output.indexOf(`custom #1: true`) > -1);
      assert.isTrue(output.indexOf(`custom #2: true`) > -1);
    });

    it(`"scriptsIndexModule" can be undefined`, async () => {
      const { output, isSuccess } = await withCustomRunFile(
        'scriptsIndexModule: `./scripts/index`,',
        ``,
        `prettier`,
        `--help`,
        `--nc`
      );

      assert.isTrue(isSuccess);
      assert.isTrue(output.indexOf(`Validate that the project respects the Prettier rules.`) > -1);
      assert.isFalse(isMainHelpDisplayed(output));
    });

    it(`A required dependency is missing`, async () => {
      const { output, isSuccess } = await run(`testing:testingDepMissingScript`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`This script requires some dependencies that are not direct`) > -1);
      assert.isTrue(output.indexOf(`- _missingDependency`) > -1);

      // Script still called
      assert.isTrue(output.indexOf(`In TestingDepMissingScript`) > -1);
    });
  });

  describe('Cascading scripts', () => {
    it(`Call subscript with defaults`, async () => {
      const { output, isSuccess } = await run(`testing:testingCallingScript`, `--nc`, `--foo`, `55`);
      assert.isTrue(isSuccess);

      const expectedOutput = `info: Script "testing:testingCallingScript" starting...
info: Script "testing:testingScriptWithArgs" starting...
info: Start service MyService on port 55 with delay undefined, --verbose: undefined
info: Script "testing:testingScriptWithArgs" successful

info: Script "testing:testingExampleScript" starting...
info: The lucky number is 55
info: Script "testing:testingExampleScript" successful

info: Script "testing:testingCallingScript" successful`;
      assert.isTrue(containsText(output, expectedOutput));
    });

    it(`Call subscript without defaults, with the "--verbose" global option`, async () => {
      const { output, isSuccess } = await run(
        `testing:testingCallingScript`,
        `--nc`,
        `--verbose`,
        `--foo`,
        `56`,
        `--bar`,
        `someName`,
        `--delay`,
        `100`
      );
      assert.isTrue(isSuccess);

      const expectedOutput = `info: Script "testing:testingCallingScript" starting...
info: Script "testing:testingScriptWithArgs" starting...
info: Start service someName on port 56 with delay 100, --verbose: true
info: Script "testing:testingScriptWithArgs" successful

info: Script "testing:testingExampleScript" starting...
info: The lucky number is 56
info: Script "testing:testingExampleScript" successful

info: Script "testing:testingCallingScript" successful`;
      assert.isTrue(containsText(output, expectedOutput));
    });

    it(`Call subscript without defaults, without the "--verbose" global option`, async () => {
      const { output, isSuccess } = await run(
        `testing:testingCallingScript`,
        `--nc`,
        // `--verbose`, // no verbose
        `--foo`,
        `56`,
        `--bar`,
        `someName`,
        `--delay`,
        `100`
      );
      assert.isTrue(isSuccess);

      const expectedOutput = `info: Script "testing:testingCallingScript" starting...
info: Script "testing:testingScriptWithArgs" starting...
info: Start service someName on port 56 with delay 100, --verbose: undefined
info: Script "testing:testingScriptWithArgs" successful

info: Script "testing:testingExampleScript" starting...
info: The lucky number is 56
info: Script "testing:testingExampleScript" successful

info: Script "testing:testingCallingScript" successful`;
      assert.isTrue(containsText(output, expectedOutput));
    });

    it(`Call subscript without defaults, with the "--verbose" global option but then forced to false`, async () => {
      const { output, isSuccess } = await run(
        `testing:testingCallingScript`,
        `--nc`,
        `--verbose`, // verbose
        `--forceVerboseToFalse`, // force verbose to false when calling another script
        `--foo`,
        `56`,
        `--bar`,
        `someName`,
        `--delay`,
        `100`
      );
      assert.isTrue(isSuccess);

      const expectedOutput = `info: Script "testing:testingCallingScript" starting...
info: Script "testing:testingScriptWithArgs" starting...
info: Start service someName on port 56 with delay 100, --verbose: false
info: Script "testing:testingScriptWithArgs" successful

info: Script "testing:testingExampleScript" starting...
info: The lucky number is 56
info: Script "testing:testingExampleScript" successful

info: Script "testing:testingCallingScript" successful`;
      assert.isTrue(containsText(output, expectedOutput));
    });

    it(`Call failing subscript`, async () => {
      const { output, isSuccess } = await run(
        `testing:testingCallingScript`,
        `--nc`,
        `--foo`,
        `56`,
        `--bar`,
        `someName`,
        `--delay`,
        `100`,
        `--throwError`
      );
      assert.isFalse(isSuccess);

      const expectedOutput = `info: Script "testing:testingCallingScript" starting...
      info: Script "testing:testingCallingScript" starting...
      info: Script "testing:testingScriptWithArgs" starting...
      info: Start service someName on port 56 with delay 100
   
      error: Script "testing:testingScriptWithArgs" failed after
   
      warn: Script "testing:testingCallingScript" was aborted after`;
      assert.isTrue(containsText(output, expectedOutput));
      assert.isTrue(output.indexOf(`with: Some error...`) > -1);
    });
  });

  describe(`NODE_APP_INSTANCE env var`, () => {
    let nodeAppInstanceOriginal: string;

    before(() => {
      nodeAppInstanceOriginal = process.env[globalConstants.envVariables.NODE_APP_INSTANCE];
    });

    after(() => {
      if (nodeAppInstanceOriginal) {
        process.env[globalConstants.envVariables.NODE_APP_INSTANCE] = nodeAppInstanceOriginal;
      } else {
        delete process.env[globalConstants.envVariables.NODE_APP_INSTANCE];
      }
    });

    it(`test script -> set to "tests" automatically`, async () => {
      delete process.env[globalConstants.envVariables.NODE_APP_INSTANCE];

      const { output, isSuccess } = await withLogNodeInstance(`testing:testingScript`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`MAIN NODE_APP_INSTANCE: tests`) > -1);
    });

    it(`non test script -> not set to "tests"`, async () => {
      delete process.env[globalConstants.envVariables.NODE_APP_INSTANCE];

      const { output, isSuccess } = await withLogNodeInstance(`prettier`, `--nc`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`MAIN NODE_APP_INSTANCE: undefined`) > -1);
    });

    it(`non test script with "--testing"`, async () => {
      delete process.env[globalConstants.envVariables.NODE_APP_INSTANCE];

      const { output, isSuccess } = await withLogNodeInstance(`prettier`, `--nc`, `--testing`);
      assert.isTrue(isSuccess);

      assert.isTrue(output.indexOf(`MAIN NODE_APP_INSTANCE: tests`) > -1);
    });
  });

  describe('Sonar-init script', () => {
    it(` should fail when sonar-project.properties is missing`, async () => {
      const { output, isSuccess } = await run(`sonar-init`);
      assert.isFalse(isSuccess);

      const expectedOutput = `info: Script "sonar-init" starting...

error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`;
      assert.isTrue(containsText(output, expectedOutput));
    });

    // Skipping this unit test suite: all these tests are integration tests on scripts; scripts are
    // executed in another spawned process; therefore, using Nock to stub http calls does not work.
    // One solution to make these tests succeed would be to run a sonar server in a side-car container,
    // and then use it to test 'sonar' and 'sonar-init' scripts.
    describe.skip(' with valid sonar-project.properties file', async () => {
      before(async () => {
        await fs.copyFile(
          './src/utils/test-sonar-project_url-with-trailing-slash.properties',
          './sonar-project.properties'
        );
      });
      after(async () => {
        await fs.unlink('./sonar-project.properties');
      });

      afterEach(() => {
        nock.cleanAll();
      });

      it(` should do something`, async () => {
        nock('https://example.com')
          .get('/sonar/api/project_branches/list')
          .query({ project: 'my-project-key' })
          .reply(200);

        nock('https://example.com')
          .get('/sonar/api/another_endpoint')
          .reply(200);

        const { output, isSuccess } = await run(`sonar-init`, '-v');

        console.info('***** Pending mocks *****');
        console.info(nock.pendingMocks());
        console.info('*************************');

        assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

        assert.isTrue(isSuccess);

        const expectedOutput = `info: Script "sonar-init" starting...

error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`;
        assert.isTrue(containsText(output, expectedOutput));
      });
    });
  });
});
