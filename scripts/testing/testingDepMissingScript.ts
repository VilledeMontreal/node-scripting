import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src/index.js';

export class TestingDepMissingScript extends ScriptBase {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingDepMissingScript`;
  }

  get description(): string {
    return `Testing script with a required dependency that is missing in the project`;
  }

  protected get requiredDependencies(): string[] {
    return ['_missingDependency'];
  }

  protected async main() {
    this.logger.info(`In TestingDepMissingScript`);
  }
}
