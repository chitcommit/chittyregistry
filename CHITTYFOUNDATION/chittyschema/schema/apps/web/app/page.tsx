'use client';

import { useState, useEffect } from 'react';
import { ChittySchemaClient } from '@chittychain/schema-client';
import { AutoDeploymentDetector, DeploymentTarget } from '../lib/auto-deploy';

interface QuickAction {
  title: string;
  description: string;
  platform: string;
  entities: string[];
  icon: string;
  gradient: string;
}

const quickActions: QuickAction[] = [
  {
    title: "Legal Practice Database",
    description: "Complete law firm management system with cases, clients, and compliance",
    platform: "postgresql",
    entities: ["people", "cases", "evidence", "authorities", "financial_transactions"],
    icon: "⚖️",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    title: "Notion Legal Workspace",
    description: "Legal databases in Notion with templates and automation",
    platform: "notion",
    entities: ["people", "cases", "evidence"],
    icon: "📝",
    gradient: "from-purple-500 to-pink-600"
  },
  {
    title: "Evidence Management",
    description: "Secure evidence tracking with chain of custody",
    platform: "postgresql",
    entities: ["evidence", "people", "events", "authorities"],
    icon: "🔐",
    gradient: "from-green-500 to-blue-600"
  },
  {
    title: "Compliance Platform",
    description: "GDPR, HIPAA, and regulatory compliance management",
    platform: "postgresql",
    entities: ["people", "authorities", "events"],
    icon: "✅",
    gradient: "from-orange-500 to-red-600"
  }
];

