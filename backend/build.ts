import s from 'shelljs';

import config from './tsconfig.json';
const outDir = config.compilerOptions.outDir;
const targetDir = `${outDir}/backend/server`;

s.rm('-rf', outDir);
s.mkdir(outDir);
s.mkdir('-p', targetDir);
s.cp('.env', `${targetDir}/.env`);
s.mkdir('-p', `${targetDir}/common`);
s.cp('server/common/api.yml', `${targetDir}/common/api.yml`);