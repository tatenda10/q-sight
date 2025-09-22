const OpenAI = require('openai');
const aiConfig = require('../config/aiConfig');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPEN_AI_KEY || aiConfig.openai.apiKey
    });
    this.config = aiConfig;
  }

  /**
   * Analyze Loss Allowance Report data and provide intelligent insights
   * @param {Object} reportData - The Loss Allowance Report data
   * @returns {Object} AI analysis with explanations and conclusions
   */
  async analyzeLossAllowanceReport(reportData) {
    try {
      const prompt = this.buildLossAllowancePrompt(reportData);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert banking risk analyst specializing in IFRS 9 Expected Credit Loss (ECL) calculations and Loss Allowance reporting. 
            
            Your expertise includes:
            - IFRS 9 staging criteria and ECL calculations
            - Banking risk management and credit analysis
            - Regulatory compliance and reporting requirements
            - Portfolio risk assessment and trend analysis
            - Stage migration patterns and credit quality indicators
            
            IMPORTANT: Write in clear, professional English. Use concise sentences and specific data points. 
            DO NOT use any markdown formatting like **, ##, or any asterisks. Use plain text only.
            Section headers should be in ALL CAPS without any special characters.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature,
        max_tokens: this.config.openai.maxTokens
      });

      const aiResponse = response.choices[0].message.content;
      return this.parseAIResponse(aiResponse, reportData);
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async analyzeECLAnalysisReport(reportData) {
    try {
      const prompt = this.buildECLAnalysisPrompt(reportData);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert banking risk analyst specializing in ECL (Expected Credit Loss) analysis and portfolio risk assessment. 
            
            You have deep expertise in:
            - ECL calculations and IFRS 9 compliance
            - Portfolio risk analysis and credit quality assessment
            - Currency risk and exposure analysis
            - Stage distribution and delinquency patterns
            - Top exposure identification and concentration risk
            - Banking risk management and regulatory reporting
            
            Your role is to analyze ECL Analysis Reports and provide professional, actionable insights for banking professionals.
            
            IMPORTANT: Write in clear, professional English. Use concise sentences and specific data points. 
            DO NOT use any markdown formatting like **, ##, or any asterisks. Use plain text only.
            Section headers should be in ALL CAPS without any special characters.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature,
        max_tokens: this.config.openai.maxTokens
      });

      const aiResponse = response.choices[0].message.content;
      return this.parseECLAnalysisResponse(aiResponse, reportData);
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze IFRS 7.35G Term Structure Report with AI
   */
  async analyzeIFRS735GReport(reportData) {
    try {
      const prompt = this.buildIFRS735GPrompt(reportData);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert banking risk analyst specializing in IFRS 7.35G term structure reporting and credit risk assessment. 
            
            You have deep expertise in:
            - IFRS 7.35G disclosure requirements and regulatory compliance
            - Term structure analysis and delinquency band assessment
            - Credit risk segmentation and portfolio analysis
            - PD and LGD analysis across different risk bands
            - ECL calculations and provisioning requirements
            - Banking risk management and regulatory reporting
            
            Your role is to analyze IFRS 7.35G Term Structure Reports and provide professional, actionable insights for banking professionals.
            
            IMPORTANT: Write in clear, professional English. Use concise sentences and specific data points. 
            DO NOT use any markdown formatting like **, ##, or any asterisks. Use plain text only.
            Section headers should be in ALL CAPS without any special characters.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.config.openai.temperature,
        max_tokens: this.config.openai.maxTokens
      });

      const aiResponse = response.choices[0].message.content;
      return this.parseIFRS735GResponse(aiResponse, reportData);
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for Loss Allowance Report analysis
   */
  buildLossAllowancePrompt(reportData) {
    const {
      opening_balance,
      closing_balance,
      new_assets,
      derecognized_assets,
      stage_transfer_losses,
      stage_transfer_gains,
      ecl_increases,
      ecl_decreases
    } = reportData;

    return `
Analyze this IFRS 7 Loss Allowance Report data and provide comprehensive insights:

## REPORT DATA:

### Opening ECL Balance by Stage:
- Stage 1: ${this.formatAmount(opening_balance?.stages?.[1]?.amount || 0)} (${opening_balance?.stages?.[1]?.account_count || 0} accounts)
- Stage 2: ${this.formatAmount(opening_balance?.stages?.[2]?.amount || 0)} (${opening_balance?.stages?.[2]?.account_count || 0} accounts)
- Stage 3: ${this.formatAmount(opening_balance?.stages?.[3]?.amount || 0)} (${opening_balance?.stages?.[3]?.account_count || 0} accounts)
- Total Opening: ${this.formatAmount(opening_balance?.total?.amount || 0)}

### Closing ECL Balance by Stage:
- Stage 1: ${this.formatAmount(closing_balance?.stages?.[1]?.amount || 0)} (${closing_balance?.stages?.[1]?.account_count || 0} accounts)
- Stage 2: ${this.formatAmount(closing_balance?.stages?.[2]?.amount || 0)} (${closing_balance?.stages?.[2]?.account_count || 0} accounts)
- Stage 3: ${this.formatAmount(closing_balance?.stages?.[3]?.amount || 0)} (${closing_balance?.stages?.[3]?.account_count || 0} accounts)
- Total Closing: ${this.formatAmount(closing_balance?.total?.amount || 0)}

### New Financial Assets:
- Stage 1: ${this.formatAmount(new_assets?.stages?.[1]?.amount || 0)} (${new_assets?.stages?.[1]?.account_count || 0} accounts)
- Stage 2: ${this.formatAmount(new_assets?.stages?.[2]?.amount || 0)} (${new_assets?.stages?.[2]?.account_count || 0} accounts)
- Stage 3: ${this.formatAmount(new_assets?.stages?.[3]?.amount || 0)} (${new_assets?.stages?.[3]?.account_count || 0} accounts)

### Stage Transfers (Losses):
${stage_transfer_losses?.transfers?.map(transfer => 
  `- Stage ${transfer.from_stage} to Stage ${transfer.to_stage}: ${this.formatAmount(transfer.amount)} (${transfer.account_count} accounts)`
).join('\n') || 'No stage transfer losses'}

### Stage Transfers (Gains):
${stage_transfer_gains?.transfers?.map(transfer => 
  `- Stage ${transfer.from_stage} to Stage ${transfer.to_stage}: ${this.formatAmount(transfer.amount)} (${transfer.account_count} accounts)`
).join('\n') || 'No stage transfer gains'}

### ECL Increases by Stage:
- Stage 1: ${this.formatAmount(ecl_increases?.stages?.[1]?.amount || 0)}
- Stage 2: ${this.formatAmount(ecl_increases?.stages?.[2]?.amount || 0)}
- Stage 3: ${this.formatAmount(ecl_increases?.stages?.[3]?.amount || 0)}

### ECL Decreases by Stage:
- Stage 1: ${this.formatAmount(ecl_decreases?.stages?.[1]?.amount || 0)}
- Stage 2: ${this.formatAmount(ecl_decreases?.stages?.[2]?.amount || 0)}
- Stage 3: ${this.formatAmount(ecl_decreases?.stages?.[3]?.amount || 0)}

## ANALYSIS REQUIRED:

Please provide a comprehensive analysis covering:

1. EXECUTIVE SUMMARY: Key findings and overall portfolio health assessment

2. STAGE ANALYSIS: 
   - Stage distribution changes and implications
   - Stage migration patterns (improvement vs deterioration)
   - Risk concentration analysis

3. ECL MOVEMENT ANALYSIS:
   - Net ECL change drivers
   - Stage-specific ECL trends
   - New asset quality assessment

4. RISK INDICATORS:
   - Early warning signals
   - Credit quality trends
   - Portfolio risk profile changes

5. REGULATORY COMPLIANCE:
   - IFRS 9 staging criteria adherence
   - ECL calculation appropriateness
   - Reporting completeness

6. RECOMMENDATIONS:
   - Immediate actions required
   - Risk management improvements
   - Monitoring enhancements

7. CONCLUSIONS:
   - Overall risk assessment
   - Future outlook
   - Key concerns and opportunities

Provide a clear, professional analysis in this format:

EXECUTIVE SUMMARY
[Key findings and portfolio health overview]

STAGE ANALYSIS
[Stage distribution changes and migration patterns]

ECL MOVEMENT ANALYSIS
[ECL change drivers and trends]

RISK INDICATORS
[Early warning signals and risk trends]

REGULATORY COMPLIANCE
[IFRS 9 adherence and reporting quality]

RECOMMENDATIONS
[Specific, actionable risk management advice]

CONCLUSIONS
[Overall risk assessment and outlook]

Use concise, professional language. Write in clear English with proper grammar. Do not use markdown formatting like ** or ##. Use plain text only.
    `;
  }

  /**
   * Parse AI response and structure it for frontend consumption
   */
  parseAIResponse(aiResponse, reportData) {
    try {
      // Clean and format the AI response
      const cleanedResponse = this.cleanAIResponse(aiResponse);
      
      // Extract structured data from AI response
      const analysis = {
        timestamp: new Date().toISOString(),
        reportData: this.summarizeReportData(reportData),
        insights: {
          executiveSummary: this.extractSection(cleanedResponse, 'EXECUTIVE SUMMARY'),
          stageAnalysis: this.extractSection(cleanedResponse, 'STAGE ANALYSIS'),
          eclMovementAnalysis: this.extractSection(cleanedResponse, 'ECL MOVEMENT ANALYSIS'),
          riskIndicators: this.extractSection(cleanedResponse, 'RISK INDICATORS'),
          regulatoryCompliance: this.extractSection(cleanedResponse, 'REGULATORY COMPLIANCE'),
          recommendations: this.extractSection(cleanedResponse, 'RECOMMENDATIONS'),
          conclusions: this.extractSection(cleanedResponse, 'CONCLUSIONS')
        },
        keyMetrics: this.calculateKeyMetrics(reportData),
        riskAlerts: this.generateRiskAlerts(reportData)
      };

      return analysis;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        timestamp: new Date().toISOString(),
        error: 'Failed to parse AI response'
      };
    }
  }

  /**
   * Clean AI response to remove JSON formatting and improve readability
   */
  cleanAIResponse(response) {
    return response
      .replace(/\{[^}]*\}/g, '') // Remove JSON-like structures
      .replace(/"[^"]*":\s*"[^"]*"/g, '') // Remove key-value pairs
      .replace(/,\s*/g, '') // Remove commas
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove ** markdown bold formatting
      .replace(/\*([^*]+)\*/g, '$1') // Remove single * markdown formatting
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers
      .replace(/\*\s*/g, '') // Remove any remaining asterisks
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim();
  }

  /**
   * Extract specific sections from AI response
   */
  extractSection(response, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s\\S]*?(?=\\n\\d+\\.|$)`, 'i');
    const match = response.match(regex);
    return match ? match[0].replace(sectionName, '').trim() : 'Analysis not available';
  }

  /**
   * Calculate key metrics for quick reference
   */
  calculateKeyMetrics(reportData) {
    const opening = reportData.opening_balance?.total?.amount || 0;
    const closing = reportData.closing_balance?.total?.amount || 0;
    const netChange = closing - opening;
    const changePercent = opening > 0 ? (netChange / opening) * 100 : 0;

    const stage1Change = (reportData.closing_balance?.stages?.[1]?.amount || 0) - (reportData.opening_balance?.stages?.[1]?.amount || 0);
    const stage2Change = (reportData.closing_balance?.stages?.[2]?.amount || 0) - (reportData.opening_balance?.stages?.[2]?.amount || 0);
    const stage3Change = (reportData.closing_balance?.stages?.[3]?.amount || 0) - (reportData.opening_balance?.stages?.[3]?.amount || 0);

    return {
      netECLChange: {
        amount: netChange,
        percentage: changePercent,
        direction: netChange > 0 ? 'increase' : 'decrease'
      },
      stageChanges: {
        stage1: stage1Change,
        stage2: stage2Change,
        stage3: stage3Change
      },
      totalAccounts: {
        opening: (reportData.opening_balance?.total?.account_count || 0),
        closing: (reportData.closing_balance?.total?.account_count || 0)
      }
    };
  }

  /**
   * Generate risk alerts based on data patterns
   */
  generateRiskAlerts(reportData) {
    const alerts = [];
    
    const opening = reportData.opening_balance?.total?.amount || 0;
    const closing = reportData.closing_balance?.total?.amount || 0;
    const changePercent = opening > 0 ? ((closing - opening) / opening) * 100 : 0;

    // ECL increase alert
    if (changePercent > 20) {
      alerts.push({
        type: 'warning',
        severity: 'high',
        message: `ECL increased by ${changePercent.toFixed(1)}% - significant risk increase detected`,
        recommendation: 'Investigate drivers of ECL increase and review credit quality'
      });
    }

    // Stage 3 concentration alert
    const stage3Ratio = (reportData.closing_balance?.stages?.[3]?.amount || 0) / closing;
    if (stage3Ratio > 0.5) {
      alerts.push({
        type: 'alert',
        severity: 'high',
        message: `Stage 3 accounts represent ${(stage3Ratio * 100).toFixed(1)}% of total ECL`,
        recommendation: 'Review Stage 3 account management and recovery strategies'
      });
    }

    // Stage migration alert
    const stageTransfers = reportData.stage_transfer_losses?.transfers || [];
    const totalTransfers = stageTransfers.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);
    if (totalTransfers > closing * 0.1) {
      alerts.push({
        type: 'info',
        severity: 'medium',
        message: `Significant stage migration activity: ${this.formatAmount(totalTransfers)}`,
        recommendation: 'Monitor stage migration patterns and credit quality trends'
      });
    }

    return alerts;
  }

  /**
   * Summarize report data for AI context
   */
  summarizeReportData(reportData) {
    return {
      totalECL: {
        opening: reportData.opening_balance?.total?.amount || 0,
        closing: reportData.closing_balance?.total?.amount || 0
      },
      stageDistribution: {
        stage1: reportData.closing_balance?.stages?.[1]?.amount || 0,
        stage2: reportData.closing_balance?.stages?.[2]?.amount || 0,
        stage3: reportData.closing_balance?.stages?.[3]?.amount || 0
      },
      newAssets: reportData.new_assets?.total?.amount || 0,
      stageTransfers: reportData.stage_transfer_losses?.transfers?.length || 0
    };
  }

  /**
   * Handle chat interactions with the AI
   */
  async handleChatMessage(message, reportData, context = 'loss_allowance_analysis') {
    try {
      const prompt = this.buildChatPrompt(message, reportData, context);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert banking risk analyst specializing in IFRS 9 Expected Credit Loss (ECL) calculations and Loss Allowance reporting. 
            
            You are having a conversation with a banking professional about their Loss Allowance Report. Provide helpful, specific, and actionable insights based on the report data.
            
            Your expertise includes:
            - IFRS 9 staging criteria and ECL calculations
            - Banking risk management and credit analysis
            - Regulatory compliance and reporting requirements
            - Portfolio risk assessment and trend analysis
            - Stage migration patterns and credit quality indicators
            
            Be conversational, professional, and provide specific insights based on the actual data provided.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const aiResponse = response.choices[0].message.content;
      
      return {
        response: aiResponse,
        suggestAnalysisUpdate: this.shouldSuggestAnalysisUpdate(message)
      };
      
    } catch (error) {
      console.error('OpenAI Chat Error:', error);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  /**
   * Build chat prompt with context
   */
  buildChatPrompt(message, reportData, context) {
    const reportSummary = this.summarizeReportData(reportData);
    
    return `
