#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CLAUDEMetricsUpdater {
  constructor() {
    this.factsFile = './verified-facts.json';
    this.claudeFile = './CLAUDE.md';
  }

  loadFacts() {
    try {
      const factsContent = fs.readFileSync(this.factsFile, 'utf8');
      return JSON.parse(factsContent);
    } catch (error) {
      console.error('❌ Error loading verified facts:', error.message);
      console.log('💡 Run "node scripts/fact-check-report.js" first to generate facts');
      process.exit(1);
    }
  }

  loadCLAUDEFile() {
    try {
      return fs.readFileSync(this.claudeFile, 'utf8');
    } catch (error) {
      console.error('❌ Error loading CLAUDE.md:', error.message);
      process.exit(1);
    }
  }

  updateMetricsTable(content, facts) {
    const updates = [
      {
        pattern: /\| Source Files \| .* \|/,
        replacement: `| Source Files | ${facts.files.sourceFiles} | ↗️ |`
      },
      {
        pattern: /\| Source Code Lines \| .* \|/,
        replacement: `| Source Code Lines | ${facts.lines.sourceLines.toLocaleString()} | ↗️ |`
      },
      {
        pattern: /\| Test Code Lines \| .* \|/,
        replacement: `| Test Code Lines | ${facts.lines.testLines.toLocaleString()} | ↗️ |`
      },
      {
        pattern: /\| Total Test Cases \| .* \|/,
        replacement: `| Total Test Cases | ${facts.tests.totalTestCases} (${facts.tests.unitTestCases} unit + ${facts.tests.e2eTestCases} E2E) | ↗️ |`
      },
      {
        pattern: /\| Major Features \| .* \|/,
        replacement: `| Major Features | ${facts.features.length} | ↗️ |`
      },
      {
        pattern: /\| Security Features \| .* \|/,
        replacement: `| Security Features | ${facts.security.length} | ↗️ |`
      },
      {
        pattern: /\| Dependencies \| .* \|/,
        replacement: `| Dependencies | ${facts.dependencies.dependencies} production + ${facts.dependencies.devDependencies} dev | → |`
      },
      {
        pattern: /\| \*\*Deployment Frequency\*\* \| .* \|/,
        replacement: `| **Deployment Frequency** | ${facts.deployment.frequency.category} (${facts.deployment.frequency.totalDeployments} total) | → |`
      },
      {
        pattern: /\| \*\*Lead Time \(Acceptance→Deploy\)\*\* \| .* \|/,
        replacement: `| **Lead Time (Acceptance→Deploy)** | ${facts.deployment.leadTime.category}${facts.deployment.leadTime.averageDays ? ` (${facts.deployment.leadTime.averageDays}d avg)` : ''} | → |`
      },
      {
        pattern: /\| \*\*DORA Classification\*\* \| .* \|/,
        replacement: `| **DORA Classification** | ${facts.deployment.dora.classification}${facts.deployment.dora.score ? ` (${facts.deployment.dora.score}/4.0)` : ''} | → |`
      }
    ];

    let updatedContent = content;
    updates.forEach(update => {
      updatedContent = updatedContent.replace(update.pattern, update.replacement);
    });

    return updatedContent;
  }

  updateTimestamp(content) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    return content.replace(
      /\*Last updated: [^*]+\*/,
      `*Last updated: ${timestamp}*`
    );
  }

  updatePhaseProgress(content, facts) {
    // Calculate phase completion based on implemented features
    const featureMap = {
      'Authentication System': 'Phase 2',
      'Passkeys Support': 'Phase 2',
      'Multi-tenant Architecture': 'Phase 3',
      'Team Management': 'Phase 4',
      'Settings Management': 'Phase 4',
      'Onboarding Flow': 'Phase 4',
      'Dashboard': 'Phase 4',
      'Database Schema': 'Phase 1',
      'Row-Level Security': 'Phase 1'
    };

    const phaseFeatures = {
      'Phase 1': 0,
      'Phase 2': 0,
      'Phase 3': 0,
      'Phase 4': 0
    };

    facts.features.forEach(feature => {
      const phase = featureMap[feature];
      if (phase && phaseFeatures.hasOwnProperty(phase)) {
        phaseFeatures[phase]++;
      }
    });

    // Update phase progress indicators
    let updatedContent = content;
    
    // Phase 4 is special - we know it has 9 total features planned
    const phase4Total = 9;
    const phase4Complete = phaseFeatures['Phase 4'];
    const phase4Status = phase4Complete === phase4Total ? '✅' : '🚧';
    
    updatedContent = updatedContent.replace(
      /\*\*Phase 4: Core Features\*\* [✅🚧⏳] \(\d+\/\d+ complete\)/,
      `**Phase 4: Core Features** ${phase4Status} (${phase4Complete}/${phase4Total} complete)`
    );

    return updatedContent;
  }

  generateSummary(facts) {
    return `
📊 **Metrics Updated Successfully**

**Current Statistics:**
- 📁 ${facts.files.sourceFiles} source files
- 📝 ${facts.lines.sourceLines.toLocaleString()} lines of source code
- 🧪 ${facts.tests.totalTestCases} test cases (${facts.tests.unitTestCases} unit + ${facts.tests.e2eTestCases} E2E)
- ✨ ${facts.features.length} major features implemented
- 🔒 ${facts.security.length} security features
- 📦 ${facts.dependencies.dependencies} production dependencies
- 🚀 Deployment frequency: ${facts.deployment.frequency.category}
- ⏱️ Lead time: ${facts.deployment.leadTime.category}
- 🏆 DORA classification: ${facts.deployment.dora.classification}

**Recent Features:**
${facts.features.slice(-3).map(f => `  ✅ ${f}`).join('\n')}
`;
  }

  run() {
    console.log('📊 Updating CLAUDE.md metrics...\n');

    // Load data
    const facts = this.loadFacts();
    let content = this.loadCLAUDEFile();

    // Update metrics table
    content = this.updateMetricsTable(content, facts);
    
    // Update timestamp
    content = this.updateTimestamp(content);
    
    // Update phase progress
    content = this.updatePhaseProgress(content, facts);

    // Write updated content
    try {
      fs.writeFileSync(this.claudeFile, content);
      console.log('✅ CLAUDE.md updated successfully!');
      console.log(this.generateSummary(facts));
    } catch (error) {
      console.error('❌ Error writing CLAUDE.md:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new CLAUDEMetricsUpdater();
  updater.run();
}

module.exports = { CLAUDEMetricsUpdater };