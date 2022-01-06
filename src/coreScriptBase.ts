/* eslint-disable @typescript-eslint/ban-types */
import { ParsedArgumentsObject } from '@caporal/core';
import { IGlobalOptions } from './globalOptions';
import { ScriptBase } from './scriptBase';

/**
 * Base class for a core Script.
 */
export abstract class CoreScriptBase<
  O = {},
  GO extends IGlobalOptions = IGlobalOptions,
  A extends ParsedArgumentsObject = {}
> extends ScriptBase<O, GO, A> {
  get outputName(): string {
    return `${super.outputName} (core)`;
  }
}