User Question: "${message}"

Context: ${context}

Report Data Summary:
- Total ECL Opening: ${this.formatAmount(reportSummary.totalECL.opening)}
- Total ECL Closing: ${this.formatAmount(reportSummary.totalECL.closing)}
- Stage 1 ECL: ${this.formatAmount(reportSummary.stageDistribution.stage1)}
- Stage 2 ECL: ${this.formatAmount(reportSummary.stageDistribution.stage2)}
- Stage 3 ECL: ${this.formatAmount(reportSummary.stageDistribution.stage3)}
- New Assets: ${this.formatAmount(reportSummary.newAssets)}
- Stage Transfers: ${reportSummary.stageTransfers} transfers

Please provide a helpful, specific response to the user's question based on this data. If they ask for additional analysis, suggest they run a new analysis.
    `;
  }

  /**
   * Determine if the message suggests updating the analysis
   */
  shouldSuggestAnalysisUpdate(message) {
    const updateKeywords = [
      'analyze', 'analysis', 'detailed', 'more', 'additional', 'deeper',
      'breakdown', 'drill down', 'explain', 'elaborate'
    ];
    
    return updateKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Format currency amounts
   */
  formatAmount(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  /**
   * Format currency values for display (alias for formatAmount)
   */
  formatCurrency(amount) {
    return this.formatAmount(amount);
  }

  /**
   * Build comprehensive prompt for ECL Analysis Report
   */
  buildECLAnalysisPrompt(reportData) {
    const { byCurrency, byStage, bySegment, byPortfolio, byDelinquency, topExposures } = reportData;

    return `
