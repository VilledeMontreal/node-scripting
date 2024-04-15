import { Program } from '@caporal/core';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Configs {
  /**
   * The library root. When this library is used
   * as a dependency in a project, the "libRoot"
   * will be the path to the dependency folder,
   * inside the "node_modules".
   */
  public libRoot: string;
  public isWindows: boolean;
  private projectRootVar?: string;
  private projectOutDirVar?: string;
  private caporalVar?: Program;

  constructor() {
    // From the "dist/src/config" folder
    this.libRoot = getProjectRoot();
    this.isWindows = os.platform() === 'win32';
  }

  /**
   * The proper Caporal instance to use in the code!
   * It is on this instance that commands and options
   * have been registered.
   */
  public get caporal() {
    if (!this.caporalVar) {
      throw new Error(`The Caporal instance must have been set on the configurations!`);
    }
    return this.caporalVar;
  }

  public setCaporal(caporal: Program) {
    this.caporalVar = caporal;
  }

  public get projectRoot() {
    if (!this.projectRootVar) {
      throw new Error(`The project root must have been set on the configurations!`);
    }
    return this.projectRootVar;
  }

  public setProjectRoot(projectRoot: string) {
    this.projectRootVar = projectRoot;
  }

  public get projectOutDir() {
    if (!this.projectOutDirVar) {
      throw new Error(`The project output directory must have been set on the configurations!`);
    }
    return this.projectOutDirVar;
  }

  public setProjectOutDir(projectOutDir: string) {
    this.projectOutDirVar = projectOutDir;
  }
}

export function getProjectRoot() {
  let root = path.resolve(path.join(__dirname, '../..'));
  if (root.endsWith('/dist')) {
    root = path.resolve(path.join(root, '..'));
  }
  return root;
}

export const configs: Configs = new Configs();
