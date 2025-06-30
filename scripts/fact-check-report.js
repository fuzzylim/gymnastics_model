#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DeploymentMetricsCollector } = require('./deployment-metrics');

class FactChecker {
  constructor() {
    this.facts = {};
  }

  async collectFacts() {
    console.log('🔍 Collecting verified facts from codebase...\n');

    // File and line counts
    this.facts.files = this.getFileStats();
    this.facts.lines = this.getLineStats();
    this.facts.tests = this.getTestStats();
    this.facts.dependencies = this.getDependencyStats();
    this.facts.technologies = this.getTechnologies();
    this.facts.features = this.getImplementedFeatures();
    this.facts.security = this.getSecurityFeatures();
    this.facts.deployment = this.getDeploymentMetrics();
    
    return this.facts;
  }

  getFileStats() {
    try {
      // Count different file types
      const sourceFiles = execSync(`find app lib -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v spec | wc -l`).toString().trim();
      const testFiles = execSync(`find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | wc -l`).toString().trim();
      const e2eFiles = execSync(`find e2e -name "*.spec.ts" | wc -l`).toString().trim();
      
      return {
        sourceFiles: parseInt(sourceFiles),
        testFiles: parseInt(testFiles),
        e2eFiles: parseInt(e2eFiles)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getLineStats() {
    try {
      // Count lines in source files
      const sourceLines = execSync(`find app lib -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v spec | xargs wc -l | tail -1 | awk '{print $1}'`).toString().trim();
      const testLines = execSync(`find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | xargs wc -l | tail -1 | awk '{print $1}'`).toString().trim();
      
      return {
        sourceLines: parseInt(sourceLines) || 0,
        testLines: parseInt(testLines) || 0
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getTestStats() {
    try {
      // Count actual test cases
      const e2eTests = execSync(`find e2e -name "*.spec.ts" -exec grep -c "test(" {} \\; | awk '{sum+=$1} END {print sum}'`).toString().trim();
      const unitTests = execSync(`find . -name "*.test.*" | grep -v node_modules | xargs grep -c "test\\|it(" | awk -F: '{sum+=$2} END {print sum}'`).toString().trim();
      
      return {
        e2eTestCases: parseInt(e2eTests) || 0,
        unitTestCases: parseInt(unitTests) || 0,
        totalTestCases: (parseInt(e2eTests) || 0) + (parseInt(unitTests) || 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getDependencyStats() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      return {
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        scripts: Object.keys(packageJson.scripts || {}).length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getTechnologies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const technologies = {
        frontend: [],
        backend: [],
        database: [],
        testing: [],
        build: []
      };

      // Categorize technologies
      Object.keys(deps).forEach(dep => {
        if (['next', 'react', 'react-dom'].includes(dep)) {
          technologies.frontend.push(dep);
        } else if (['@auth/drizzle-adapter', 'next-auth'].includes(dep)) {
          technologies.backend.push(dep);
        } else if (['drizzle-orm', 'postgres'].includes(dep)) {
          technologies.database.push(dep);
        } else if (['@playwright/test', 'vitest', '@testing-library/react'].includes(dep)) {
          technologies.testing.push(dep);
        } else if (['typescript', 'tailwindcss', 'eslint'].includes(dep)) {
          technologies.build.push(dep);
        }
      });

      return technologies;
    } catch (error) {
      return { error: error.message };
    }
  }

  getImplementedFeatures() {
    const features = [];
    
    // Check for implemented features by file existence
    const featureChecks = [
      { name: 'Authentication System', files: ['lib/auth/config.ts', 'app/(auth)/login/page.tsx'] },
      { name: 'Passkeys Support', files: ['lib/auth/passkeys.ts'] },
      { name: 'Multi-tenant Architecture', files: ['middleware.ts', 'lib/db/tenant-context.ts'] },
      { name: 'Team Management', files: ['app/dashboard/team/page.tsx', 'app/api/team/members/route.ts'] },
      { name: 'Settings Management', files: ['app/dashboard/settings/page.tsx', 'app/api/settings/route.ts'] },
      { name: 'Onboarding Flow', files: ['app/onboarding/page.tsx'] },
      { name: 'Dashboard', files: ['app/dashboard/page.tsx'] },
      { name: 'Database Schema', files: ['lib/db/schema.ts'] },
      { name: 'Row-Level Security', files: ['scripts/setup-rls.sql'] }
    ];

    featureChecks.forEach(check => {
      const allFilesExist = check.files.every(file => fs.existsSync(file));
      if (allFilesExist) {
        features.push(check.name);
      }
    });

    return features;
  }

  getSecurityFeatures() {
    const securityFeatures = [];
    
    try {
      // Check for security implementations
      const schemaContent = fs.readFileSync('lib/db/schema.ts', 'utf8');
      if (schemaContent.includes('RLS') || fs.existsSync('scripts/setup-rls.sql')) {
        securityFeatures.push('Row-Level Security (RLS)');
      }

      const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
      if (middlewareContent.includes('auth')) {
        securityFeatures.push('Authentication Middleware');
      }

      // Check for input validation
      const apiFiles = execSync('find app/api -name "*.ts" | head -5').toString().split('\n');
      let hasValidation = false;
      apiFiles.forEach(file => {
        if (file && fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('zod') || content.includes('validation')) {
            hasValidation = true;
          }
        }
      });
      if (hasValidation) {
        securityFeatures.push('Input Validation');
      }

      // Check for RBAC
      if (fs.existsSync('lib/db/schema.ts')) {
        const content = fs.readFileSync('lib/db/schema.ts', 'utf8');
        if (content.includes('role')) {
          securityFeatures.push('Role-Based Access Control');
        }
      }

    } catch (error) {
      console.warn('Error checking security features:', error.message);
    }

    return securityFeatures;
  }

  getDeploymentMetrics() {
    try {
      console.log('\n🚀 Collecting deployment metrics...');
      const deploymentCollector = new DeploymentMetricsCollector();
      const deploymentMetrics = deploymentCollector.run();
      
      return {
        frequency: {
          category: deploymentMetrics.deploymentFrequency.frequency,
          totalDeployments: deploymentMetrics.deploymentFrequency.totalDeployments,
          averageDaysBetween: deploymentMetrics.deploymentFrequency.averageDaysBetween,
          deploymentsPerWeek: deploymentMetrics.deploymentFrequency.deploymentsPerWeek
        },
        leadTime: {
          category: deploymentMetrics.leadTime.leadTimeCategory,
          averageHours: deploymentMetrics.leadTime.averageLeadTimeHours,
          averageDays: deploymentMetrics.leadTime.averageLeadTimeDays,
          samples: deploymentMetrics.leadTime.samples
        },
        changeFailureRate: {
          category: deploymentMetrics.changeFailureRate.category,
          rate: deploymentMetrics.changeFailureRate.changeFailureRate,
          fixCommits: deploymentMetrics.changeFailureRate.fixCommits,
          totalCommits: deploymentMetrics.changeFailureRate.totalCommits
        },
        dora: {
          classification: deploymentMetrics.dora.classification,
          score: deploymentMetrics.dora.averageScore
        }
      };
    } catch (error) {
      console.warn('⚠️  Could not collect deployment metrics:', error.message);
      return {
        frequency: { category: 'Unable to determine', totalDeployments: 0 },
        leadTime: { category: 'Unable to determine', averageHours: null },
        changeFailureRate: { category: 'Unable to determine', rate: null },
        dora: { classification: 'Unknown', score: null }
      };
    }
  }

  generateReport() {
    console.log('📋 VERIFIED FACTS REPORT');
    console.log('==========================\n');

    console.log('📁 FILE STATISTICS');
    console.log(`Source Files: ${this.facts.files.sourceFiles}`);
    console.log(`Test Files: ${this.facts.files.testFiles}`);
    console.log(`E2E Test Files: ${this.facts.files.e2eFiles}\n`);

    console.log('📝 CODE STATISTICS');
    console.log(`Source Code Lines: ${this.facts.lines.sourceLines}`);
    console.log(`Test Code Lines: ${this.facts.lines.testLines}\n`);

    console.log('🧪 TEST STATISTICS');
    console.log(`Unit Test Cases: ${this.facts.tests.unitTestCases}`);
    console.log(`E2E Test Cases: ${this.facts.tests.e2eTestCases}`);
    console.log(`Total Test Cases: ${this.facts.tests.totalTestCases}\n`);

    console.log('📦 DEPENDENCIES');
    console.log(`Production Dependencies: ${this.facts.dependencies.dependencies}`);
    console.log(`Development Dependencies: ${this.facts.dependencies.devDependencies}`);
    console.log(`NPM Scripts: ${this.facts.dependencies.scripts}\n`);

    console.log('🛠️ TECHNOLOGIES');
    Object.entries(this.facts.technologies).forEach(([category, techs]) => {
      if (techs.length > 0) {
        console.log(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${techs.join(', ')}`);
      }
    });

    console.log('\n✨ IMPLEMENTED FEATURES');
    this.facts.features.forEach(feature => {
      console.log(`✅ ${feature}`);
    });

    console.log('\n🔒 SECURITY FEATURES');
    this.facts.security.forEach(feature => {
      console.log(`🔒 ${feature}`);
    });

    console.log('\n🚀 DEPLOYMENT METRICS');
    console.log(`Deployment Frequency: ${this.facts.deployment.frequency.category} (${this.facts.deployment.frequency.totalDeployments} total)`);
    if (this.facts.deployment.frequency.averageDaysBetween) {
      console.log(`Average Days Between Deployments: ${this.facts.deployment.frequency.averageDaysBetween}`);
    }
    console.log(`Lead Time (Acceptance to Deployment): ${this.facts.deployment.leadTime.category}`);
    if (this.facts.deployment.leadTime.averageHours) {
      console.log(`Average Lead Time: ${this.facts.deployment.leadTime.averageHours} hours (${this.facts.deployment.leadTime.averageDays} days)`);
    }
    console.log(`Change Failure Rate: ${this.facts.deployment.changeFailureRate.category}`);
    if (this.facts.deployment.changeFailureRate.rate !== null) {
      console.log(`Failure Rate: ${this.facts.deployment.changeFailureRate.rate}%`);
    }
    console.log(`DORA Classification: ${this.facts.deployment.dora.classification}`);
    if (this.facts.deployment.dora.score !== null) {
      console.log(`DORA Score: ${this.facts.deployment.dora.score}/4.0`);
    }

    console.log('\n📊 SUMMARY FOR ACADEMIC PAPER');
    console.log('=====================================');
    console.log(`Total Source Files: ${this.facts.files.sourceFiles}`);
    console.log(`Total Lines of Source Code: ${this.facts.lines.sourceLines}`);
    console.log(`Total Lines of Test Code: ${this.facts.lines.testLines}`);
    console.log(`Total Test Cases: ${this.facts.tests.totalTestCases} (${this.facts.tests.unitTestCases} unit + ${this.facts.tests.e2eTestCases} E2E)`);
    console.log(`Major Features Implemented: ${this.facts.features.length}`);
    console.log(`Security Features: ${this.facts.security.length}`);
    console.log(`Production Dependencies: ${this.facts.dependencies.dependencies}`);
    console.log(`Development Tools: ${this.facts.dependencies.devDependencies}`);
    console.log(`Deployment Frequency: ${this.facts.deployment.frequency.category}`);
    console.log(`Lead Time Category: ${this.facts.deployment.leadTime.category}`);
    console.log(`DORA Maturity: ${this.facts.deployment.dora.classification}`);
  }

  async run() {
    await this.collectFacts();
    this.generateReport();
    return this.facts;
  }
}

// Run the fact checker
const checker = new FactChecker();
checker.run().then(facts => {
  // Export data for further analysis
  fs.writeFileSync('./verified-facts.json', JSON.stringify(facts, null, 2));
  console.log('\n💾 Facts saved to verified-facts.json');
}).catch(console.error);