Please analyze this ECL Analysis Report data and provide a comprehensive risk assessment:

CURRENCY BREAKDOWN:
${byCurrency?.map(currency => 
  `- ${currency.v_ccy_code}: EAD ${currency.n_exposure_at_default_ncy}, Lifetime ECL ${currency.n_lifetime_ecl_ncy}, 12M ECL ${currency.n_12m_ecl_ncy}`
).join('\n') || 'No currency data available'}

STAGE DISTRIBUTION:
${byStage?.map(stage => 
  `- ${stage.n_stage_descr}: ${stage.accounts} accounts, EAD ${stage.n_exposure_at_default_ncy}`
).join('\n') || 'No stage data available'}

PRODUCT SEGMENT BREAKDOWN:
${bySegment?.map(segment => 
  `- ${segment.n_prod_segment}: EAD ${segment.n_exposure_at_default_ncy}`
).join('\n') || 'No segment data available'}

PORTFOLIO BREAKDOWN (PD Term Structure):
${byPortfolio?.map(portfolio => 
  `- ${portfolio.n_pd_term_structure_name}: ${portfolio.accounts} accounts, EAD ${portfolio.n_exposure_at_default_ncy}, Lifetime ECL ${portfolio.n_lifetime_ecl_ncy}, 12M ECL ${portfolio.n_12m_ecl_ncy}`
).join('\n') || 'No portfolio data available'}

DELINQUENCY DISTRIBUTION:
${byDelinquency?.map(delinquency => 
  `- ${delinquency.delinquency_band}: ${delinquency.accounts} accounts, EAD ${delinquency.n_exposure_at_default_ncy}`
).join('\n') || 'No delinquency data available'}

TOP EXPOSURES:
${topExposures?.map(exposure => 
  `- Account ${exposure.n_account_number} (${exposure.n_partner_name || 'N/A'}): EAD ${exposure.n_exposure_at_default_ncy}, Stage ${exposure.n_stage_descr || 'N/A'}, Segment ${exposure.n_prod_segment || 'N/A'}`
).join('\n') || 'No top exposures data available'}

Please provide a clear, professional analysis in this format:

EXECUTIVE SUMMARY
[Key findings and portfolio health overview]

CURRENCY RISK ANALYSIS
[Currency concentration and risk assessment]

STAGE DISTRIBUTION ANALYSIS
[IFRS stage breakdown and risk implications]

SEGMENT CONCENTRATION RISK
[Product segment analysis and concentration concerns]

PORTFOLIO ANALYSIS
[PD term structure portfolio breakdown and risk assessment]

