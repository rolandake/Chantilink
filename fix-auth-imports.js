const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

function getRelativeImportPath(fromFile) {
  // Calcule le chemin relatif entre le fichier et src/context/AuthContext.jsx
  const fromDir = path.dirname(fromFile);
  const target = path.join(__dirname, 'src', 'context', 'AuthContext.jsx');
  let relativePath = path.relative(fromDir, target);
  // Format import, sans extension .jsx
  relativePath = relativePath.replace(/\\/g, '/').replace(/\.jsx$/, '');
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
  return relativePath;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const relPath = getRelativeImportPath(filePath);

  // Remplace import { AuthContext } ... par import { useAuth }
  content = content.replace(
    /import\s+\{[^}]*AuthContext[^}]*\}\s+from\s+['"][^'"]+['"]/g,
    `import { useAuth } from "${relPath}"`
  );

  // Remplace useContext(AuthContext) par useAuth()
  content = content.replace(/useContext\s*\(\s*AuthContext\s*\)/g, 'useAuth()');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Corrigé : ${path.relative(__dirname, filePath)}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      walkDir(fullPath);
    } else if (file.name.endsWith('.jsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir(SRC_DIR);

console.log('✅ Tous les fichiers .jsx ont été corrigés !');
