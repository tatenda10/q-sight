# 🤖 AI-Powered ECL Analysis Setup

This guide will help you set up the AI-powered analysis for the Loss Allowance Report using OpenAI's GPT models.

## 🚀 Quick Setup

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-`)

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
# OpenAI Configuration
OPEN_AI_KEY=sk-your-actual-api-key-here

# Database Configuration (existing)
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name

# JWT Configuration (existing)
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Install Dependencies

The OpenAI package is already installed. If you need to reinstall:

```bash
cd server
npm install openai
```

### 4. Test the AI Service

Run the test script to verify everything works:

```bash
cd server
node test-ai.js
```

You should see output like:
```
🤖 Testing AI Service...

📊 Analyzing Loss Allowance Report...
✅ AI Analysis completed successfully!

📋 Analysis Summary:
==================

EXECUTIVE SUMMARY:
The portfolio shows significant risk deterioration with ECL increasing by 23.5%...

STAGE ANALYSIS:
Stage migration patterns indicate credit quality deterioration...
```

## 🔧 Configuration Options

Edit `server/config/aiConfig.js` to customize:

```javascript
module.exports = {
  openai: {
    model: 'gpt-4', // or 'gpt-3.5-turbo' for cost optimization
    temperature: 0.3, // Lower = more consistent, Higher = more creative
    maxTokens: 2000
  },
  analysis: {
    enableRiskAlerts: true,
    enablePredictiveInsights: true,
    enableRegulatoryCompliance: true,
    enableRecommendations: true
  }
};
```

## 📊 How It Works

### 1. Data Flow
```
Loss Allowance Report Data → AI Service → OpenAI GPT-4 → Structured Analysis → Frontend Display
```

### 2. AI Analysis Components
- **Executive Summary**: High-level portfolio health assessment
- **Stage Analysis**: IFRS 9 staging patterns and implications
- **ECL Movement Analysis**: Drivers of ECL changes
- **Risk Indicators**: Early warning signals and trends
- **Regulatory Compliance**: IFRS 9 adherence verification
- **Recommendations**: Actionable risk management advice
- **Conclusions**: Overall risk assessment and outlook

### 3. Risk Alerts
The AI automatically generates alerts for:
- Significant ECL increases (>20%)
- High Stage 3 concentration (>50% of total ECL)
- Unusual stage migration patterns
- Regulatory compliance issues

## 🎯 Usage

### Frontend Integration
The AI analysis panel is automatically integrated into the Loss Allowance Report. Users can:

1. Generate a Loss Allowance Report
2. Click "Analyze Report" button
3. View AI insights, alerts, and recommendations
4. Expand sections for detailed analysis

### API Endpoints

#### Analyze Loss Allowance Report
```http
POST /api/ai/analyze-loss-allowance
Content-Type: application/json

{
  "reportData": {
    "opening_balance": { ... },
    "closing_balance": { ... },
    "new_assets": { ... },
    // ... other report data
  }
}
```

#### Check AI Service Status
```http
GET /api/ai/status
```

## 💰 Cost Considerations

### OpenAI Pricing (as of 2024)
- **GPT-4**: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
- **GPT-3.5-turbo**: ~$0.001 per 1K input tokens, ~$0.002 per 1K output tokens

### Estimated Costs per Analysis
- **GPT-4**: ~$0.10-0.20 per analysis
- **GPT-3.5-turbo**: ~$0.01-0.02 per analysis

### Cost Optimization Tips
1. Use GPT-3.5-turbo for development/testing
2. Switch to GPT-4 for production
3. Implement rate limiting (already configured)
4. Cache analysis results for similar data

## 🔒 Security & Privacy

### Data Handling
- Report data is sent to OpenAI for analysis
- No sensitive customer data should be included
- Analysis results are stored temporarily in memory only
- No persistent storage of AI responses

### Best Practices
- Use aggregated/anonymized data only
- Implement proper authentication
- Monitor API usage and costs
- Regular security audits

## 🐛 Troubleshooting

### Common Issues

#### 1. "AI service is not available"
- Check if OPEN_AI_KEY environment variable is set correctly
- Verify internet connection
- Check OpenAI service status

#### 2. "Invalid report data structure"
- Ensure all required fields are present
- Check data format matches expected structure
- Validate stage data (1, 2, 3) exists

#### 3. "AI analysis failed"
- Check OpenAI API quota and billing
- Verify API key permissions
- Check server logs for detailed error messages

### Debug Mode
Enable debug mode by setting `NODE_ENV=development` to see raw AI responses.

## 🚀 Next Steps

### Phase 1: Current Implementation ✅
- [x] Loss Allowance Report AI analysis
- [x] Risk alerts and recommendations
- [x] Executive summary and insights

### Phase 2: Future Enhancements
- [ ] ECL Analysis Report AI integration
- [ ] PD Comparison Report AI analysis
- [ ] Dashboard AI insights
- [ ] Natural language queries
- [ ] Automated report generation

### Phase 3: Advanced Features
- [ ] Predictive analytics
- [ ] Real-time risk monitoring
- [ ] Custom AI models
- [ ] Integration with external data sources

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided test script
4. Contact the development team

---

**Note**: This AI integration is designed for banking risk management and follows IFRS 9 standards. Always validate AI recommendations with qualified risk professionals.
