#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

class DeploymentMetricsCollector {
  constructor() {
    this.metricsFile = './deployment-metrics.json';
    this.deploymentMarkers = [
      'deploy', 'deployment', 'release', 'production', 'prod',
      'ship', 'live', 'publish', 'merge.*main', 'merge.*master'
    ];
  }

  getGitHistory() {
    try {
      // Get all commits with timestamps and messages
      const gitLog = execSync(`git log --pretty=format:"%H|%ai|%s|%an" --all`).toString();
      return gitLog.split('\n').map(line => {
        const [hash, date, message, author] = line.split('|');
        return {
          hash,
          date: new Date(date),
          message: message || '',
          author: author || '',
          timestamp: Date.parse(date)
        };
      }).filter(commit => commit.hash); // Filter out empty lines
    } catch (error) {
      console.warn('Warning: Could not get git history:', error.message);
      return [];
    }
  }

  getPullRequests() {
    try {
      // Try to get PR merge commits (GitHub pattern)
      const prMerges = execSync(`git log --grep="Merge pull request" --pretty=format:"%H|%ai|%s|%an"`).toString();
      return prMerges.split('\n').map(line => {
        if (!line) return null;
        const [hash, date, message, author] = line.split('|');
        const prMatch = message.match(/#(\d+)/);
        return {
          hash,
          date: new Date(date),
          message,
          author,
          prNumber: prMatch ? parseInt(prMatch[1]) : null,
          timestamp: Date.parse(date)
        };
      }).filter(Boolean);
    } catch (error) {
      console.warn('Warning: Could not get PR history:', error.message);
      return [];
    }
  }

  identifyDeployments(commits) {
    const deployments = [];
    const deploymentRegex = new RegExp(this.deploymentMarkers.join('|'), 'i');
    
    commits.forEach(commit => {
      if (deploymentRegex.test(commit.message)) {
        deployments.push({
          ...commit,
          type: 'deployment',
          deploymentReason: this.getDeploymentReason(commit.message)
        });
      }
    });

    // Add merge to main/master as potential deployments
    const mainMerges = commits.filter(commit => 
      commit.message.match(/merge.*into.*(main|master)/i) ||
      commit.message.match(/merge.*pull request.*into.*(main|master)/i)
    );

    mainMerges.forEach(commit => {
      deployments.push({
        ...commit,
        type: 'main_merge',
        deploymentReason: 'Merge to main branch'
      });
    });

    return deployments.sort((a, b) => b.timestamp - a.timestamp);
  }

  getDeploymentReason(message) {
    if (message.match(/prod|production/i)) return 'Production deployment';
    if (message.match(/release/i)) return 'Release deployment';
    if (message.match(/hotfix|fix/i)) return 'Hotfix deployment';
    if (message.match(/feature|feat/i)) return 'Feature deployment';
    return 'Standard deployment';
  }

  calculateDeploymentFrequency(deployments) {
    if (deployments.length < 2) {
      return {
        totalDeployments: deployments.length,
        frequency: 'Insufficient data',
        averageDaysBetween: null,
        deploymentRate: 'N/A'
      };
    }

    const sortedDeployments = deployments.sort((a, b) => a.timestamp - b.timestamp);
    const intervals = [];
    
    for (let i = 1; i < sortedDeployments.length; i++) {
      const timeDiff = sortedDeployments[i].timestamp - sortedDeployments[i-1].timestamp;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    const averageDays = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
    
    // Calculate deployment rate per week/month
    const oldestDeployment = sortedDeployments[0];
    const newestDeployment = sortedDeployments[sortedDeployments.length - 1];
    const totalDays = (newestDeployment.timestamp - oldestDeployment.timestamp) / (1000 * 60 * 60 * 24);
    const deploymentsPerWeek = (deployments.length / totalDays) * 7;
    const deploymentsPerMonth = (deployments.length / totalDays) * 30;

    return {
      totalDeployments: deployments.length,
      averageDaysBetween: Math.round(averageDays * 100) / 100,
      deploymentsPerWeek: Math.round(deploymentsPerWeek * 100) / 100,
      deploymentsPerMonth: Math.round(deploymentsPerMonth * 100) / 100,
      frequency: this.categorizeFrequency(averageDays),
      timeSpanDays: Math.round(totalDays)
    };
  }

  categorizeFrequency(averageDays) {
    if (averageDays <= 1) return 'Multiple per day';
    if (averageDays <= 7) return 'Weekly';
    if (averageDays <= 14) return 'Bi-weekly';
    if (averageDays <= 30) return 'Monthly';
    if (averageDays <= 90) return 'Quarterly';
    return 'Infrequent';
  }

  calculateLeadTime(commits, prs) {
    const leadTimes = [];
    
    // For each PR, calculate time from creation to merge
    prs.forEach(pr => {
      // Find the first commit in this PR (approximate)
      const prCommits = commits.filter(commit => 
        commit.message.includes(`#${pr.prNumber}`) ||
        (Math.abs(commit.timestamp - pr.timestamp) < 86400000) // Within 24 hours
      );
      
      if (prCommits.length > 0) {
        const earliestCommit = prCommits.reduce((earliest, commit) => 
          commit.timestamp < earliest.timestamp ? commit : earliest
        );
        
        const leadTimeMs = pr.timestamp - earliestCommit.timestamp;
        const leadTimeHours = leadTimeMs / (1000 * 60 * 60);
        const leadTimeDays = leadTimeMs / (1000 * 60 * 60 * 24);
        
        leadTimes.push({
          prNumber: pr.prNumber,
          leadTimeHours: Math.round(leadTimeHours * 100) / 100,
          leadTimeDays: Math.round(leadTimeDays * 100) / 100,
          startDate: earliestCommit.date,
          endDate: pr.date
        });
      }
    });

    if (leadTimes.length === 0) {
      return {
        averageLeadTimeHours: null,
        averageLeadTimeDays: null,
        medianLeadTimeHours: null,
        leadTimeCategory: 'No data available',
        samples: 0
      };
    }

    const avgHours = leadTimes.reduce((sum, lt) => sum + lt.leadTimeHours, 0) / leadTimes.length;
    const avgDays = leadTimes.reduce((sum, lt) => sum + lt.leadTimeDays, 0) / leadTimes.length;
    
    const sortedHours = leadTimes.map(lt => lt.leadTimeHours).sort((a, b) => a - b);
    const medianHours = sortedHours[Math.floor(sortedHours.length / 2)];

    return {
      averageLeadTimeHours: Math.round(avgHours * 100) / 100,
      averageLeadTimeDays: Math.round(avgDays * 100) / 100,
      medianLeadTimeHours: Math.round(medianHours * 100) / 100,
      leadTimeCategory: this.categorizeLeadTime(avgHours),
      samples: leadTimes.length,
      details: leadTimes.slice(0, 5) // Recent samples
    };
  }

  categorizeLeadTime(averageHours) {
    if (averageHours < 1) return 'Elite (< 1 hour)';
    if (averageHours < 24) return 'High (< 1 day)';
    if (averageHours < 168) return 'Medium (< 1 week)';
    if (averageHours < 720) return 'Low (< 1 month)';
    return 'Very Low (> 1 month)';
  }

  getChangeFailureRate(commits) {
    const fixes = commits.filter(commit => 
      commit.message.match(/fix|bug|hotfix|patch|revert/i)
    );
    
    const totalChanges = commits.length;
    const failureRate = totalChanges > 0 ? (fixes.length / totalChanges) * 100 : 0;
    
    return {
      totalCommits: totalChanges,
      fixCommits: fixes.length,
      changeFailureRate: Math.round(failureRate * 100) / 100,
      category: this.categorizeFailureRate(failureRate)
    };
  }

  categorizeFailureRate(rate) {
    if (rate < 5) return 'Elite (< 5%)';
    if (rate < 15) return 'High (< 15%)';
    if (rate < 30) return 'Medium (< 30%)';
    return 'Low (≥ 30%)';
  }

  generateReport() {
    console.log('🚀 Collecting deployment metrics...\n');
    
    const commits = this.getGitHistory();
    const prs = this.getPullRequests();
    const deployments = this.identifyDeployments(commits);
    
    const deploymentFreq = this.calculateDeploymentFrequency(deployments);
    const leadTime = this.calculateLeadTime(commits, prs);
    const changeFailure = this.getChangeFailureRate(commits);
    
    const metrics = {
      collectedAt: new Date().toISOString(),
      repository: {
        totalCommits: commits.length,
        totalPRs: prs.length,
        analysisFromDate: commits.length > 0 ? commits[commits.length - 1].date : null,
        analysisToDate: commits.length > 0 ? commits[0].date : null
      },
      deploymentFrequency: deploymentFreq,
      leadTime: leadTime,
      changeFailureRate: changeFailure,
      deployments: deployments.slice(0, 10), // Recent deployments
      dora: this.calculateDORAClassification(deploymentFreq, leadTime, changeFailure)
    };

    this.displayReport(metrics);
    
    // Save to file
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    console.log(`\n💾 Deployment metrics saved to ${this.metricsFile}`);
    
    return metrics;
  }

  calculateDORAClassification(deployFreq, leadTime, changeFailure) {
    // DORA metrics classification
    const scores = {
      deploymentFrequency: 0,
      leadTime: 0,
      changeFailureRate: 0
    };

    // Deployment Frequency scoring
    if (deployFreq.averageDaysBetween <= 1) scores.deploymentFrequency = 4; // Elite
    else if (deployFreq.averageDaysBetween <= 7) scores.deploymentFrequency = 3; // High
    else if (deployFreq.averageDaysBetween <= 30) scores.deploymentFrequency = 2; // Medium
    else scores.deploymentFrequency = 1; // Low

    // Lead Time scoring
    if (leadTime.averageLeadTimeHours && leadTime.averageLeadTimeHours < 1) scores.leadTime = 4;
    else if (leadTime.averageLeadTimeHours && leadTime.averageLeadTimeHours < 24) scores.leadTime = 3;
    else if (leadTime.averageLeadTimeHours && leadTime.averageLeadTimeHours < 168) scores.leadTime = 2;
    else scores.leadTime = 1;

    // Change Failure Rate scoring
    if (changeFailure.changeFailureRate < 5) scores.changeFailureRate = 4;
    else if (changeFailure.changeFailureRate < 15) scores.changeFailureRate = 3;
    else if (changeFailure.changeFailureRate < 30) scores.changeFailureRate = 2;
    else scores.changeFailureRate = 1;

    const averageScore = (scores.deploymentFrequency + scores.leadTime + scores.changeFailureRate) / 3;
    
    let classification;
    if (averageScore >= 3.5) classification = 'Elite';
    else if (averageScore >= 2.5) classification = 'High';
    else if (averageScore >= 1.5) classification = 'Medium';
    else classification = 'Low';

    return {
      classification,
      scores,
      averageScore: Math.round(averageScore * 100) / 100
    };
  }

  displayReport(metrics) {
    console.log('📊 DEPLOYMENT METRICS REPORT');
    console.log('=============================\n');

    console.log('📅 DEPLOYMENT FREQUENCY');
    console.log(`Total Deployments: ${metrics.deploymentFrequency.totalDeployments}`);
    console.log(`Frequency Category: ${metrics.deploymentFrequency.frequency}`);
    if (metrics.deploymentFrequency.averageDaysBetween) {
      console.log(`Average Days Between: ${metrics.deploymentFrequency.averageDaysBetween}`);
      console.log(`Deployments per Week: ${metrics.deploymentFrequency.deploymentsPerWeek}`);
      console.log(`Deployments per Month: ${metrics.deploymentFrequency.deploymentsPerMonth}`);
    }
    console.log('');

    console.log('⏱️ LEAD TIME (Acceptance to Deployment)');
    console.log(`Category: ${metrics.leadTime.leadTimeCategory}`);
    if (metrics.leadTime.averageLeadTimeHours) {
      console.log(`Average Lead Time: ${metrics.leadTime.averageLeadTimeHours} hours (${metrics.leadTime.averageLeadTimeDays} days)`);
      console.log(`Median Lead Time: ${metrics.leadTime.medianLeadTimeHours} hours`);
      console.log(`Sample Size: ${metrics.leadTime.samples} PRs`);
    } else {
      console.log('No PR data available for lead time calculation');
    }
    console.log('');

    console.log('🔧 CHANGE FAILURE RATE');
    console.log(`Category: ${metrics.changeFailureRate.category}`);
    console.log(`Failure Rate: ${metrics.changeFailureRate.changeFailureRate}%`);
    console.log(`Fix Commits: ${metrics.changeFailureRate.fixCommits} / ${metrics.changeFailureRate.totalCommits}`);
    console.log('');

    console.log('🏆 DORA METRICS CLASSIFICATION');
    console.log(`Overall Classification: ${metrics.dora.classification}`);
    console.log(`Score: ${metrics.dora.averageScore}/4.0`);
    console.log(`  - Deployment Frequency: ${metrics.dora.scores.deploymentFrequency}/4`);
    console.log(`  - Lead Time: ${metrics.dora.scores.leadTime}/4`);
    console.log(`  - Change Failure Rate: ${metrics.dora.scores.changeFailureRate}/4`);
    console.log('');

    if (metrics.deployments.length > 0) {
      console.log('🚀 RECENT DEPLOYMENTS');
      metrics.deployments.slice(0, 5).forEach((deployment, index) => {
        console.log(`${index + 1}. ${deployment.date.toISOString().split('T')[0]} - ${deployment.deploymentReason}`);
        console.log(`   ${deployment.message.substring(0, 80)}...`);
      });
    }
  }

  run() {
    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const collector = new DeploymentMetricsCollector();
  collector.run();
}

module.exports = { DeploymentMetricsCollector };