DELINQUENCY PATTERNS
[Delinquency distribution and early warning signals]

TOP EXPOSURE CONCENTRATION
[Concentration risk from largest exposures]

RISK INDICATORS
[Key risk metrics and warning signals]

REGULATORY COMPLIANCE
[IFRS 9 adherence and reporting quality]

RECOMMENDATIONS
[Specific, actionable risk management advice]

CONCLUSIONS
[Overall risk assessment and outlook]

Use concise, professional language. Write in clear English with proper grammar. Do not use markdown formatting like ** or ##. Use plain text only.
    `;
  }

  /**
   * Build comprehensive prompt for IFRS 7.35G Term Structure Report
   */
  buildIFRS735GPrompt(reportData) {
    const { bySegment, summary } = this.summarizeIFRS735GData(reportData);
    
    return `
Analyze this IFRS 7.35G Term Structure Report data and provide comprehensive insights:

REPORT SUMMARY:
- Total Segments: ${summary.totalSegments}
- Total Accounts: ${summary.totalAccounts}
- Total EAD: ${summary.totalEAD}
- Total ECL: ${summary.totalECL}
- Average PD: ${summary.averagePD}%
- Average LGD: ${summary.averageLGD}%

SEGMENT BREAKDOWN:
${bySegment?.map(segment => 
  `- ${segment.segmentName}: ${segment.totalAccounts} accounts, EAD ${segment.totalEAD}, ECL ${segment.totalECL}, Avg PD ${segment.averagePD}%, Avg LGD ${segment.averageLGD}%`
).join('\n') || 'No segment data available'}

DETAILED SEGMENT ANALYSIS:
${Object.entries(reportData)
  .filter(([segmentName]) => segmentName && segmentName !== 'null' && segmentName !== 'undefined')
  .map(([segmentName, bands]) => {
  const segmentTotal = bands.reduce((acc, band) => ({
    accounts: acc.accounts + band.accountCount,
    ead: acc.ead + parseFloat(band.totalExposure),
    ecl: acc.ecl + parseFloat(band.total12MECL),
    avgPd: acc.avgPd + parseFloat(band.averagePD),
    avgLgd: acc.avgLgd + parseFloat(band.averageLGD)
  }), { accounts: 0, ead: 0, ecl: 0, avgPd: 0, avgLgd: 0 });
  
  return `
${segmentName.toUpperCase()} SEGMENT:
${bands.map(band => 
  `- ${band.delinquencyBand}: ${band.accountCount} accounts, EAD ${band.totalExposure}, ECL ${band.total12MECL}, PD ${band.averagePD}%, LGD ${band.averageLGD}%`
).join('\n')}
- Segment Totals: ${segmentTotal.accounts} accounts, EAD ${segmentTotal.ead}, ECL ${segmentTotal.ecl}`;
}).join('\n')}

Please provide a clear, professional analysis in this format:

EXECUTIVE SUMMARY
[Overall portfolio health and key findings]

