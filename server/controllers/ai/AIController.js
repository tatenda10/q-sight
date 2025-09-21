const AIService = require('../../services/aiService');

class AIController {
  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Analyze Loss Allowance Report with AI
   * POST /api/ai/analyze-loss-allowance
   */
  async analyzeLossAllowanceReport(req, res) {
    try {
      const { reportData } = req.body;

      if (!reportData) {
        return res.status(400).json({
          success: false,
          message: 'Report data is required for AI analysis'
        });
      }

      // Validate report data structure
      if (!this.validateLossAllowanceData(reportData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report data structure'
        });
      }

      console.log('Starting AI analysis for Loss Allowance Report...');
      
      const analysis = await this.aiService.analyzeLossAllowanceReport(reportData);
      
      console.log('AI analysis completed successfully');

      res.json({
        success: true,
        data: analysis,
        message: 'AI analysis completed successfully'
      });

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Get AI analysis status and health check
   * GET /api/ai/status
   */
  async getAIStatus(req, res) {
    try {
      // Test OpenAI connection with a simple request
      const testResponse = await this.aiService.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 10
      });

      res.json({
        success: true,
        status: 'healthy',
        message: 'AI service is operational',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI Status Check Error:', error);
      
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        message: 'AI service is not available',
        error: error.message
      });
    }
  }

  /**
   * Validate ECL Analysis Report data structure
   */
  validateECLAnalysisData(reportData) {
    console.log('Validating ECL Analysis data structure...');
    console.log('Report data keys:', Object.keys(reportData));
    
    // Check if required fields exist
    const requiredFields = ['byCurrency', 'byStage', 'bySegment', 'byPortfolio', 'byDelinquency', 'topExposures'];
    
    for (const field of requiredFields) {
      if (!reportData[field] || !Array.isArray(reportData[field])) {
        console.log(`Missing or invalid field: ${field}`);
        return false;
      }
    }

    // Validate byCurrency structure (more flexible)
    if (reportData.byCurrency.length > 0) {
      const currencySample = reportData.byCurrency[0];
      console.log('Currency sample:', currencySample);
      console.log('Currency sample keys:', Object.keys(currencySample));
      
      if (!currencySample.v_ccy_code) {
        console.log('Invalid byCurrency structure: missing v_ccy_code');
        return false;
      }
      // Check if numeric fields exist (they might be strings or numbers)
      const numericFields = ['n_exposure_at_default_ncy', 'n_lifetime_ecl_ncy', 'n_12m_ecl_ncy'];
      for (const field of numericFields) {
        if (currencySample[field] === undefined || currencySample[field] === null) {
          console.log(`Invalid byCurrency structure: missing ${field}`);
          return false;
        }
      }
    }

    // Validate byStage structure (more flexible)
    if (reportData.byStage.length > 0) {
      const stageSample = reportData.byStage[0];
      if (!stageSample.n_stage_descr) {
        console.log('Invalid byStage structure: missing n_stage_descr');
        return false;
      }
      // Check if numeric fields exist
      const numericFields = ['accounts', 'n_exposure_at_default_ncy'];
      for (const field of numericFields) {
        if (stageSample[field] === undefined || stageSample[field] === null) {
          console.log(`Invalid byStage structure: missing ${field}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate Loss Allowance Report data structure
   */
  validateLossAllowanceData(data) {
    const requiredFields = [
      'opening_balance',
      'closing_balance',
      'new_assets',
      'derecognized_assets',
      'ecl_increases',
      'ecl_decreases'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate stage structure
    const stages = [1, 2, 3];
    for (const stage of stages) {
      if (!data.opening_balance.stages?.[stage] || !data.closing_balance.stages?.[stage]) {
        console.error(`Missing stage ${stage} data`);
        return false;
      }
    }

    return true;
  }

  /**
   * Generate AI summary for any ECL report
   * POST /api/ai/generate-summary
   */
  async generateReportSummary(req, res) {
    try {
      const { reportType, reportData, specificQuestions } = req.body;

      if (!reportType || !reportData) {
        return res.status(400).json({
          success: false,
          message: 'Report type and data are required'
        });
      }

      let analysis;
      switch (reportType) {
        case 'loss_allowance':
          analysis = await this.aiService.analyzeLossAllowanceReport(reportData);
          break;
        case 'ecl_analysis':
          // Future implementation for ECL Analysis Report
          analysis = { message: 'ECL Analysis AI not yet implemented' };
          break;
        case 'pd_comparison':
          // Future implementation for PD Comparison Report
          analysis = { message: 'PD Comparison AI not yet implemented' };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported report type'
          });
      }

      res.json({
        success: true,
        data: analysis,
        message: 'AI summary generated successfully'
      });

    } catch (error) {
      console.error('AI Summary Generation Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'AI summary generation failed',
        error: error.message
      });
    }
  }

  /**
   * Analyze ECL Analysis Report with AI
   * POST /api/ai/analyze-ecl-analysis
   */
  async analyzeECLAnalysisReport(req, res) {
    try {
      const { reportData } = req.body;

      if (!reportData) {
        return res.status(400).json({
          success: false,
          message: 'Report data is required for AI analysis'
        });
      }

      // Validate report data structure
      if (!this.validateECLAnalysisData(reportData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report data structure'
        });
      }

      console.log('Starting AI analysis for ECL Analysis Report...');
      
      const analysis = await this.aiService.analyzeECLAnalysisReport(reportData);
      
      console.log('AI analysis completed successfully');

      res.json({
        success: true,
        data: analysis,
        message: 'AI analysis completed successfully'
      });

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Analyze IFRS 7.35G Term Structure Report with AI
   * POST /api/ai/analyze-ifrs-735g
   */
  async analyzeIFRS735GReport(req, res) {
    try {
      const { reportData } = req.body;

      if (!reportData) {
        return res.status(400).json({
          success: false,
          message: 'Report data is required for AI analysis'
        });
      }

      // Validate report data structure
      if (!this.validateIFRS735GData(reportData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report data structure'
        });
      }

      console.log('Starting AI analysis for IFRS 7.35G Report...');
      
      const analysis = await this.aiService.analyzeIFRS735GReport(reportData);
      
      console.log('AI analysis completed successfully');

      res.json({
        success: true,
        data: analysis,
        message: 'AI analysis completed successfully'
      });

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Validate IFRS 7.35G Report data structure
   */
  validateIFRS735GData(reportData) {
    console.log('Validating IFRS 7.35G data structure...');
    console.log('Report data keys:', Object.keys(reportData));
    
    // Check if reportData is an object with segment keys
    if (typeof reportData !== 'object' || Array.isArray(reportData)) {
      console.log('Invalid data structure: not an object');
      return false;
    }

    // Check if there are any segments
    const segments = Object.keys(reportData).filter(key => key && key !== 'null' && key !== 'undefined');
    if (segments.length === 0) {
      console.log('No valid segments found');
      return false;
    }

    // Validate first segment structure
    const firstSegment = segments[0];
    const segmentData = reportData[firstSegment];
    
    if (!Array.isArray(segmentData) || segmentData.length === 0) {
      console.log('Invalid segment data: not an array or empty');
      return false;
    }

    // Validate band structure
    const firstBand = segmentData[0];
    const requiredBandFields = ['delinquencyBand', 'accountCount', 'totalExposure', 'total12MECL', 'averagePD', 'averageLGD'];
    
    for (const field of requiredBandFields) {
      if (firstBand[field] === undefined || firstBand[field] === null) {
        console.log(`Invalid band structure: missing ${field}`);
        return false;
      }
    }

    console.log('IFRS 7.35G data structure validation passed');
    return true;
  }

  /**
   * Handle AI chat interactions
   * POST /api/ai/chat
   */
  async handleChat(req, res) {
    try {
      const { message, reportData, context } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required for chat'
        });
      }

      const response = await this.aiService.handleChatMessage(message, reportData, context);

      res.json({
        success: true,
        data: response,
        message: 'Chat response generated successfully'
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Chat failed',
        error: error.message
      });
    }
  }

  /**
   * Analyze PD Comparison Report with AI
   * POST /api/ai/analyze-pd-comparison
   */
  async analyzePDComparisonReport(req, res) {
    try {
      const { reportData } = req.body;

      if (!reportData) {
        return res.status(400).json({
          success: false,
          message: 'Report data is required for AI analysis'
        });
      }

      // Validate report data structure
      if (!this.validatePDComparisonData(reportData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report data structure'
        });
      }

      const result = await this.aiService.analyzePDComparisonReport(reportData);

      if (result.success) {
        res.json({
          success: true,
          analysis: result.analysis,
          metrics: result.metrics,
          riskAlerts: result.riskAlerts
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'AI analysis failed',
          error: result.error
        });
      }

    } catch (error) {
      console.error('PD Comparison AI Analysis Error:', error);
      
      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Validate PD Comparison Report data structure
   */
  validatePDComparisonData(data) {
    if (!data) {
      console.log('Invalid data: data is null or undefined');
      return false;
    }

    // Check for required fields
    const requiredFields = ['comparisonMatrix', 'summaryStats', 'delinquencyBands'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        console.log(`Invalid data structure: missing ${field}`);
        return false;
      }
    }

    // Validate comparisonMatrix
    if (!Array.isArray(data.comparisonMatrix) || data.comparisonMatrix.length === 0) {
      console.log('Invalid comparisonMatrix: not an array or empty');
      return false;
    }

    // Check first segment structure
    const firstSegment = data.comparisonMatrix[0];
    const requiredSegmentFields = ['segment_name', 'delinquencyBands'];
    
    for (const field of requiredSegmentFields) {
      if (!firstSegment[field]) {
        console.log(`Invalid segment structure: missing ${field}`);
        return false;
      }
    }

    // Check first delinquency band structure
    if (!Array.isArray(firstSegment.delinquencyBands) || firstSegment.delinquencyBands.length === 0) {
      console.log('Invalid delinquencyBands: not an array or empty');
      return false;
    }

    const firstBand = firstSegment.delinquencyBands[0];
    const requiredBandFields = ['band_code', 'ecl_pd', 'term_structure_pd', 'pd_variance_percent'];
    
    for (const field of requiredBandFields) {
      if (firstBand[field] === undefined || firstBand[field] === null) {
        console.log(`Invalid band structure: missing ${field}`);
        return false;
      }
    }

    console.log('PD Comparison data structure validation passed');
    return true;
  }
}

module.exports = AIController;
