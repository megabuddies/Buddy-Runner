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
  if (!fs.existsSync(sourceDir)) {
    console.log('⚠️ Source directory does not exist:', sourceDir);
    return;
  }

  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;
  
  files.forEach(file => {
    if (file.match(/\.(png|jpg|jpeg|svg)$/i) && !file.startsWith('.')) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ Copied ${file} to assets/`);
        copiedCount++;
      } catch (err) {
        console.error(`❌ Failed to copy ${file}:`, err.message);
      }
    }
  });
  
  console.log(`✅ Successfully copied ${copiedCount} images to dist/assets/`);
} catch (error) {
  console.error('❌ Error copying images:', error);
  // Don't exit with error code to avoid breaking the build
}