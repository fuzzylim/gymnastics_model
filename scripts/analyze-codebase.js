#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CodebaseAnalyzer {
  constructor() {
    this.stats = {
      files: {
        total: 0,
        source: 0,
        test: 0,
        config: 0,
        typescript: 0,
        javascript: 0,
        tsx: 0,
        jsx: 0
      },
      lines: {
        total: 0,
        source: 0,
        test: 0,
        config: 0,
        comments: 0,
        empty: 0
      },
      tests: {
        unitTests: 0,
        e2eTests: 0,
        totalTestCases: 0
      },
      features: [],
      packages: {
        dependencies: 0,
        devDependencies: 0
      }
    };
  }

  isSourceFile(filePath) {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const isInSourceDir = filePath.includes('/app/') || 
                          filePath.includes('/lib/') || 
                          filePath.includes('/components/');
    const isNotTest = !filePath.includes('.test.') && 
                      !filePath.includes('.spec.') && 
                      !filePath.includes('/__tests__/') &&
                      !filePath.includes('/e2e/');
    const isNotConfig = !this.isConfigFile(filePath);
    
    return sourceExtensions.some(ext => filePath.endsWith(ext)) && 
           isInSourceDir && 
           isNotTest && 
           isNotConfig;
  }

  isTestFile(filePath) {
    return filePath.includes('.test.') || 
           filePath.includes('.spec.') || 
           filePath.includes('/__tests__/') ||
           filePath.includes('/e2e/');
  }

  isConfigFile(filePath) {
    const configFiles = [
      'package.json', 'tsconfig.json', 'tailwind.config.js', 
      'next.config.js', 'playwright.config.ts', 'vitest.config.ts',
      'drizzle.config.ts', 'middleware.ts', '.env', '.gitignore',
      'eslint.config.js'
    ];
    const fileName = path.basename(filePath);
    return configFiles.includes(fileName) || fileName.startsWith('.env');
  }

  countLines(content) {
    const lines = content.split('\n');
    let codeLines = 0;
    let commentLines = 0;
    let emptyLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        emptyLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    return { codeLines, commentLines, emptyLines, totalLines: lines.length };
  }

  countTestCases(content, filePath) {
    // Count test/it/describe calls
    const testMatches = content.match(/\b(test|it)\s*\(/g) || [];
    const describeMatches = content.match(/\bdescribe\s*\(/g) || [];
    
    if (filePath.includes('/e2e/')) {
      this.stats.tests.e2eTests += testMatches.length;
    } else {
      this.stats.tests.unitTests += testMatches.length;
    }
    
    return testMatches.length;
  }

  analyzeDirectory(dirPath, relativePath = '') {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        
        // Skip node_modules and hidden directories
        if (item.startsWith('.') && item !== '.env' || 
            item === 'node_modules' || 
            item === 'dist' || 
            item === 'build' ||
            item === '.next') {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.analyzeDirectory(fullPath, relativeItemPath);
        } else if (stat.isFile()) {
          this.analyzeFile(fullPath, relativeItemPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
    }
  }

  analyzeFile(filePath, relativePath) {
    try {
      this.stats.files.total++;
      
      // Count file types
      if (filePath.endsWith('.ts')) this.stats.files.typescript++;
      if (filePath.endsWith('.tsx')) this.stats.files.tsx++;
      if (filePath.endsWith('.js')) this.stats.files.javascript++;
      if (filePath.endsWith('.jsx')) this.stats.files.jsx++;
      
      // Skip binary files and very large files
      const stat = fs.statSync(filePath);
      if (stat.size > 1024 * 1024) return; // Skip files > 1MB
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lineStats = this.countLines(content);
      
      this.stats.lines.total += lineStats.totalLines;
      this.stats.lines.comments += lineStats.commentLines;
      this.stats.lines.empty += lineStats.emptyLines;
      
      if (this.isSourceFile(relativePath)) {
        this.stats.files.source++;
        this.stats.lines.source += lineStats.codeLines;
      } else if (this.isTestFile(relativePath)) {
        this.stats.files.test++;
        this.stats.lines.test += lineStats.codeLines;
        this.countTestCases(content, relativePath);
      } else if (this.isConfigFile(relativePath)) {
        this.stats.files.config++;
        this.stats.lines.config += lineStats.codeLines;
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  analyzePackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      this.stats.packages.dependencies = Object.keys(packageJson.dependencies || {}).length;
      this.stats.packages.devDependencies = Object.keys(packageJson.devDependencies || {}).length;
      
      // Extract features from scripts
      const scripts = packageJson.scripts || {};
      this.stats.features = Object.keys(scripts);
    } catch (error) {
      console.warn('Could not analyze package.json:', error.message);
    }
  }

  generateReport() {
    this.stats.tests.totalTestCases = this.stats.tests.unitTests + this.stats.tests.e2eTests;
    
    console.log('\n📊 CODEBASE ANALYSIS REPORT');
    console.log('================================\n');
    
    console.log('📁 FILE STATISTICS');
    console.log(`Total Files: ${this.stats.files.total}`);
    console.log(`Source Files: ${this.stats.files.source}`);
    console.log(`Test Files: ${this.stats.files.test}`);
    console.log(`Config Files: ${this.stats.files.config}`);
    console.log(`TypeScript Files: ${this.stats.files.typescript}`);
    console.log(`TSX Files: ${this.stats.files.tsx}`);
    console.log(`JavaScript Files: ${this.stats.files.javascript}`);
    console.log(`JSX Files: ${this.stats.files.jsx}\n`);
    
    console.log('📝 LINE STATISTICS');
    console.log(`Total Lines: ${this.stats.lines.total}`);
    console.log(`Source Code Lines: ${this.stats.lines.source}`);
    console.log(`Test Code Lines: ${this.stats.lines.test}`);
    console.log(`Config Lines: ${this.stats.lines.config}`);
    console.log(`Comment Lines: ${this.stats.lines.comments}`);
    console.log(`Empty Lines: ${this.stats.lines.empty}\n`);
    
    console.log('🧪 TEST STATISTICS');
    console.log(`Unit Test Cases: ${this.stats.tests.unitTests}`);
    console.log(`E2E Test Cases: ${this.stats.tests.e2eTests}`);
    console.log(`Total Test Cases: ${this.stats.tests.totalTestCases}\n`);
    
    console.log('📦 DEPENDENCY STATISTICS');
    console.log(`Dependencies: ${this.stats.packages.dependencies}`);
    console.log(`Dev Dependencies: ${this.stats.packages.devDependencies}\n`);
    
    console.log('⚡ AVAILABLE FEATURES (npm scripts)');
    this.stats.features.forEach(feature => console.log(`  - ${feature}`));
    
    return this.stats;
  }

  run() {
    console.log('🔍 Analyzing codebase...');
    this.analyzePackageJson();
    this.analyzeDirectory(process.cwd());
    return this.generateReport();
  }
}

// Run the analyzer
const analyzer = new CodebaseAnalyzer();
const stats = analyzer.run();

// Export for programmatic use
module.exports = { CodebaseAnalyzer, stats };