SEGMENT ANALYSIS
[Analysis of each product segment's performance and risk profile]

DELINQUENCY PATTERN ANALYSIS
[Analysis of delinquency bands and their impact on risk]

PD AND LGD ANALYSIS
[Analysis of probability of default and loss given default patterns]

ECL PROVISIONING ANALYSIS
[Analysis of expected credit loss provisioning adequacy]

CONCENTRATION RISK ASSESSMENT
[Assessment of concentration risks across segments and bands]

REGULATORY COMPLIANCE
[IFRS 7.35G compliance and disclosure requirements]

RISK INDICATORS
[Early warning signals and risk trends]

RECOMMENDATIONS
[Specific, actionable risk management advice]

CONCLUSIONS
[Overall risk assessment and outlook]

Use concise, professional language. Write in clear English with proper grammar. Do not use markdown formatting like ** or ##. Use plain text only.
    `;
  }

  /**
   * Parse ECL Analysis AI response into structured format
   */
  parseECLAnalysisResponse(aiResponse, reportData) {
    const cleanedResponse = this.cleanAIResponse(aiResponse);
    
    // Extract structured data from AI response
    const analysis = {
      timestamp: new Date().toISOString(),
      reportData: this.summarizeECLAnalysisData(reportData),
      insights: {
        executiveSummary: this.extractSection(cleanedResponse, 'EXECUTIVE SUMMARY'),
        currencyRiskAnalysis: this.extractSection(cleanedResponse, 'CURRENCY RISK ANALYSIS'),
        stageDistributionAnalysis: this.extractSection(cleanedResponse, 'STAGE DISTRIBUTION ANALYSIS'),
        segmentConcentrationRisk: this.extractSection(cleanedResponse, 'SEGMENT CONCENTRATION RISK'),
        portfolioAnalysis: this.extractSection(cleanedResponse, 'PORTFOLIO ANALYSIS'),
        delinquencyPatterns: this.extractSection(cleanedResponse, 'DELINQUENCY PATTERNS'),
        topExposureConcentration: this.extractSection(cleanedResponse, 'TOP EXPOSURE CONCENTRATION'),
        riskIndicators: this.extractSection(cleanedResponse, 'RISK INDICATORS'),
        regulatoryCompliance: this.extractSection(cleanedResponse, 'REGULATORY COMPLIANCE'),
        recommendations: this.extractSection(cleanedResponse, 'RECOMMENDATIONS'),
        conclusions: this.extractSection(cleanedResponse, 'CONCLUSIONS')
      },
      keyMetrics: this.calculateECLAnalysisMetrics(reportData),
      riskAlerts: this.generateECLAnalysisRiskAlerts(reportData)
    };

    return analysis;
  }

  /**
   * Summarize ECL Analysis data for AI context
   */
  summarizeECLAnalysisData(reportData) {
    const { byCurrency, byStage, bySegment, byPortfolio, byDelinquency, topExposures } = reportData;
    
    return {
      totalCurrencies: byCurrency?.length || 0,
      totalStages: byStage?.length || 0,
      totalSegments: bySegment?.length || 0,
      totalPortfolios: byPortfolio?.length || 0,
      totalDelinquencyBands: byDelinquency?.length || 0,
      topExposuresCount: topExposures?.length || 0,
      currencyBreakdown: byCurrency?.map(c => ({
        currency: c.v_ccy_code,
        ead: c.n_exposure_at_default_ncy,
        lifetimeECL: c.n_lifetime_ecl_ncy,
        twelveMonthECL: c.n_12m_ecl_ncy
      })) || [],
      stageBreakdown: byStage?.map(s => ({
        stage: s.n_stage_descr,
        accounts: s.accounts,
        ead: s.n_exposure_at_default_ncy
      })) || [],
      segmentBreakdown: bySegment?.map(s => ({
        segment: s.n_prod_segment,
        ead: s.n_exposure_at_default_ncy
      })) || [],
      portfolioBreakdown: byPortfolio?.map(p => ({
        portfolio: p.n_pd_term_structure_name,
        accounts: p.accounts,
        ead: p.n_exposure_at_default_ncy,
        lifetimeECL: p.n_lifetime_ecl_ncy,
        twelveMonthECL: p.n_12m_ecl_ncy
      })) || []
    };
  }

  /**
   * Calculate key metrics for ECL Analysis
   */
  calculateECLAnalysisMetrics(reportData) {
    const { byCurrency, byStage, bySegment, byDelinquency, topExposures } = reportData;
    
    // Helper function to safely convert to number
    const toNumber = (val) => {
      if (val === null || val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };
    
    const totalEAD = byCurrency?.reduce((sum, c) => sum + toNumber(c.n_exposure_at_default_ncy), 0) || 0;
    const totalLifetimeECL = byCurrency?.reduce((sum, c) => sum + toNumber(c.n_lifetime_ecl_ncy), 0) || 0;
    const total12MECL = byCurrency?.reduce((sum, c) => sum + toNumber(c.n_12m_ecl_ncy), 0) || 0;
    const totalAccounts = byStage?.reduce((sum, s) => sum + toNumber(s.accounts), 0) || 0;
    
    return {
      totalEAD,
      totalLifetimeECL,
      total12MECL,
      totalAccounts,
      averageECLRate: totalEAD > 0 ? (totalLifetimeECL / totalEAD) * 100 : 0,
      currencyConcentration: this.calculateConcentrationRisk(byCurrency?.map(c => toNumber(c.n_exposure_at_default_ncy)) || []),
      stageDistribution: this.calculateStageDistribution(byStage || []),
      delinquencyDistribution: this.calculateDelinquencyDistribution(byDelinquency || [])
    };
  }

  /**
   * Generate risk alerts for ECL Analysis
   */
  generateECLAnalysisRiskAlerts(reportData) {
    const alerts = [];
    const { byCurrency, byStage, bySegment, topExposures } = reportData;
    
    // Helper function to safely convert to number
    const toNumber = (val) => {
      if (val === null || val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };
    
    // Currency concentration risk
    if (byCurrency?.length > 0) {
      const maxCurrencyEAD = Math.max(...byCurrency.map(c => toNumber(c.n_exposure_at_default_ncy)));
      const totalEAD = byCurrency.reduce((sum, c) => sum + toNumber(c.n_exposure_at_default_ncy), 0);
      const concentrationRatio = totalEAD > 0 ? (maxCurrencyEAD / totalEAD) * 100 : 0;
      
      if (concentrationRatio > 70) {
        alerts.push({
          type: 'high',
          category: 'concentration',
          message: `High currency concentration risk: ${concentrationRatio.toFixed(1)}% of EAD in single currency`
        });
      }
    }
    
    // Stage 3 concentration
    const stage3Data = byStage?.find(s => s.n_stage_descr?.toLowerCase().includes('stage 3') || s.n_stage_descr?.toLowerCase().includes('3'));
    if (stage3Data) {
      const stage3Accounts = toNumber(stage3Data.accounts);
      const totalAccounts = byStage?.reduce((sum, s) => sum + toNumber(s.accounts), 0) || 1;
      const stage3Percentage = (stage3Accounts / totalAccounts) * 100;
      if (stage3Percentage > 20) {
        alerts.push({
          type: 'high',
          category: 'credit_quality',
          message: `High Stage 3 concentration: ${stage3Percentage.toFixed(1)}% of accounts in Stage 3`
        });
      }
    }
    
    // Top exposure concentration
    if (topExposures?.length > 0) {
      const maxExposure = Math.max(...topExposures.map(e => toNumber(e.n_exposure_at_default_ncy)));
      const totalEAD = byCurrency?.reduce((sum, c) => sum + toNumber(c.n_exposure_at_default_ncy), 0) || 0;
      const exposureRatio = totalEAD > 0 ? (maxExposure / totalEAD) * 100 : 0;
      
      if (exposureRatio > 5) {
        alerts.push({
          type: 'medium',
          category: 'concentration',
          message: `Significant single exposure: ${exposureRatio.toFixed(1)}% of total EAD in one account`
        });
      }
    }
    
    return alerts;
  }

  /**
   * Calculate concentration risk
   */
  calculateConcentrationRisk(values) {
    if (!values || values.length === 0) return 0;
    const total = values.reduce((sum, val) => sum + val, 0);
    const max = Math.max(...values);
    return total > 0 ? (max / total) * 100 : 0;
  }

  /**
   * Calculate stage distribution
   */
  calculateStageDistribution(stages) {
    // Helper function to safely convert to number
    const toNumber = (val) => {
      if (val === null || val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };
    
    const total = stages.reduce((sum, stage) => sum + toNumber(stage.accounts), 0);
    return stages.map(stage => ({
      stage: stage.n_stage_descr,
      percentage: total > 0 ? (toNumber(stage.accounts) / total) * 100 : 0
    }));
  }

  /**
   * Calculate delinquency distribution
   */
  calculateDelinquencyDistribution(delinquency) {
    // Helper function to safely convert to number
    const toNumber = (val) => {
      if (val === null || val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };
    
    const total = delinquency.reduce((sum, del) => sum + toNumber(del.accounts), 0);
    return delinquency.map(del => ({
      band: del.delinquency_band,
      percentage: total > 0 ? (toNumber(del.accounts) / total) * 100 : 0
    }));
  }

  /**
   * Summarize IFRS 7.35G data for AI context
   */
  summarizeIFRS735GData(reportData) {
    // Filter out null/undefined keys
    const segments = Object.keys(reportData).filter(key => key && key !== 'null' && key !== 'undefined');
    const bySegment = segments.map(segmentName => {
      const bands = reportData[segmentName];
      const segmentTotal = bands.reduce((acc, band) => ({
        accounts: acc.accounts + band.accountCount,
        ead: acc.ead + parseFloat(band.totalExposure),
        ecl: acc.ecl + parseFloat(band.total12MECL),
        avgPd: acc.avgPd + parseFloat(band.averagePD),
        avgLgd: acc.avgLgd + parseFloat(band.averageLGD)
      }), { accounts: 0, ead: 0, ecl: 0, avgPd: 0, avgLgd: 0 });
      
      return {
        segmentName,
        totalAccounts: segmentTotal.accounts,
        totalEAD: this.formatCurrency(segmentTotal.ead),
        totalECL: this.formatCurrency(segmentTotal.ecl),
        averagePD: (segmentTotal.avgPd / bands.length * 100).toFixed(2),
        averageLGD: (segmentTotal.avgLgd / bands.length * 100).toFixed(2)
      };
    });
    
    const summary = {
      totalSegments: segments.length,
      totalAccounts: bySegment.reduce((sum, seg) => sum + seg.totalAccounts, 0),
      totalEAD: this.formatCurrency(bySegment.reduce((sum, seg) => sum + parseFloat(seg.totalEAD.replace(/[$,]/g, '')), 0)),
      totalECL: this.formatCurrency(bySegment.reduce((sum, seg) => sum + parseFloat(seg.totalECL.replace(/[$,]/g, '')), 0)),
      averagePD: (bySegment.reduce((sum, seg) => sum + parseFloat(seg.averagePD), 0) / segments.length).toFixed(2),
      averageLGD: (bySegment.reduce((sum, seg) => sum + parseFloat(seg.averageLGD), 0) / segments.length).toFixed(2)
    };
    
    return { bySegment, summary };
  }

  /**
   * Parse IFRS 7.35G AI response and structure it for frontend consumption
   */
  parseIFRS735GResponse(aiResponse, reportData) {
    const cleanedResponse = this.cleanAIResponse(aiResponse);
    console.log('IFRS 7.35G Cleaned Response:', cleanedResponse);
    
    // Extract structured data from AI response
    const analysis = {
      timestamp: new Date().toISOString(),
      reportData: this.summarizeIFRS735GData(reportData),
      insights: {
        executiveSummary: this.extractSection(cleanedResponse, 'EXECUTIVE SUMMARY'),
        segmentAnalysis: this.extractSection(cleanedResponse, 'SEGMENT ANALYSIS'),
        delinquencyPatternAnalysis: this.extractSection(cleanedResponse, 'DELINQUENCY PATTERN ANALYSIS'),
        pdAndLgdAnalysis: this.extractSection(cleanedResponse, 'PD AND LGD ANALYSIS'),
        eclProvisioningAnalysis: this.extractSection(cleanedResponse, 'ECL PROVISIONING ANALYSIS'),
        concentrationRiskAssessment: this.extractSection(cleanedResponse, 'CONCENTRATION RISK ASSESSMENT'),
        regulatoryCompliance: this.extractSection(cleanedResponse, 'REGULATORY COMPLIANCE'),
        riskIndicators: this.extractSection(cleanedResponse, 'RISK INDICATORS'),
        recommendations: this.extractSection(cleanedResponse, 'RECOMMENDATIONS'),
        conclusions: this.extractSection(cleanedResponse, 'CONCLUSIONS')
      },
      keyMetrics: this.calculateIFRS735GMetrics(reportData),
      riskAlerts: this.generateIFRS735GRiskAlerts(reportData)
    };

    return analysis;
  }

  /**
   * Calculate key metrics for IFRS 7.35G report
   */
  calculateIFRS735GMetrics(reportData) {
    // Filter out null/undefined keys
    const segments = Object.keys(reportData).filter(key => key && key !== 'null' && key !== 'undefined');
    let totalAccounts = 0;
    let totalEAD = 0;
    let totalECL = 0;
    let totalPD = 0;
    let totalLGD = 0;
    let bandCount = 0;

    segments.forEach(segmentName => {
      const bands = reportData[segmentName];
      bands.forEach(band => {
        totalAccounts += band.accountCount;
        totalEAD += parseFloat(band.totalExposure);
        totalECL += parseFloat(band.total12MECL);
        totalPD += parseFloat(band.averagePD);
        totalLGD += parseFloat(band.averageLGD);
        bandCount++;
      });
    });

    return {
      totalSegments: segments.length,
      totalAccounts,
      totalEAD: this.formatCurrency(totalEAD),
      totalECL: this.formatCurrency(totalECL),
      averagePD: (totalPD / bandCount * 100).toFixed(2),
      averageLGD: (totalLGD / bandCount * 100).toFixed(2),
      segmentBreakdown: segments.map(segmentName => {
        const bands = reportData[segmentName];
        const segmentTotal = bands.reduce((acc, band) => ({
          accounts: acc.accounts + band.accountCount,
          ead: acc.ead + parseFloat(band.totalExposure),
          ecl: acc.ecl + parseFloat(band.total12MECL)
        }), { accounts: 0, ead: 0, ecl: 0 });
        
        return {
          segment: segmentName,
          accounts: segmentTotal.accounts,
          ead: this.formatCurrency(segmentTotal.ead),
          ecl: this.formatCurrency(segmentTotal.ecl)
        };
      })
    };
  }

  /**
   * Generate risk alerts for IFRS 7.35G report
   */
  generateIFRS735GRiskAlerts(reportData) {
    const alerts = [];
    // Filter out null/undefined keys
    const segments = Object.keys(reportData).filter(key => key && key !== 'null' && key !== 'undefined');
    
    // Calculate total portfolio metrics
    let totalEAD = 0;
    let totalECL = 0;
    let totalAccounts = 0;
    
    segments.forEach(segmentName => {
      const bands = reportData[segmentName];
      bands.forEach(band => {
        totalEAD += parseFloat(band.totalExposure);
        totalECL += parseFloat(band.total12MECL);
        totalAccounts += band.accountCount;
      });
    });

    // High ECL ratio alert
    const eclRatio = totalEAD > 0 ? (totalECL / totalEAD) * 100 : 0;
    if (eclRatio > 5) {
      alerts.push({
        type: 'warning',
        message: `High ECL ratio detected: ${eclRatio.toFixed(2)}% of EAD`,
        severity: 'high'
      });
    }

    // Segment concentration risk
    segments.forEach(segmentName => {
      const bands = reportData[segmentName];
      const segmentEAD = bands.reduce((sum, band) => sum + parseFloat(band.totalExposure), 0);
      const segmentRatio = (segmentEAD / totalEAD) * 100;
      
      if (segmentRatio > 40) {
        alerts.push({
          type: 'concentration',
          message: `High concentration in ${segmentName} segment: ${segmentRatio.toFixed(1)}% of total EAD`,
          severity: 'medium'
        });
      }
    });

    // High delinquency bands
    segments.forEach(segmentName => {
      const bands = reportData[segmentName];
      const highRiskBands = bands.filter(band => 
        band.delinquencyBand === '61-90' || band.delinquencyBand === '91+'
      );
      
      if (highRiskBands.length > 0) {
        const highRiskEAD = highRiskBands.reduce((sum, band) => sum + parseFloat(band.totalExposure), 0);
        const highRiskRatio = (highRiskEAD / totalEAD) * 100;
        
        if (highRiskRatio > 10) {
          alerts.push({
            type: 'delinquency',
            message: `High delinquency exposure in ${segmentName}: ${highRiskRatio.toFixed(1)}% in 61+ day bands`,
            severity: 'high'
          });
        }
      }
    });

    return alerts;
  }

  // Analyze PD Comparison Report
  async analyzePDComparisonReport(reportData) {
    try {
      console.log('Analyzing PD Comparison Report...');
      
      const prompt = this.buildPDComparisonPrompt(reportData);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0].message.content;
      const cleanedResponse = this.cleanAIResponse(aiResponse);
      
      return {
        success: true,
        analysis: cleanedResponse,
        metrics: this.calculatePDComparisonMetrics(reportData),
        riskAlerts: this.generatePDComparisonRiskAlerts(reportData)
      };
    } catch (error) {
      console.error('Error analyzing PD Comparison Report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  buildPDComparisonPrompt(reportData) {
    const summary = this.summarizePDComparisonData(reportData);
    
    return `You are a financial risk analyst specializing in IFRS 9 Expected Credit Loss (ECL) and Probability of Default (PD) analysis. 

Analyze this PD Comparison Report that compares Observed PD (from ECL calculations) vs Model PD (from PD Term Structure) across different product segments and delinquency stages.

REPORT DATA:
${JSON.stringify(summary, null, 2)}

Please provide a comprehensive analysis covering:

1. EXECUTIVE SUMMARY
- Overall comparison between Observed PD and Model PD
- Key findings and patterns across segments and delinquency stages

2. SEGMENT ANALYSIS
- Performance by product segment (Agriculture, Education, Healthy, Manufacturing)
- Which segments show the highest variances between Observed and Model PD
- Risk implications for each segment

3. DELINQUENCY STAGE ANALYSIS
- How PD values change across delinquency stages (Active, 1-30, 31-60, 61-89, 90+)
- Stage 3 (90+ days) analysis - why both Observed and Model PD are 100%
- Early stage (Active, 1-30) variance analysis

4. VARIANCE ANALYSIS
- High variance cases (>20% difference)
- Low variance cases (<5% difference)
- Average variance across all comparisons
- Statistical significance of differences

5. RISK ASSESSMENT
- Model validation insights
- Potential over/under-estimation of risk
- Data quality concerns
- Recommendations for model calibration

6. KEY METRICS
- Total segments analyzed
- Total comparisons made
- Average variance percentage
- High variance count and percentage

7. RECOMMENDATIONS
- Model calibration adjustments needed
- Data quality improvements
- Monitoring and validation steps
- Risk management actions

Use clear, professional language without markdown formatting. Focus on actionable insights and risk management implications.`;
  }

  summarizePDComparisonData(reportData) {
    const segments = reportData.comparisonMatrix || [];
    const summaryStats = reportData.summaryStats || {};
    const delinquencyBands = reportData.delinquencyBands || [];

    // Calculate detailed metrics
    let totalVariance = 0;
    let highVarianceCount = 0;
    let lowVarianceCount = 0;
    let totalComparisons = 0;

    const segmentAnalysis = segments.map(segment => {
      const segmentVariances = [];
      let segmentHighVariance = 0;
      let segmentLowVariance = 0;

      segment.delinquencyBands.forEach(band => {
        if (band.ecl_pd > 0 && band.term_structure_pd > 0) {
          const variance = Math.abs(band.pd_variance_percent);
          segmentVariances.push(variance);
          totalVariance += variance;
          totalComparisons++;

          if (variance > 20) {
            highVarianceCount++;
            segmentHighVariance++;
          } else if (variance < 5) {
            lowVarianceCount++;
            segmentLowVariance++;
          }
        }
      });

      return {
        segment_name: segment.segment_name,
        segment_type: segment.segment_type,
        total_bands: segment.delinquencyBands.length,
        high_variance_count: segmentHighVariance,
        low_variance_count: segmentLowVariance,
        average_variance: segmentVariances.length > 0 ? 
          segmentVariances.reduce((a, b) => a + b, 0) / segmentVariances.length : 0
      };
    });

    return {
      report_date: reportData.reportDate,
      run_key: reportData.runKey,
      total_segments: summaryStats.totalSegments || segments.length,
      total_comparisons: summaryStats.totalComparisons || totalComparisons,
      average_variance: summaryStats.averageVariance || (totalComparisons > 0 ? totalVariance / totalComparisons : 0),
      high_variance_count: summaryStats.highVarianceCount || highVarianceCount,
      low_variance_count: summaryStats.lowVarianceCount || lowVarianceCount,
      high_variance_percent: summaryStats.highVariancePercent || (totalComparisons > 0 ? (highVarianceCount / totalComparisons) * 100 : 0),
      low_variance_percent: summaryStats.lowVariancePercent || (totalComparisons > 0 ? (lowVarianceCount / totalComparisons) * 100 : 0),
      delinquency_bands: delinquencyBands.map(band => ({
        band_code: band.band_code,
        band_description: band.band_description,
        lower_value: band.lower_value,
        upper_value: band.upper_value
      })),
      segment_analysis: segmentAnalysis,
      detailed_comparisons: segments.map(segment => ({
        segment_name: segment.segment_name,
        segment_type: segment.segment_type,
        delinquency_bands: segment.delinquencyBands.map(band => ({
          band_code: band.band_code,
          observed_pd: this.formatPercent(band.ecl_pd),
          model_pd: this.formatPercent(band.term_structure_pd),
          pd_difference: this.formatPercent(band.pd_difference),
          pd_variance_percent: band.pd_variance_percent,
          account_count: band.account_count,
          total_ead: this.formatCurrency(band.total_ead)
        }))
      }))
    };
  }

  calculatePDComparisonMetrics(reportData) {
    const summaryStats = reportData.summaryStats || {};
    
    return {
      totalSegments: summaryStats.totalSegments || 0,
      totalComparisons: summaryStats.totalComparisons || 0,
      averageVariance: summaryStats.averageVariance || 0,
      highVarianceCount: summaryStats.highVarianceCount || 0,
      lowVarianceCount: summaryStats.lowVarianceCount || 0,
      highVariancePercent: summaryStats.highVariancePercent || 0,
      lowVariancePercent: summaryStats.lowVariancePercent || 0
    };
  }

  generatePDComparisonRiskAlerts(reportData) {
    const alerts = [];
    const summaryStats = reportData.summaryStats || {};
    
    // High variance alert
    if (summaryStats.highVarianceCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${summaryStats.highVarianceCount} comparisons show high variance (>20%) between Observed and Model PD`,
        severity: 'medium'
      });
    }

    // Low variance alert (good)
    if (summaryStats.lowVarianceCount > 0) {
      alerts.push({
        type: 'success',
        message: `${summaryStats.lowVarianceCount} comparisons show good alignment (<5% variance) between Observed and Model PD`,
        severity: 'low'
      });
    }

    // High average variance alert
    if (summaryStats.averageVariance > 15) {
      alerts.push({
        type: 'error',
        message: `High average variance of ${summaryStats.averageVariance.toFixed(2)}% indicates potential model calibration issues`,
        severity: 'high'
      });
    }

    return alerts;
  }

  // Format percentage values
  formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }
    return (Number(value) * 100).toFixed(2) + '%';
  }

  async analyzeResultsVisualization(reportData) {
    try {
      console.log('Analyzing Results Visualization...');
      
      const prompt = this.buildResultsVisualizationPrompt(reportData);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      });

      const cleanedResponse = this.cleanAIResponse(response.choices[0].message.content);
      
      const metrics = this.calculateResultsVisualizationMetrics(reportData);
      const riskAlerts = this.generateResultsVisualizationRiskAlerts(reportData);

      return {
        success: true,
        analysis: cleanedResponse,
        metrics: metrics,
        riskAlerts: riskAlerts
      };
    } catch (error) {
      console.error('Error analyzing Results Visualization:', error);
      throw error;
    }
  }

  buildResultsVisualizationPrompt(reportData) {
    const { visualizationType, selectedVintage, heatmapData, survivalData, migrationData, statistics, summary } = reportData;
    
    return `You are a credit risk analyst with expertise in vintage analysis and survival analysis for ECL calculations. Analyze the following results visualization data and provide comprehensive insights.

VISUALIZATION TYPE: ${visualizationType}
SELECTED VINTAGE: ${selectedVintage}

HEATMAP DATA SUMMARY:
- Total Vintages: ${summary.totalVintages}
- Selected Vintages: ${summary.selectedVintages}
- Average Performance: ${summary.averagePerformance.toFixed(2)}%

SURVIVAL ANALYSIS DATA:
${survivalData.map(d => `- ${d.vintage}: ${d.time}m = ${d.survival.toFixed(3)}`).join('\n')}

MIGRATION FLOW DATA:
- Current to Delinquent: ${summary.migrationInsights.currentToDelinquent.toFixed(1)}%
- Recovery Rate (1-30 DPD to Current): ${summary.migrationInsights.recoveryRate.toFixed(1)}%

STATISTICAL OUTPUTS:
- Model: ${statistics.model}
- Concordance: ${statistics.concordance}
- P-Value: ${statistics.pValue}
- Hazard Ratio: ${statistics.hazardRatio}

Please provide analysis in the following sections:

EXECUTIVE SUMMARY
Provide a high-level overview of the vintage analysis and survival analysis results, highlighting key findings and trends.

VINTAGE PERFORMANCE ANALYSIS
Analyze the heatmap data, identifying:
- Best and worst performing vintages
- Performance trends over time
- Age-related performance patterns
- Risk concentration areas

SURVIVAL ANALYSIS INSIGHTS
Analyze the survival curves, focusing on:
- Survival probability trends across vintages
- Time-to-default patterns
- Vintage quality comparison
- Economic cycle impact

MIGRATION PATTERN ANALYSIS
Analyze the migration flow data, examining:
- Delinquency progression patterns
- Recovery rates and effectiveness
- Risk escalation paths
- Collection process insights

STATISTICAL MODEL ASSESSMENT
Evaluate the statistical outputs:
- Model fit and reliability
- Significance of findings
- Risk factor identification
- Model validation insights

RISK ASSESSMENT
Identify key risks and concerns:
- High-risk vintages or time periods
- Deteriorating trends
- Concentration risks
- Early warning indicators

RECOMMENDATIONS
Provide actionable recommendations:
- Risk management strategies
- Portfolio optimization suggestions
- Model improvement areas
- Monitoring and alerting recommendations

Use clear, professional language suitable for credit risk professionals. Focus on practical insights that can inform ECL calculations and risk management decisions.`;
  }

  calculateResultsVisualizationMetrics(reportData) {
    const { summary, statistics, heatmapData, migrationData } = reportData;
    
    // Calculate average PD from survival data (inverse of survival probability)
    const averageSurvival = reportData.survivalData.length > 0 
      ? reportData.survivalData.reduce((sum, point) => sum + point.survival, 0) / reportData.survivalData.length
      : 0;
    const averagePD = (1 - averageSurvival) * 100; // Convert to percentage
    
    // Calculate average LGD (simplified - using migration patterns as proxy)
    const defaultRate = summary.migrationInsights.currentToDelinquent / 100;
    const averageLGD = defaultRate * 60; // Assume 60% LGD for defaulted accounts
    
    return {
      totalSegments: summary.totalVintages, // Using vintages as segments for now
      totalAccounts: summary.totalAccounts || 0,
      averagePD: averagePD,
      averageLGD: averageLGD,
      totalVintages: summary.totalVintages,
      selectedVintages: summary.selectedVintages,
      averagePerformance: summary.averagePerformance,
      migrationRate: summary.migrationInsights.currentToDelinquent,
      recoveryRate: summary.migrationInsights.recoveryRate,
      modelConcordance: statistics.concordance,
      modelPValue: statistics.pValue,
      hazardRatio: statistics.hazardRatio
    };
  }

  generateResultsVisualizationRiskAlerts(reportData) {
    const { summary, statistics } = reportData;
    const alerts = [];

    if (summary.averagePerformance > 70) {
      alerts.push({
        type: 'warning',
        message: `High average performance rate of ${summary.averagePerformance.toFixed(1)}% may indicate data quality issues or overly optimistic assumptions`
      });
    }

    if (summary.migrationInsights.currentToDelinquent > 20) {
      alerts.push({
        type: 'critical',
        message: `High migration rate from Current to Delinquent (${summary.migrationInsights.currentToDelinquent.toFixed(1)}%) indicates deteriorating portfolio quality`
      });
    }

    if (summary.migrationInsights.recoveryRate < 50) {
      alerts.push({
        type: 'warning',
        message: `Low recovery rate (${summary.migrationInsights.recoveryRate.toFixed(1)}%) suggests ineffective collection processes`
      });
    }

    if (statistics.pValue > 0.05) {
      alerts.push({
        type: 'info',
        message: `Model p-value of ${statistics.pValue} indicates results may not be statistically significant`
      });
    }

    if (statistics.concordance < 0.7) {
      alerts.push({
        type: 'warning',
        message: `Low concordance index (${statistics.concordance}) suggests model may need improvement`
      });
    }

    return alerts;
  }
}

module.exports = AIService;
