#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

class PRReadinessValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(type, message) {
    const formatted = `${message}`;
    if (type === 'error') {
      this.issues.push(formatted);
      console.error(`❌ ${formatted}`);
    } else if (type === 'warning') {
      this.warnings.push(formatted);
      console.warn(`⚠️  ${formatted}`);
    } else {
      this.passed.push(formatted);
      console.log(`✅ ${formatted}`);
    }
  }

  checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.log('error', 'Uncommitted changes detected. All changes must be committed before PR.');
        this.log('error', 'Run: git add -A && git commit -m "your message"');
        return false;
      } else {
        this.log('success', 'Working directory clean - all changes committed');
        return true;
      }
    } catch (error) {
      this.log('error', `Git status check failed: ${error.message}`);
      return false;
    }
  }

  checkMetricsFiles() {
    const requiredFiles = [
      'verified-facts.json',
      'deployment-metrics.json'
    ];

    let allPresent = true;
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.log('success', `Metrics file present: ${file}`);
        
        // Check if file is recent (modified within last hour)
        const stats = fs.statSync(file);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageHours > 1) {
          this.log('warning', `${file} is ${ageHours.toFixed(1)} hours old - consider regenerating`);
        } else {
          this.log('success', `${file} is recent (${(ageHours * 60).toFixed(1)} minutes old)`);
        }
      } else {
        this.log('error', `Missing required metrics file: ${file}`);
        allPresent = false;
      }
    }

    return allPresent;
  }

  checkCLAUDEMetricsTimestamp() {
    try {
      const claudeContent = fs.readFileSync('CLAUDE.md', 'utf8');
      const timestampMatch = claudeContent.match(/\*Last updated: ([^*]+)\*/);
      
      if (!timestampMatch) {
        this.log('error', 'CLAUDE.md missing metrics timestamp');
        return false;
      }

      const timestamp = new Date(timestampMatch[1]);
      const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
      
      if (ageMinutes > 60) {
        this.log('warning', `CLAUDE.md metrics are ${ageMinutes.toFixed(1)} minutes old`);
        this.log('warning', 'Consider running: npm run metrics:full');
      } else {
        this.log('success', `CLAUDE.md metrics are current (${ageMinutes.toFixed(1)} minutes old)`);
      }
      
      return true;
    } catch (error) {
      this.log('error', `Failed to check CLAUDE.md timestamp: ${error.message}`);
      return false;
    }
  }

  checkTestsPassing() {
    const checks = [
      { command: 'npm run test', name: 'Unit tests' },
      { command: 'npm run typecheck', name: 'TypeScript check' },
      { command: 'npm run lint', name: 'Linting' },
      { command: 'npm run metrics:test', name: 'Metrics pipeline' }
    ];

    let allPassing = true;
    for (const check of checks) {
      try {
        execSync(check.command, { stdio: 'pipe' });
        this.log('success', `${check.name} passing`);
      } catch (error) {
        this.log('error', `${check.name} failing - run: ${check.command}`);
        allPassing = false;
      }
    }

    return allPassing;
  }

  checkBranchStatus() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      if (branch === 'main' || branch === 'master') {
        this.log('error', 'You are on main/master branch. Create a feature branch first.');
        this.log('error', 'Run: git checkout -b feature/your-feature-name');
        return false;
      } else {
        this.log('success', `On feature branch: ${branch}`);
        return true;
      }
    } catch (error) {
      this.log('warning', `Could not determine branch: ${error.message}`);
      return true; // Don't fail for this
    }
  }

  checkCommitHasMetrics() {
    try {
      const lastCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' });
      
      if (lastCommit.includes('📊') || lastCommit.includes('metrics')) {
        this.log('success', 'Last commit includes metrics information');
        return true;
      } else {
        this.log('warning', 'Last commit does not mention metrics - consider amending');
        return true; // Don't fail for this
      }
    } catch (error) {
      this.log('warning', `Could not check commit message: ${error.message}`);
      return true;
    }
  }

  generateReport() {
    console.log('\n🔍 PR READINESS VALIDATION REPORT');
    console.log('===================================\n');

    const total = this.passed.length + this.warnings.length + this.issues.length;
    const successRate = ((this.passed.length / total) * 100).toFixed(1);

    console.log(`✅ Checks Passed: ${this.passed.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Issues: ${this.issues.length}`);
    console.log(`📊 Success Rate: ${successRate}%\n`);

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS TO ADDRESS:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
      console.log('');
    }

    if (this.issues.length > 0) {
      console.log('❌ CRITICAL ISSUES - MUST FIX BEFORE PR:');
      this.issues.forEach(issue => console.log(`   • ${issue}`));
      console.log('');
    }

    if (this.issues.length === 0) {
      console.log('🎉 PR is ready for submission!');
      console.log('🚀 Next steps:');
      console.log('   1. Push branch: git push origin feature/your-branch');
      console.log('   2. Create PR with metrics summary');
      console.log('   3. Wait for GitHub Actions validation');
      return true;
    } else {
      console.log('🔧 Fix the critical issues above, then run this script again.');
      console.log('💡 Quick fixes:');
      console.log('   • Generate metrics: npm run metrics:full');
      console.log('   • Test pipeline: npm run metrics:test');
      console.log('   • Run tests: npm run test');
      console.log('   • Commit changes: git add -A && git commit -m "fix: address PR issues"');
      return false;
    }
  }

  validate() {
    console.log('🔍 Validating PR readiness...\n');

    // Core checks
    this.checkBranchStatus();
    this.checkGitStatus();
    this.checkMetricsFiles();
    this.checkCLAUDEMetricsTimestamp();
    this.checkTestsPassing();
    this.checkCommitHasMetrics();

    return this.generateReport();
  }
}

// Run validation
const validator = new PRReadinessValidator();
const isReady = validator.validate();
process.exit(isReady ? 0 : 1);