// Ensure @vitejs/plugin-react-swc uses native import.meta.dirname (Node v21.2+)
// The plugin ships with import.meta.dirname which works fine with Node v24.
// Older patches that replaced it with require() are reverted here.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@vitejs', 'plugin-react-swc', 'index.js');

if (!fs.existsSync(target)) {
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');
const bad = "require('node:path').dirname(require('node:url').fileURLToPath(import.meta.url))";
if (content.includes(bad)) {
  content = content.replace(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'import.meta.dirname');
  fs.writeFileSync(target, content, 'utf8');
  console.log('[patch] Restored import.meta.dirname');
}