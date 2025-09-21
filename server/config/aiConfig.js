module.exports = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPEN_AI_KEY ,
    model: 'gpt-4', // or 'gpt-3.5-turbo' for cost optimization
    temperature: 0.3, // Lower temperature for more consistent, factual responses
    maxTokens: 2000
  },
  
  // AI Analysis Settings
  analysis: {
    enableRiskAlerts: true,
    enablePredictiveInsights: true,
    enableRegulatoryCompliance: true,
    enableRecommendations: true
  },
  
  // Rate Limiting for AI requests
  rateLimit: {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100
  }
};
