const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'face-api.js', 'tsconfig.es6.json');

try {
  if (!fs.existsSync(file)) {
    console.log('patch-face-api: file not found, skipping patch.');
    process.exit(0);
  }
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('"extends"')) {
    const newContent = JSON.stringify({
      compilerOptions: {
        outDir: 'build/es6',
        module: 'ES2015',
        target: 'ES5'
      },
      include: ['src']
    }, null, 2);
    fs.writeFileSync(file, newContent + '\n', 'utf8');
    console.log('patch-face-api: patched tsconfig.es6.json');
  } else {
    console.log('patch-face-api: already patched or no extends found.');
  }
} catch (err) {
  console.error('patch-face-api: failed', err);
  process.exit(1);
}
