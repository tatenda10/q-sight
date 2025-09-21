// Simple test to verify AI service can be instantiated
console.log('Testing AI Service instantiation...');

try {
  const AIService = require('./services/aiService');
  const aiService = new AIService();
  console.log('✅ AI Service instantiated successfully');
  console.log('OpenAI API Key configured:', aiService.config.openai.apiKey ? 'Yes' : 'No');
  console.log('Model:', aiService.config.openai.model);
} catch (error) {
  console.error('❌ Error instantiating AI Service:', error.message);
  console.error('Stack:', error.stack);
}