export default function SchemaHomePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [chittyId, setChittyId] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPlatform, setCustomPlatform] = useState('postgresql');
  const [customEntities, setCustomEntities] = useState<string[]>(['people']);
  const [deploymentTargets, setDeploymentTargets] = useState<DeploymentTarget[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(true);

  const entityOptions = [
    { id: 'people', label: 'People', description: 'Individuals, organizations, legal entities' },
    { id: 'places', label: 'Places', description: 'Locations, addresses, jurisdictions' },
    { id: 'things', label: 'Things', description: 'Assets, documents, physical items' },
    { id: 'events', label: 'Events', description: 'Incidents, meetings, proceedings' },
    { id: 'authorities', label: 'Authorities', description: 'Laws, regulations, precedents' },
    { id: 'financial_transactions', label: 'Financial', description: 'Payments, billing, expenses' }
  ];

  // Detect deployment targets on component mount
  useEffect(() => {
    AutoDeploymentDetector.detectTargets().then(setDeploymentTargets);
  }, []);

  const platformOptions = [
    { id: 'postgresql', label: 'PostgreSQL', description: 'Production-ready SQL database' },
    { id: 'mysql', label: 'MySQL', description: 'Popular open-source database' },
    { id: 'sqlite', label: 'SQLite', description: 'Lightweight embedded database' },
    { id: 'notion', label: 'Notion', description: 'Collaborative workspace' },
    { id: 'airtable', label: 'Airtable', description: 'Spreadsheet-database hybrid' }
  ];

  const handleQuickGenerate = async (action: QuickAction) => {
    if (!chittyId.trim()) {
      alert('Please enter your ChittyID to continue');
      return;
    }

    setIsGenerating(true);
    setSelectedAction(action);

    try {
      const client = new ChittySchemaClient({
        apiKey: 'auto-detect', // Will use ChittyID verification
        baseUrl: 'https://schema.chitty.cc/api'
      });

      const schema = await client.generateSchema({
        platform: action.platform as any,
        entities: action.entities,
        customizations: {
          includeGDPR: true,
          includeFinancial: action.entities.includes('financial_transactions'),
          auditTrail: 'comprehensive',
          chittyId: chittyId
        }
      });

      setGeneratedSchema(schema);

      // Auto-deploy if enabled and targets detected
      if (autoDeployEnabled && deploymentTargets.length > 0) {
        await handleAutoDeployment(schema, action.platform);
      }
    } catch (error) {
      console.error('Schema generation failed:', error);
      alert('Schema generation failed. Please check your ChittyID and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomGenerate = async () => {
    if (!chittyId.trim()) {
      alert('Please enter your ChittyID to continue');
      return;
    }

    if (customEntities.length === 0) {
      alert('Please select at least one entity type');
      return;
    }

    setIsGenerating(true);

    try {
      const client = new ChittySchemaClient({
        apiKey: 'auto-detect',
        baseUrl: 'https://schema.chitty.cc/api'
      });

      const schema = await client.generateSchema({
        platform: customPlatform as any,
        entities: customEntities,
        customizations: {
          includeGDPR: true,
          includeFinancial: customEntities.includes('financial_transactions'),
          auditTrail: 'comprehensive',
          chittyId: chittyId
        }
      });

      setGeneratedSchema(schema);
      setShowCustomForm(false);
    } catch (error) {
      console.error('Custom schema generation failed:', error);
      alert('Schema generation failed. Please check your ChittyID and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleEntity = (entityId: string) => {
    setCustomEntities(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleAutoDeployment = async (schema: any, preferredPlatform?: string) => {
    setIsDeploying(true);
    try {
      const result = await AutoDeploymentDetector.smartDeploy(schema, preferredPlatform);
      setDeploymentResult(result);
    } catch (error) {
      console.error('Auto-deployment failed:', error);
      setDeploymentResult({
        success: false,
        message: `Auto-deployment failed: ${error.message}`,
        target: { platform: 'unknown', provider: 'none', detected: false, confidence: 0 }
      });
    } finally {
      setIsDeploying(false);
    }
  };

  if (generatedSchema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              {deploymentResult?.success ? '🚀 Schema Generated & Deployed!' : '✅ Schema Generated Successfully!'}
            </h1>
            <p className="text-xl text-purple-300">
              {deploymentResult?.success
                ? 'Your legal database is ready and deployed'
                : 'Your ChittyChain legal database schema is ready'
              }
            </p>
          </div>

          {/* Deployment Status */}
          {isDeploying && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-lg font-semibold">Auto-deploying to detected targets...</span>
              </div>
            </div>
          )}

          {/* Deployment Result */}
          {deploymentResult && !isDeploying && (
            <div className={`${deploymentResult.success ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} border rounded-xl p-6 mb-6`}>
              <h3 className="text-xl font-semibold mb-3">
                {deploymentResult.success ? '🎉 Deployment Successful' : '⚠️ Deployment Issue'}
              </h3>
              <p className="mb-4">{deploymentResult.message}</p>
              {deploymentResult.target.detected && (
                <p className="text-sm opacity-80 mb-3">
                  Deployed to: {deploymentResult.target.provider} ({deploymentResult.target.platform})
                </p>
              )}
              {deploymentResult.nextSteps && (
                <div>
                  <strong>Next Steps:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {deploymentResult.nextSteps.map((step: string, i: number) => (
                      <li key={i} className="text-sm opacity-90">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Schema Details</h3>
                <div className="space-y-2 text-purple-200">
                  <p><strong>Platform:</strong> {generatedSchema.platform}</p>
                  <p><strong>Entities:</strong> {generatedSchema.entities.join(', ')}</p>
                  <p><strong>Tables:</strong> {generatedSchema.metadata.totalTables}</p>
                  <p><strong>Created:</strong> {new Date(generatedSchema.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-3">
                  <a
                    href={generatedSchema.downloadUrl}
                    className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-center transition-colors"
                  >
                    📥 Download SQL Files
                  </a>
                  {generatedSchema.previewUrl && (
                    <a
                      href={generatedSchema.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center transition-colors"
                    >
                      👁️ View Schema Diagram
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setGeneratedSchema(null);
                      setSelectedAction(null);
                    }}
                    className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-center transition-colors"
                  >
                    🔄 Generate Another Schema
                  </button>
                </div>
              </div>
            </div>
          </div>

          {generatedSchema.platform === 'notion' && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">🚀 Deploy to Notion</h3>
              <p className="mb-4 text-purple-200">Ready to create your legal workspace in Notion? Copy your workspace integration and deploy instantly.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Notion Integration Token"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
                />
                <button className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors">
                  Deploy Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ChittyChain Schema
          </h1>
          <p className="text-xl text-purple-300 mb-8">
            Legal database schemas, generated instantly. Just enter your ChittyID and go.
          </p>

          {/* ChittyID Input */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={chittyId}
                onChange={(e) => setChittyId(e.target.value)}
                placeholder="Enter your ChittyID (e.g., user@domain.com)"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
              />
              <div className="absolute right-3 top-3 text-purple-400">
                🆔
              </div>
            </div>
            <p className="text-sm text-purple-300 mt-2">
              Don't have one? <a href="https://id.chitty.cc" className="text-purple-400 hover:text-purple-300">Get verified at id.chitty.cc</a>
            </p>
          </div>

          {/* Deployment Targets Indicator */}
          {deploymentTargets.length > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-green-400 text-lg">🎯</span>
                <span className="font-semibold">Auto-deployment ready!</span>
                <label className="flex items-center space-x-2 ml-auto">
                  <input
                    type="checkbox"
                    checked={autoDeployEnabled}
                    onChange={(e) => setAutoDeployEnabled(e.target.checked)}
                    className="text-green-500"
                  />
                  <span className="text-sm">Auto-deploy</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {deploymentTargets.map((target, i) => (
                  <span key={i} className="bg-green-500/20 px-2 py-1 rounded text-sm">
                    {target.provider} ({target.platform})
                  </span>
                ))}
              </div>
              <p className="text-sm text-green-300 mt-2">
                Schemas will be automatically deployed to detected databases and services
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <h2 className="text-2xl font-semibold mb-2">Generating Your Schema...</h2>
            <p className="text-purple-300">
              {selectedAction ? `Creating ${selectedAction.title}` : 'Processing your custom schema'}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {!isGenerating && (
          <>
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-8">Choose Your Legal Database</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <div
                    key={index}
                    className={`bg-gradient-to-r ${action.gradient} p-6 rounded-xl cursor-pointer transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl`}
                    onClick={() => handleQuickGenerate(action)}
                  >
                    <div className="text-4xl mb-3">{action.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                    <p className="text-white/90 mb-4">{action.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {action.entities.slice(0, 3).map((entity) => (
                        <span key={entity} className="bg-white/20 px-2 py-1 rounded text-sm">
                          {entity.replace('_', ' ')}
                        </span>
                      ))}
                      {action.entities.length > 3 && (
                        <span className="bg-white/20 px-2 py-1 rounded text-sm">
                          +{action.entities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Schema Option */}
            <div className="text-center">
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-xl transition-colors"
              >
                🛠️ Create Custom Schema
              </button>
            </div>

            {/* Custom Form */}
            {showCustomForm && (
              <div className="mt-8 bg-white/5 backdrop-blur-md rounded-xl p-6 max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold mb-6 text-center">Custom Schema Configuration</h3>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Platform</h4>
                    <div className="space-y-2">
                      {platformOptions.map((platform) => (
                        <label key={platform.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="platform"
                            value={platform.id}
                            checked={customPlatform === platform.id}
                            onChange={(e) => setCustomPlatform(e.target.value)}
                            className="text-purple-600"
                          />
                          <div>
                            <div className="font-medium">{platform.label}</div>
                            <div className="text-sm text-purple-300">{platform.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4">Entity Types</h4>
                    <div className="space-y-2">
                      {entityOptions.map((entity) => (
                        <label key={entity.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customEntities.includes(entity.id)}
                            onChange={() => toggleEntity(entity.id)}
                            className="text-purple-600"
                          />
                          <div>
                            <div className="font-medium">{entity.label}</div>
                            <div className="text-sm text-purple-300">{entity.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={handleCustomGenerate}
                    disabled={customEntities.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 px-8 py-3 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed"
                  >
                    Generate Custom Schema
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-purple-300">
          <p className="mb-2">
            Powered by ChittyOS Framework •
            <a href="https://docs.chitty.cc" className="text-purple-400 hover:text-purple-300 ml-1">Documentation</a> •
            <a href="https://github.com/chittyos" className="text-purple-400 hover:text-purple-300 ml-1">GitHub</a>
          </p>
          <p className="text-sm">
            Secure, compliant, production-ready legal database schemas
          </p>
        </div>
      </div>
    </div>
  );
}