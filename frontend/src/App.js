import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated Background Component
const AnimatedBackground = () => {
  return (
    <div className="animated-background">
      <div className="grid-overlay"></div>
      <div className="particles">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${4 + Math.random() * 4}s`
          }}></div>
        ))}
      </div>
      <div className="floating-shapes">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`shape shape-${i % 3}`} style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 6}s`
          }}></div>
        ))}
      </div>
    </div>
  );
};

// Hero Section
const HeroSection = ({ onGetStarted }) => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            <span className="gradient-text">DegenomicsAI</span>
            <br />
            The Ultimate Tokenomics Design Platform
          </h1>
          <p className="hero-subtitle">
            Create professional, investor-ready tokenomics for any crypto project. 
            Powered by advanced AI to generate comprehensive token distribution models, 
            vesting schedules, and economic analysis in minutes.
          </p>
          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-icon">🧠</div>
              <span>AI-Powered Tokenomics</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <span>Instant Generation</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <span>Professional Reports</span>
            </div>
          </div>
          <button 
            className="hero-cta-btn"
            onClick={onGetStarted}
            data-testid="get-started-btn"
          >
            <span>Design Your Tokenomics</span>
            <div className="btn-shimmer"></div>
          </button>
        </div>
        <div className="hero-visual">
          <div className="cyber-card">
            <div className="card-content">
              <div className="metric">
                <span className="metric-value">1000+</span>
                <span className="metric-label">Tokenomics Created</span>
              </div>
              <div className="metric">
                <span className="metric-value">$50M+</span>
                <span className="metric-label">Market Cap Designed</span>
              </div>
            </div>
            <div className="card-glow"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Tokenomics Form
const TokenomicsForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    project_type: 'DeFi',
    target_audience: 'retail',
    funding_goals: '',
    planned_raise_size: '',
    desired_utility: [],
    initial_supply: '100M',
    distribution_focus: 'balanced',
    launch_strategy: 'gradual',
    economic_model: 'standard',
    additional_info: ''
  });

  const projectTypes = [
    'DeFi', 'NFT', 'GameFi', 'L2 infra', 'DAO', 
    'Web3 Social', 'AI/ML Protocol', 'RWA (Real World Assets)', 
    'Cross-chain Bridge', 'Creator Economy', 'Privacy Protocol'
  ];
  const audiences = ['retail', 'institutional', 'both'];
  const utilities = [
    { id: 'staking', name: 'Staking', description: 'Token holders can stake to earn rewards and secure the network' },
    { id: 'governance', name: 'Governance', description: 'Vote on protocol decisions and parameter changes' },
    { id: 'marketplace currency', name: 'Marketplace Currency', description: 'Primary medium of exchange within the ecosystem' },
    { id: 'fee discounts', name: 'Fee Discounts', description: 'Reduced transaction fees for token holders' },
    { id: 'access rights', name: 'Access Rights', description: 'Premium features and exclusive content access' },
    { id: 'liquidity mining', name: 'Liquidity Mining', description: 'Earn rewards for providing liquidity to pools' },
    { id: 'yield farming', name: 'Yield Farming', description: 'Generate yield through various DeFi strategies' },
    { id: 'token burning', name: 'Token Burning', description: 'Deflationary mechanism to reduce total supply' },
    { id: 'revenue sharing', name: 'Revenue Sharing', description: 'Share in protocol revenue and fees' },
    { id: 'nft rewards', name: 'NFT Rewards', description: 'Exclusive NFTs and collectible rewards' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUtilityToggle = (utilityId) => {
    setFormData(prev => ({
      ...prev,
      desired_utility: prev.desired_utility.includes(utilityId)
        ? prev.desired_utility.filter(u => u !== utilityId)
        : [...prev.desired_utility, utilityId]
    }));
  };

  const getUtilityIcon = (utilityId) => {
    const icons = {
      'staking': '🔒',
      'governance': '🗳️',
      'marketplace currency': '💰',
      'fee discounts': '💸',
      'access rights': '🎫',
      'liquidity mining': '⛏️',
      'yield farming': '🌾',
      'token burning': '🔥',
      'revenue sharing': '💵',
      'nft rewards': '🎨'
    };
    return icons[utilityId] || '⚡';
  };

  const loadTemplate = (templateType) => {
    const templates = {
      'defi-yield': {
        project_name: 'YieldMax Protocol',
        project_type: 'DeFi',
        target_audience: 'both',
        funding_goals: 'Series A funding for advanced yield optimization',
        planned_raise_size: '$3M',
        desired_utility: ['staking', 'governance', 'revenue sharing', 'fee discounts'],
        initial_supply: '100M',
        distribution_focus: 'community-heavy',
        launch_strategy: 'gradual',
        economic_model: 'deflationary',
        additional_info: 'Focus on automated yield farming strategies with cross-chain capabilities'
      },
      'gamefi-p2e': {
        project_name: 'MetaPlay Arena',
        project_type: 'GameFi',
        target_audience: 'retail',
        funding_goals: 'Community launch with play-to-earn mechanics',
        planned_raise_size: '$1.5M',
        desired_utility: ['staking', 'marketplace currency', 'nft rewards', 'governance'],
        initial_supply: '1B',
        distribution_focus: 'community-heavy',
        launch_strategy: 'fair-launch',
        economic_model: 'dual-token',
        additional_info: 'Gaming platform with tournament rewards and NFT marketplace integration'
      },
      'dao-governance': {
        project_name: 'DecentralGov DAO',
        project_type: 'DAO',
        target_audience: 'institutional',
        funding_goals: 'Initial governance token distribution',
        planned_raise_size: '$2M',
        desired_utility: ['governance', 'staking', 'fee discounts', 'access rights'],
        initial_supply: '100M',
        distribution_focus: 'balanced',
        launch_strategy: 'airdrop',
        economic_model: 'standard',
        additional_info: 'Decentralized governance platform for protocol decision making'
      },
      'nft-marketplace': {
        project_name: 'ArtChain Marketplace',
        project_type: 'NFT',
        target_audience: 'both',
        funding_goals: 'Marketplace development and creator incentives',
        planned_raise_size: '$2.5M',
        desired_utility: ['marketplace currency', 'staking', 'fee discounts', 'governance'],
        initial_supply: '500M',
        distribution_focus: 'balanced',
        launch_strategy: 'ido',
        economic_model: 'deflationary',
        additional_info: 'NFT marketplace with creator royalties and community curation'
      }
    };

    if (templates[templateType]) {
      setFormData(templates[templateType]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2 className="form-title">DegenomicsAI Builder</h2>
        <p className="form-subtitle">Tell us about your project to generate custom tokenomics designed for success</p>
      </div>

      {/* Quick Templates Section */}
      <div className="template-section">
        <h3 className="template-title">🚀 DegenomicsAI Templates</h3>
        <p className="template-description">
          Launch faster with battle-tested tokenomics templates from successful crypto projects
        </p>
        <div className="template-grid">
          <button 
            type="button" 
            className="template-btn"
            onClick={() => loadTemplate('defi-yield')}
            data-testid="template-defi-yield"
          >
            DeFi Yield Platform
          </button>
          <button 
            type="button" 
            className="template-btn"
            onClick={() => loadTemplate('gamefi-p2e')}
            data-testid="template-gamefi-p2e"
          >
            GameFi Play-to-Earn
          </button>
          <button 
            type="button" 
            className="template-btn"
            onClick={() => loadTemplate('dao-governance')}
            data-testid="template-dao-governance"
          >
            DAO Governance
          </button>
          <button 
            type="button" 
            className="template-btn"
            onClick={() => loadTemplate('nft-marketplace')}
            data-testid="template-nft-marketplace"
          >
            NFT Marketplace
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="tokenomics-form" data-testid="tokenomics-form">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
              className="form-input"
              placeholder="Enter your project name"
              data-testid="project-name-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Type</label>
            <select
              value={formData.project_type}
              onChange={(e) => handleInputChange('project_type', e.target.value)}
              className="form-select"
              data-testid="project-type-select"
            >
              {projectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Audience</label>
            <select
              value={formData.target_audience}
              onChange={(e) => handleInputChange('target_audience', e.target.value)}
              className="form-select"
              data-testid="target-audience-select"
            >
              {audiences.map(audience => (
                <option key={audience} value={audience}>
                  {audience.charAt(0).toUpperCase() + audience.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Funding Goals</label>
            <input
              type="text"
              value={formData.funding_goals}
              onChange={(e) => handleInputChange('funding_goals', e.target.value)}
              className="form-input"
              placeholder="e.g., Seed round, Series A, Community launch"
              data-testid="funding-goals-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Planned Raise Size (Optional)</label>
            <input
              type="text"
              value={formData.planned_raise_size}
              onChange={(e) => handleInputChange('planned_raise_size', e.target.value)}
              className="form-input"
              placeholder="e.g., $500K, $2M, $10M"
              data-testid="raise-size-input"
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Token Utilities & Features</label>
            <p className="utility-description">Select the utilities your token will provide to create value and drive adoption:</p>
            
            <div className="utilities-categories">
              <div className="utility-category">
                <h4 className="category-title">🏦 Financial Features</h4>
                <div className="category-utilities">
                  {utilities.filter(u => ['staking', 'revenue sharing', 'fee discounts', 'yield farming', 'liquidity mining'].includes(u.id)).map(utility => (
                    <div key={utility.id} className="utility-card">
                      <button
                        type="button"
                        onClick={() => handleUtilityToggle(utility.id)}
                        className={`utility-btn-enhanced ${formData.desired_utility.includes(utility.id) ? 'active' : ''}`}
                        data-testid={`utility-${utility.id.replace(' ', '-')}`}
                      >
                        <div className="utility-header">
                          <span className="utility-icon">{getUtilityIcon(utility.id)}</span>
                          <span className="utility-name">{utility.name}</span>
                          {formData.desired_utility.includes(utility.id) && (
                            <span className="utility-checkmark">✓</span>
                          )}
                        </div>
                        <p className="utility-desc">{utility.description}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="utility-category">
                <h4 className="category-title">🗳️ Governance & Access</h4>
                <div className="category-utilities">
                  {utilities.filter(u => ['governance', 'access rights'].includes(u.id)).map(utility => (
                    <div key={utility.id} className="utility-card">
                      <button
                        type="button"
                        onClick={() => handleUtilityToggle(utility.id)}
                        className={`utility-btn-enhanced ${formData.desired_utility.includes(utility.id) ? 'active' : ''}`}
                        data-testid={`utility-${utility.id.replace(' ', '-')}`}
                      >
                        <div className="utility-header">
                          <span className="utility-icon">{getUtilityIcon(utility.id)}</span>
                          <span className="utility-name">{utility.name}</span>
                          {formData.desired_utility.includes(utility.id) && (
                            <span className="utility-checkmark">✓</span>
                          )}
                        </div>
                        <p className="utility-desc">{utility.description}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="utility-category">
                <h4 className="category-title">💱 Marketplace & Economy</h4>
                <div className="category-utilities">
                  {utilities.filter(u => ['marketplace currency', 'nft rewards', 'token burning'].includes(u.id)).map(utility => (
                    <div key={utility.id} className="utility-card">
                      <button
                        type="button"
                        onClick={() => handleUtilityToggle(utility.id)}
                        className={`utility-btn-enhanced ${formData.desired_utility.includes(utility.id) ? 'active' : ''}`}
                        data-testid={`utility-${utility.id.replace(' ', '-')}`}
                      >
                        <div className="utility-header">
                          <span className="utility-icon">{getUtilityIcon(utility.id)}</span>
                          <span className="utility-name">{utility.name}</span>
                          {formData.desired_utility.includes(utility.id) && (
                            <span className="utility-checkmark">✓</span>
                          )}
                        </div>
                        <p className="utility-desc">{utility.description}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="utility-summary">
              <span className="summary-text">
                Selected: {formData.desired_utility.length} utilities
              </span>
              {formData.desired_utility.length > 0 && (
                <div className="selected-utilities">
                  {formData.desired_utility.map(utilityId => {
                    const utility = utilities.find(u => u.id === utilityId);
                    return utility ? (
                      <span key={utilityId} className="selected-tag">
                        {getUtilityIcon(utilityId)} {utility.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="advanced-options">
            <h3 className="advanced-title">Advanced Parameters (Optional)</h3>
            <div className="advanced-grid">
              <div className="form-group">
                <label className="form-label">Initial Token Supply</label>
                <select
                  value={formData.initial_supply || '100M'}
                  onChange={(e) => handleInputChange('initial_supply', e.target.value)}
                  className="form-select"
                  data-testid="initial-supply-select"
                >
                  <option value="10M">10 Million</option>
                  <option value="100M">100 Million</option>
                  <option value="1B">1 Billion</option>
                  <option value="10B">10 Billion</option>
                  <option value="custom">Custom Amount</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Token Distribution Focus</label>
                <select
                  value={formData.distribution_focus || 'balanced'}
                  onChange={(e) => handleInputChange('distribution_focus', e.target.value)}
                  className="form-select"
                  data-testid="distribution-focus-select"
                >
                  <option value="balanced">Balanced Distribution</option>
                  <option value="community-heavy">Community Focused</option>
                  <option value="development-heavy">Development Heavy</option>
                  <option value="investor-friendly">Investor Friendly</option>
                  <option value="team-conservative">Team Conservative</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Launch Strategy</label>
                <select
                  value={formData.launch_strategy || 'gradual'}
                  onChange={(e) => handleInputChange('launch_strategy', e.target.value)}
                  className="form-select"
                  data-testid="launch-strategy-select"
                >
                  <option value="fair-launch">Fair Launch</option>
                  <option value="gradual">Gradual Release</option>
                  <option value="ido">IDO/Public Sale</option>
                  <option value="private-first">Private Sale First</option>
                  <option value="airdrop">Community Airdrop</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Economic Model</label>
                <select
                  value={formData.economic_model || 'standard'}
                  onChange={(e) => handleInputChange('economic_model', e.target.value)}
                  className="form-select"
                  data-testid="economic-model-select"
                >
                  <option value="standard">Standard Model</option>
                  <option value="deflationary">Deflationary (Token Burn)</option>
                  <option value="inflationary">Inflationary (Rewards)</option>
                  <option value="dual-token">Dual Token System</option>
                  <option value="rebase">Rebase Mechanism</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Additional Information (Optional)</label>
            <textarea
              value={formData.additional_info}
              onChange={(e) => handleInputChange('additional_info', e.target.value)}
              className="form-textarea"
              placeholder="Any specific requirements or constraints..."
              rows="4"
              data-testid="additional-info-textarea"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="submit-btn"
          data-testid="generate-tokenomics-btn"
        >
          {isLoading ? (
            <div className="loading-spinner">Generating...</div>
          ) : (
            <>
              <span>Generate Tokenomics</span>
              <div className="btn-glow"></div>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// Results Display
const TokenomicsResults = ({ results, onPayment, onDownloadPDF }) => {
  const { project, chart_data } = results;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`${label}: ${payload[0].value}%`}</p>
          <p className="tooltip-value">{`${payload[0].payload.tokens.toLocaleString()} tokens`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="results-container" data-testid="tokenomics-results">
      <div className="results-header">
        <h2 className="results-title">{project.project_name}</h2>
        <div className="results-actions">
          <button 
            className="action-btn primary"
            onClick={onPayment}
            data-testid="proceed-payment-btn"
          >
            Get Full Report ($79)
          </button>
        </div>
      </div>

      <div className="results-grid">
        {/* Token Distribution Chart */}
        <div className="result-card">
          <h3 className="card-title">Token Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chart_data}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#00FFA3"
                  strokeWidth={2}
                >
                  {chart_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {chart_data.map((item, index) => (
                <div key={index} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span>{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Allocation Details */}
        <div className="result-card">
          <h3 className="card-title">Allocation Breakdown</h3>
          <div className="allocation-list">
            {project.allocations.map((allocation, index) => (
              <div key={index} className="allocation-item">
                <div className="allocation-header">
                  <span className="allocation-category">{allocation.category}</span>
                  <span className="allocation-percentage">{allocation.percentage}%</span>
                </div>
                <div className="allocation-details">
                  <p className="allocation-tokens">{allocation.tokens.toLocaleString()} tokens</p>
                  <p className="allocation-description">{allocation.description}</p>
                  <div className="vesting-info">
                    <span className="vesting-label">Vesting:</span>
                    <span className="vesting-schedule">{allocation.vesting_schedule}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative */}
        <div className="result-card full-width">
          <h3 className="card-title">Economic Model</h3>
          <div className="narrative-content">
            <p>{project.narrative}</p>
          </div>
        </div>

        {/* Risks and Comparables */}
        <div className="result-card">
          <h3 className="card-title">Key Risks</h3>
          <ul className="risk-list">
            {project.risks.map((risk, index) => (
              <li key={index} className="risk-item">{risk}</li>
            ))}
          </ul>
        </div>

        <div className="result-card">
          <h3 className="card-title">Comparable Projects</h3>
          <div className="comparable-list">
            {project.comparable_projects.map((project, index) => (
              <span key={index} className="comparable-tag">{project}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment Component
const PaymentSection = ({ packageId = 'basic', onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const packages = {
    basic: { amount: 79, name: 'Basic Package', features: ['PDF Report', 'Charts', 'Token Distribution'] },
    pro: { amount: 199, name: 'Pro Package', features: ['Multiple Iterations', 'Advanced Analysis', 'Benchmark Comparisons'] },
    premium: { amount: 499, name: 'Premium Package', features: ['Investor Deck', 'Smart Contract Template', 'Consultation Call'] }
  };

  const initiatePayment = async () => {
    setIsProcessing(true);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(`${API}/payments/checkout/session`, null, {
        params: {
          package_id: packageId,
          origin_url: originUrl
        }
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initialization failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPackage = packages[packageId] || packages.basic;

  return (
    <div className="payment-section">
      <div className="payment-card">
        <h3 className="payment-title">Complete Your Purchase</h3>
        <div className="package-details">
          <h4 className="package-name">{selectedPackage.name}</h4>
          <div className="package-price">${selectedPackage.amount}</div>
          <ul className="package-features">
            {selectedPackage.features.map((feature, index) => (
              <li key={index} className="feature-item">
                <span className="feature-check">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={initiatePayment}
          disabled={isProcessing}
          className="payment-btn"
          data-testid="payment-btn"
        >
          {isProcessing ? 'Processing...' : `Pay $${selectedPackage.amount}`}
        </button>
      </div>
    </div>
  );
};

// Success Page
const SuccessPage = () => {
  const [paymentStatus, setPaymentStatus] = useState('checking');
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const checkPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    
    if (attempts >= maxAttempts) {
      setPaymentStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        setPaymentStatus('success');
      } else if (response.data.status === 'expired') {
        setPaymentStatus('failed');
      } else {
        // Continue polling
        setTimeout(() => checkPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus('error');
    }
  };

  return (
    <div className="success-page">
      <div className="success-content">
        {paymentStatus === 'checking' && (
          <div className="status-message">
            <div className="loading-spinner"></div>
            <h2>Processing Payment...</h2>
            <p>Please wait while we verify your payment.</p>
          </div>
        )}
        
        {paymentStatus === 'success' && (
          <div className="status-message success">
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Thank you for your purchase. Your tokenomics report will be ready shortly.</p>
          </div>
        )}
        
        {paymentStatus === 'failed' && (
          <div className="status-message error">
            <div className="error-icon">✕</div>
            <h2>Payment Failed</h2>
            <p>Your payment could not be processed. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentStep, setCurrentStep] = useState('hero'); // hero, form, results, payment
  const [tokenomicsData, setTokenomicsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGetStarted = () => {
    setCurrentStep('form');
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/tokenomics/generate`, formData);
      setTokenomicsData(response.data);
      setCurrentStep('results');
    } catch (error) {
      console.error('Error generating tokenomics:', error);
      setError('Failed to generate tokenomics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = () => {
    setCurrentStep('payment');
  };

  const handleDownloadPDF = async () => {
    if (tokenomicsData?.project?.id) {
      window.open(`${API}/tokenomics/${tokenomicsData.project.id}/pdf`, '_blank');
    }
  };

  return (
    <div className="App">
      <AnimatedBackground />
      <BrowserRouter>
        <Routes>
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/" element={
            <main className="main-content">
              {currentStep === 'hero' && (
                <HeroSection onGetStarted={handleGetStarted} />
              )}
              
              {currentStep === 'form' && (
                <TokenomicsForm 
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                />
              )}
              
              {currentStep === 'results' && tokenomicsData && (
                <TokenomicsResults 
                  results={tokenomicsData}
                  onPayment={handlePayment}
                  onDownloadPDF={handleDownloadPDF}
                />
              )}
              
              {currentStep === 'payment' && (
                <PaymentSection onSuccess={() => setCurrentStep('hero')} />
              )}
              
              {error && (
                <div className="error-message" data-testid="error-message">
                  {error}
                </div>
              )}
            </main>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;