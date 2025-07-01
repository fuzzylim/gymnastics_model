#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

class MetricsPipelineTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(type, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    if (type === 'error') {
      this.errors.push(logMessage);
      console.error(`❌ ${logMessage}`);
    } else if (type === 'warning') {
      this.warnings.push(logMessage);
      console.warn(`⚠️  ${logMessage}`);
    } else {
      this.success.push(logMessage);
      console.log(`✅ ${logMessage}`);
    }
  }

  testFileExists(filePath, description) {
    try {
      if (fs.existsSync(filePath)) {
        this.log('success', `${description}: ${filePath} exists`);
        return true;
      } else {
        this.log('error', `${description}: ${filePath} missing`);
        return false;
      }
    } catch (error) {
      this.log('error', `${description}: Error checking ${filePath} - ${error.message}`);
      return false;
    }
  }

  testJsonFile(filePath, description, requiredFields = []) {
    try {
      if (!this.testFileExists(filePath, description)) return false;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      this.log('success', `${description}: Valid JSON structure`);
      
      // Check required fields
      for (const field of requiredFields) {
        if (this.hasNestedProperty(data, field)) {
          this.log('success', `${description}: Has required field ${field}`);
        } else {
          this.log('error', `${description}: Missing required field ${field}`);
        }
      }
      
      return true;
    } catch (error) {
      this.log('error', `${description}: Invalid JSON - ${error.message}`);
      return false;
    }
  }

  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj) !== undefined;
  }

  testScriptExecution(script, description) {
    try {
      this.log('success', `Testing ${description}...`);
      execSync(script, { stdio: 'pipe' });
      this.log('success', `${description}: Executed successfully`);
      return true;
    } catch (error) {
      this.log('error', `${description}: Execution failed - ${error.message}`);
      return false;
    }
  }

  testNpmScript(scriptName, description) {
    return this.testScriptExecution(`npm run ${scriptName}`, description);
  }

  testMetricsIntegrity() {
    this.log('success', 'Testing metrics data integrity...');
    
    try {
      const factsData = JSON.parse(fs.readFileSync('./verified-facts.json', 'utf8'));
      const deployData = JSON.parse(fs.readFileSync('./deployment-metrics.json', 'utf8'));
      
      // Test data consistency
      if (factsData.deployment && deployData.dora) {
        if (factsData.deployment.dora.classification === deployData.dora.classification) {
          this.log('success', 'DORA classifications match between files');
        } else {
          this.log('warning', 'DORA classifications differ between files');
        }
      }
      
      // Test required metrics exist
      const requiredMetrics = [
        factsData.files?.sourceFiles,
        factsData.lines?.sourceLines,
        factsData.tests?.totalTestCases,
        factsData.features?.length,
        factsData.deployment?.dora?.classification
      ];
      
      if (requiredMetrics.every(metric => metric !== undefined && metric !== null)) {
        this.log('success', 'All required metrics present');
      } else {
        this.log('error', 'Some required metrics missing');
      }
      
    } catch (error) {
      this.log('error', `Metrics integrity test failed: ${error.message}`);
    }
  }

  runTests() {
    console.log('🧪 Testing Metrics Pipeline\n');
    console.log('============================\n');

    // Test script files exist
    this.testFileExists('./scripts/fact-check-report.js', 'Main fact checker script');
    this.testFileExists('./scripts/deployment-metrics.js', 'Deployment metrics script');
    this.testFileExists('./scripts/update-claude-metrics.js', 'CLAUDE.md updater script');
    
    // Test npm scripts work
    this.testNpmScript('metrics:generate', 'Metrics generation');
    this.testNpmScript('metrics:deployment', 'Deployment metrics');
    this.testNpmScript('metrics:update', 'CLAUDE.md update');
    
    // Test output files
    this.testJsonFile('./verified-facts.json', 'Main facts file', [
      'files.sourceFiles',
      'lines.sourceLines', 
      'tests.totalTestCases',
      'features',
      'deployment.dora.classification'
    ]);
    
    this.testJsonFile('./deployment-metrics.json', 'Deployment metrics file', [
      'deploymentFrequency.totalDeployments',
      'leadTime.averageLeadTimeHours',
      'changeFailureRate.changeFailureRate',
      'dora.classification'
    ]);
    
    // Test CLAUDE.md was updated
    this.testFileExists('./CLAUDE.md', 'CLAUDE.md documentation');
    
    // Test metrics integrity
    this.testMetricsIntegrity();
    
    // Test GitHub Actions workflow
    this.testFileExists('./.github/workflows/metrics-update.yml', 'GitHub Actions workflow');
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 PIPELINE TEST RESULTS');
    console.log('=========================\n');
    
    console.log(`✅ Successful tests: ${this.success.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}\n`);
    
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log('');
    }
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    }
    
    const totalTests = this.success.length + this.warnings.length + this.errors.length;
    const successRate = ((this.success.length / totalTests) * 100).toFixed(1);
    
    console.log(`📈 Success Rate: ${successRate}% (${this.success.length}/${totalTests})`);
    
    if (this.errors.length === 0) {
      console.log('\n🎉 All critical tests passed! Metrics pipeline is ready.');
      process.exit(0);
    } else {
      console.log('\n💥 Pipeline has critical issues. Please fix errors before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new MetricsPipelineTester();
tester.runTests();