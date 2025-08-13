const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public/images');
const targetDir = path.join(__dirname, '../dist/assets');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy all image files
try {
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    if (file.match(/\.(png|jpg|jpeg|svg)$/i)) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${file} to assets/`);
    }
  });
  
  console.log('✅ All images copied successfully to dist/assets/');
} catch (error) {
  console.error('❌ Error copying images:', error);
  process.exit(1);
}