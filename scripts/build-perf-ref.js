/* eslint-disable no-console */
/* Builds the committed (git) version of `src` into `.perf-ref/` so that the
 * A/B benchmark and the differential tests have something to compare the
 * working tree against.
 *
 * It reads the reference straight out of git into a scratch directory and
 * compiles that - it never stashes or otherwise touches the working tree.
 *
 *   node scripts/build-perf-ref.js [ref]     # ref defaults to HEAD
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ref = process.argv[2] || 'HEAD';
const outDir = path.join(root, '.perf-ref');
const srcDir = path.join(outDir, 'src-ref');

const git = (args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1 << 28
  });

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });

const files = git(['ls-tree', '-r', '--name-only', ref, 'src'])
  .split('\n')
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
if (files.length === 0) {
  console.error(`no src/*.ts found at ${ref}`);
  process.exit(1);
}
for (const file of files) {
  const target = path.join(srcDir, path.relative('src', file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, git(['show', `${ref}:${file}`]));
}

// Compile the reference sources on their own, next to the working build.
const tsconfig = {
  compilerOptions: {
    target: 'es2016',
    module: 'commonjs',
    declaration: false,
    outDir: 'build',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmitOnError: false,
    types: ['node']
  },
  include: ['src-ref']
};
fs.writeFileSync(
  path.join(outDir, 'tsconfig.json'),
  JSON.stringify(tsconfig, null, 2)
);
try {
  execFileSync('npx', ['tsc', '-p', path.join(outDir, 'tsconfig.json')], {
    cwd: root,
    stdio: 'inherit'
  });
} catch (e) {
  // Spec files in the reference may not type-check without jest types; the
  // emitted JavaScript is still what we need.
}

// tsc roots the output at the single included directory.
const built = path.join(outDir, 'build');
fs.copyFileSync(path.join(built, 'core.js'), path.join(outDir, 'core-head.js'));
fs.mkdirSync(path.join(outDir, 'dist-head'), { recursive: true });
for (const entry of fs.readdirSync(built, { withFileTypes: true })) {
  const from = path.join(built, entry.name);
  const to = path.join(outDir, 'dist-head', entry.name);
  if (entry.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}

console.log(`Built ${ref} reference into ${outDir}`);
console.log(`  core:  .perf-ref/core-head.js`);
console.log(`  orm:   .perf-ref/dist-head/orm.js`);
