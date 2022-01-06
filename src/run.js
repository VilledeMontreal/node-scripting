/* eslint-disable */
const execSync = require('child_process').execSync;
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const chalk = require('@caporal/core').chalk;
const globalConstants = require('@villedemontreal/general-utils').globalConstants;

let _isScriptingLibItself;

exports.run = async function (params) {
  try {
    const {
      caporal,
      projectRoot,
      scriptsIndexModule,
      outDir,
      deleteOutDirBeforeCompilation,
      testsLocations,
      overridenCoreScripts
    } = cleanParams(params);

    caporal.name('Montreal CLI').description('A CLI tool for managing your API development tasks');

    addCustomGlobalOptions(caporal);

    addCompileCommand(caporal, projectRoot, outDir, deleteOutDirBeforeCompilation);

    const noCompilScripts = getNoCompilScripts(overridenCoreScripts);
    const scriptName = process.argv.length > 2 ? process.argv[2] : null;

    // ==========================================
    // Run the compilation, except on scripts
    // that have been specified as not requiring
    // it.
    // ==========================================
    if (!scriptName || !noCompilScripts.includes(scriptName)) {
      const compileOptions = process.argv.filter(arg =>
        ['--nc', '-v', '--verbose', '--quiet', '--silent', '--no-color'].includes(arg)
      );
      await caporal.run(['compile', ...compileOptions]);

      if (scriptName === 'c' || scriptName === 'compile') {
        process.exit(0);
      }
    }

    setTestsNodeAppInstanceIfRequired(scriptName);

    const libModulePrefix = isScriptingLibItself() ? `../dist/src` : '.';

    const { configs } = require(`${libModulePrefix}/config/configs`);
    configs.setCaporal(caporal);
    configs.setProjectRoot(projectRoot);
    configs.setProjectOutDir(outDir);
    configs.setTestsLocations(testsLocations);

    const { main } = require(`${libModulePrefix}/main`);
    const exitCode = await main(caporal, scriptsIndexModule);
    process.exit(exitCode);
  } catch (err) {
    // ==========================================
    // Note that this error might have already been printed from
    // the BaseScript.run() method.
    // If that was the case, a tag called '__reported' was injected in
    // the error object in order to let us know that we should skip this error.
    // ==========================================
    if (!err?.meta?.error?.__reported) {
      console.error(err);
    }
    process.exit(1);
  }
};

function setTestsNodeAppInstanceIfRequired(scriptName) {
  // ==========================================
  // We automatically set the "NODE_APP_INSTANCE"
  // environment variable to "tests" when a script
  // name starts with "test-", starts with "testing:",
  // is "test" or is "validate".
  // That way the testing configurations are used.
  //
  // The "--testing" global option forces them.
  // ==========================================
  if (
    process.argv.includes('--testing') ||
    (scriptName &&
      (scriptName === 'test' ||
        scriptName === 'validate' ||
        scriptName.startsWith('test-') ||
        scriptName.startsWith('testing:')))
  ) {
    process.env[globalConstants.envVariables.NODE_APP_INSTANCE] = globalConstants.appInstances.TESTS;
  }
}

function cleanParams(params) {
  let { caporal, projectRoot, scriptsIndexModule, testsLocations, overridenCoreScripts } = params;
  let deleteOutDirBeforeCompilation = false;
  let outDir = projectRoot;

  // ==========================================
  // If the "tsconfig.json" file specifies an
  // "outDir", we use it.
  // ==========================================
  const tsConfigPath = `${projectRoot}/tsconfig.json`;
  if (fs.existsSync(tsConfigPath)) {
    const tsConfigObj = require(tsConfigPath);
    const outDirRel = tsConfigObj?.compilerOptions?.outDir;
    if (outDirRel && !['.', './'].includes(outDirRel)) {
      outDir = path.normalize(`${projectRoot}/${outDirRel.startsWith(`./`) ? outDirRel.substring(2) : outDirRel}`);
      deleteOutDirBeforeCompilation = true;
    }
  }

  scriptsIndexModule =
    scriptsIndexModule && scriptsIndexModule.startsWith(`./`)
      ? `${_.trimEnd(outDir, '/')}/${scriptsIndexModule.substring(2)}`
      : scriptsIndexModule;

  testsLocations = testsLocations.map(dir => {
    if (dir.startsWith(`./`)) {
      dir = `${outDir}/${dir.substring(2)}`;
    }
    return path.normalize(dir);
  });

  return {
    caporal,
    projectRoot,
    scriptsIndexModule,
    outDir,
    deleteOutDirBeforeCompilation,
    testsLocations,
    overridenCoreScripts
  };
}

function getNoCompilScripts(overridenCoreScripts) {
  overridenCoreScripts = overridenCoreScripts || [];

  // ==========================================
  // When running a script on the scripting lib
  // itself, we don't know if all the scripting
  // related TS files have been compiled, so we
  // always have to compile.
  //
  // Also, we always have to compile the core scripts
  // that have been overriden by a project, since
  // their classes are in Typescript.
  // ==========================================
  return isScriptingLibItself()
    ? []
    : ['prettier', 'prettier-fix', 'tslint', 'tslint-fix', 'lint', 'lint-fix', 'watch', 'show-coverage'].filter(
        s => !overridenCoreScripts.includes(s)
      );
}

function addCompileCommand(caporal, projectRoot, outDir, deleteOutDirBeforeCompilation) {
  caporal
    .command(
      'compile',
      `Compile/Transpile the project from Typescript to Javascript. 
Note that this script is automatically executed first when calling most scripts, as long as the "--nc" argument is not specified!\n`
    )
    .alias('c')
    .action(async ({ logger, options }) => {
      if (!options.nc) {
        logger.info('Compilation...');
        try {
          if (deleteOutDirBeforeCompilation) {
            fs.removeSync(outDir);
          }

          const isSilent = options.silent || options.quiet;
          execSync(
            `node ${projectRoot}/node_modules/typescript/lib/tsc.js --project ${projectRoot}`,
            isSilent ? {} : { stdio: [0, 1, 2] }
          );
          logger.info('Compilation done.\n');
        } catch (err) {
          logger.error('Compilation errors');
          const compileError = new Error('Compilation errors');
          compileError.__reported = true;
          throw compileError;
        }
      } else {
        logger.warn(`Compilation skipped because of the "--nc" parameter...\n`);
      }
    });
}

function addCustomGlobalOptions(caporal) {
  caporal.option('--nc', 'Skip compilation', {
    global: true
  });
  caporal.option(
    '--testing',
    'Set the "NODE_APP_INSTANCE" environment variable to "tests" ' +
      'before running the script. This results in the "-tests" configurations to be used. ' +
      'Note that if the name of the script is "test", "validate", starts with "test-", ' +
      'or starts with "testing:" the variable is automatically set, you don\'t need to use this option.',
    {
      global: true
    }
  );
}

function isScriptingLibItself() {
  if (_.isNil(_isScriptingLibItself)) {
    _isScriptingLibItself = false;

    const packageJsonPath = path.resolve(`${__dirname}/../package.json`);
    if (fs.existsSync(packageJsonPath)) {
      const packageJsonObj = require(packageJsonPath);
      _isScriptingLibItself = packageJsonObj.name === '@villedemontreal/scripting';
    }
  }

  return _isScriptingLibItself;
}
