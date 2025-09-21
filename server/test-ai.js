const AIService = require('./services/aiService');

// Test data for Loss Allowance Report
const testReportData = {
  opening_balance: {
    stages: {
      1: { amount: 1000000, account_count: 1000 },
      2: { amount: 500000, account_count: 200 },
      3: { amount: 200000, account_count: 50 }
    },
    total: { amount: 1700000, account_count: 1250 }
  },
  closing_balance: {
    stages: {
      1: { amount: 1200000, account_count: 1100 },
      2: { amount: 600000, account_count: 250 },
      3: { amount: 300000, account_count: 80 }
    },
    total: { amount: 2100000, account_count: 1430 }
  },
  new_assets: {
    stages: {
      1: { amount: 200000, account_count: 150 },
      2: { amount: 100000, account_count: 50 },
      3: { amount: 50000, account_count: 20 }
    },
    total: { amount: 350000, account_count: 220 }
  },
  derecognized_assets: {
    stages: {
      1: { amount: 50000, account_count: 50 },
      2: { amount: 30000, account_count: 20 },
      3: { amount: 20000, account_count: 10 }
    },
    total: { amount: 100000, account_count: 80 }
  },
  stage_transfer_losses: {
    transfers: [
      { from_stage: 1, to_stage: 2, amount: 150000, account_count: 30 },
      { from_stage: 2, to_stage: 3, amount: 80000, account_count: 15 }
    ]
  },
  stage_transfer_gains: {
    transfers: [
      { from_stage: 2, to_stage: 1, amount: 20000, account_count: 5 }
    ]
  },
  ecl_increases: {
    stages: {
      1: { amount: 100000, account_count: 100 },
      2: { amount: 150000, account_count: 50 },
      3: { amount: 100000, account_count: 30 }
    },
    total: { amount: 350000, account_count: 180 }
  },
  ecl_decreases: {
    stages: {
      1: { amount: 50000, account_count: 50 },
      2: { amount: 30000, account_count: 20 },
      3: { amount: 20000, account_count: 10 }
    },
    total: { amount: 100000, account_count: 80 }
  }
};

async function testAIService() {
  console.log('🤖 Testing AI Service...\n');
  
  try {
    const aiService = new AIService();
    
    console.log('📊 Analyzing Loss Allowance Report...');
    const analysis = await aiService.analyzeLossAllowanceReport(testReportData);
    
    console.log('✅ AI Analysis completed successfully!\n');
    console.log('📋 Analysis Summary:');
    console.log('==================');
    
    if (analysis.insights) {
      Object.entries(analysis.insights).forEach(([section, content]) => {
        console.log(`\n${section.toUpperCase()}:`);
        console.log('-'.repeat(section.length + 1));
        console.log(content.substring(0, 200) + '...');
      });
    }
    
    if (analysis.keyMetrics) {
      console.log('\n📈 Key Metrics:');
      console.log(`Net ECL Change: ${analysis.keyMetrics.netECLChange.percentage.toFixed(1)}%`);
      console.log(`Direction: ${analysis.keyMetrics.netECLChange.direction}`);
    }
    
    if (analysis.riskAlerts && analysis.riskAlerts.length > 0) {
      console.log('\n⚠️  Risk Alerts:');
      analysis.riskAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ AI Service Test Failed:', error.message);
    console.log('\n💡 Make sure to set your OpenAI API key in the environment variables:');
    console.log('   export OPEN_AI_KEY="your-api-key-here"');
  }
}

// Run the test
testAIService();
