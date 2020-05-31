import s from 'shelljs';
import path from 'path';

import config from './tsconfig.json';
const outDir = path.resolve(config.compilerOptions.outDir);

const currentFolderName = path.basename(__dirname);
const targetDir = path.resolve(outDir, currentFolderName, 'server');

s.rm('-rf', outDir);
s.mkdir(outDir);
s.mkdir('-p', targetDir);
s.cp('.env', `${targetDir}/.env`);
s.mkdir('-p', `${targetDir}/common`);
s.cp('server/common/api.yml', `${targetDir}/common/api.yml`);
