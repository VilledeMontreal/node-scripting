import { configs } from '../config/configs';
import { CoreLintScriptBase } from '../coreLintScriptBase';

export class TsLintFixScript extends CoreLintScriptBase {
  get name(): string {
    return 'tslint-fix';
  }

  get description(): string {
    return (
      `Fix the project formating using the TSLint rules. ` +
      `Note that some errors may not be fixable automatically and may` +
      `need manual help.`
    );
  }

  protected async main() {
    const { eslintFix, ProjectType } = require(`${configs.projectRoot}/node_modules/@villedemontreal/lint-config`);
    await eslintFix(configs.projectRoot, ProjectType.NODE);
  }
}
