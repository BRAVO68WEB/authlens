'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select, TextArea } from '@/components/Input';
import { Alert } from '@/components/Alert';
import type { ProviderConfig, ProtocolType, GrantType } from '@/lib/types';
import { Plus, Trash2, Edit2, Globe, Upload, Key, Download } from 'lucide-react';
import { discoverFromIssuer } from '@/lib/oidc';
import { generateSPCertificate, fetchSAMLMetadata } from '@/lib/saml';
import { fetchLoginRadiusConfig } from '@/lib/loginradius';
import { toast } from 'sonner';

export default function ProvidersPage() {
  const { providers, addProvider, updateProvider, deleteProvider } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [certGenerating, setCertGenerating] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataUrl, setMetadataUrl] = useState('');
  const [lrFetching, setLrFetching] = useState(false);

  const [formData, setFormData] = useState<Partial<ProviderConfig>>({
    name: '',
    type: 'oidc',
    baseUrl: '',
    discoveryUrl: '',
    clientId: '',
    clientSecret: '',
    redirectUris: ['http://localhost:3000/callback/oidc'],
    scopes: ['openid', 'profile', 'email'],
    endpoints: {},
    advanced: {
      codeChallengeMethod: 'S256',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProvider(editingId, formData);
      setEditingId(null);
    } else {
      addProvider(formData as Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>);
      setIsAdding(false);
    }
    resetForm();
  };

  const handleEdit = (provider: ProviderConfig) => {
    setFormData(provider);
    setEditingId(provider.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      deleteProvider(id);
    }
  };

  const handleGenerateCertificate = async () => {
    setCertGenerating(true);
    try {
      const cert = await generateSPCertificate();
      setFormData({
        ...formData,
        saml: {
          ...formData.saml,
          privateKey: cert.privateKey,
          certificate: cert.certificate || formData.saml?.certificate,
          certificates: cert.certificate ? [cert.certificate, ...(formData.saml?.certificates || [])] : formData.saml?.certificates,
        },
      });
      toast.success('Certificate generated successfully!');
    } catch (error) {
      toast.error(`Failed to generate certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCertGenerating(false);
    }
  };

  const handleUploadCertificate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFormData({
          ...formData,
          saml: {
            ...formData.saml,
            certificate: content,
          },
        });
      };
      reader.readAsText(file);
    }
  };

  const handleFetchMetadata = async () => {
    if (!metadataUrl) {
      toast.warning('Please enter a metadata URL');
      return;
    }

    setMetadataLoading(true);
    try {
      const metadata = await fetchSAMLMetadata(metadataUrl);
      setFormData({
        ...formData,
        saml: {
          ...formData.saml,
          entityId: metadata.entityId || formData.saml?.entityId,
          ssoUrl: metadata.ssoUrl || formData.saml?.ssoUrl,
          sloUrl: metadata.sloUrl || formData.saml?.sloUrl,
          certificate: metadata.certificate || formData.saml?.certificate,
        },
      });
      toast.success('Metadata fetched and parsed successfully!');
    } catch (error) {
      toast.error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleDownloadPrivateKey = () => {
    if (!formData.saml?.privateKey) {
      toast.warning('No private key available');
      return;
    }
    const blob = new Blob([formData.saml.privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sp-private-key.pem';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCertificate = () => {
    if (!formData.saml?.certificates || formData.saml.certificates.length === 0) {
      toast.warning('No certificate available');
      return;
    }
    const blob = new Blob([formData.saml.certificates[0]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sp-certificate.pem';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'oidc',
      baseUrl: '',
      discoveryUrl: '',
      clientId: '',
      clientSecret: '',
      redirectUris: ['http://localhost:3000/callback/oidc'],
      scopes: ['openid', 'profile', 'email'],
      endpoints: {},
      advanced: {
        codeChallengeMethod: 'S256',
      },
      saml: undefined,
    });
    setDiscoveryError(null);
  };

  const handleDiscover = async () => {
    if (!formData.discoveryUrl) {
      setDiscoveryError('Please enter a discovery URL');
      return;
    }

    setDiscovering(true);
    setDiscoveryError(null);

    try {
      const discovery = await discoverFromIssuer(formData.discoveryUrl);
      setFormData({
        ...formData,
        endpoints: {
          authorizationUrl: discovery.authorization_endpoint,
          tokenUrl: discovery.token_endpoint,
          userinfoUrl: discovery.userinfo_endpoint,
          jwksUrl: discovery.jwks_uri,
          introspectionUrl: discovery.introspection_endpoint,
          revocationUrl: discovery.revocation_endpoint,
          deviceCodeUrl: discovery.device_authorization_endpoint,
          endSessionUrl: discovery.end_session_endpoint,
        },
        scopes: discovery.scopes_supported || formData.scopes,
        advanced: {
          ...formData.advanced,
          responseTypes: discovery.response_types_supported,
          grantTypes: discovery.grant_types_supported as GrantType[],
        },
      });
      setDiscoveryError(null);
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Identity Providers
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage your authentication providers and configurations
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4" />
            Add Provider
          </Button>
        )}
      </div>

      {isAdding && (
        <Card title={editingId ? 'Edit Provider' : 'Add New Provider'} className="mb-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Provider Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My OIDC Provider"
                required
              />

              <Select
                label="Protocol Type"
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as ProtocolType;
                  const updates: Partial<ProviderConfig> = {
                    ...formData,
                    type: newType
                  };

                  // Update redirect URI based on type
                  if (newType === 'oidc') {
                    updates.redirectUris = ['http://localhost:3000/callback/oidc'];
                  } else if (newType === 'oauth2') {
                    updates.redirectUris = ['http://localhost:3000/callback/oauth2'];
                  } else if (newType === 'saml') {
                    updates.redirectUris = [];
                    updates.saml = {
                      assertionConsumerServiceUrl: 'http://localhost:3000/api/saml/acs',
                    };
                  } else if (newType === 'loginradius') {
                    updates.redirectUris = [];
                    updates.loginradius = {
                      apiBaseUrl: 'https://api.loginradius.com',
                    };
                  }

                  setFormData(updates);
                }}
                options={[
                  { value: 'oidc', label: 'OIDC (OpenID Connect)' },
                  { value: 'oauth2', label: 'OAuth 2.0' },
                  { value: 'saml', label: 'SAML 2.0' },
                  { value: 'loginradius', label: 'LoginRadius CIAM API' },
                  { value: 'api', label: 'Standard API' },
                ]}
                required
              />
            </div>

            {formData.type === 'oidc' && (
              <>
                <div className="flex gap-4">
                  <Input
                    label="Discovery URL (issuer)"
                    value={formData.discoveryUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, discoveryUrl: e.target.value })
                    }
                    placeholder="https://accounts.google.com"
                    helperText="Enter the issuer URL for OIDC auto-discovery"
                    className="flex-1"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDiscover}
                      loading={discovering}
                      disabled={!formData.discoveryUrl}
                    >
                      <Globe className="w-4 h-4" />
                      Discover
                    </Button>
                  </div>
                </div>

                {discoveryError && (
                  <Alert variant="error" title="Discovery Failed">
                    {discoveryError}
                  </Alert>
                )}
              </>
            )}

            {(formData.type === 'oidc' || formData.type === 'oauth2' || formData.type === 'api') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Client ID"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="your-client-id"
                    required
                  />

                  <Input
                    label="Client Secret"
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, clientSecret: e.target.value })
                    }
                    placeholder="your-client-secret"
                    helperText="Optional for public clients"
                  />
                </div>

                <div>
                  <Input
                    label="Redirect URI"
                    value={formData.redirectUris?.[0] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, redirectUris: [e.target.value] })
                    }
                    placeholder="http://localhost:3000/callback/oidc"
                    required
                  />
                </div>
              </>
            )}

            {(formData.type === 'oidc' || formData.type === 'oauth2') && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Scopes (space-separated)
                </label>
                <Input
                  value={formData.scopes?.join(' ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scopes: e.target.value.split(' ').filter(Boolean),
                    })
                  }
                  placeholder="openid profile email"
                />
              </div>
            )}

            {formData.type === 'saml' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  SAML Configuration
                </h3>
                <Alert variant="info">
                  Configure your SAML Service Provider (SP) and Identity Provider (IdP) settings.
                </Alert>

                {/* Metadata Auto-Fetch */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-2">
                    Quick Setup: Import from Metadata URL
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      value={metadataUrl}
                      onChange={(e) => setMetadataUrl(e.target.value)}
                      placeholder="https://idp.example.com/metadata.xml"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleFetchMetadata}
                      loading={metadataLoading}
                      disabled={!metadataUrl}
                    >
                      <Download className="w-4 h-4" />
                      Fetch Metadata
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically populate Entity ID, SSO URL, SLO URL, and Certificate from IdP metadata
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Entity ID (SP)"
                    value={formData.saml?.entityId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        saml: {
                          ...formData.saml,
                          entityId: e.target.value,
                        },
                      })
                    }
                    placeholder="https://your-app.com/saml/metadata"
                    helperText="Your Service Provider's unique identifier"
                    required
                  />
                  <Input
                    label="SSO URL (IdP)"
                    value={formData.saml?.ssoUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        saml: {
                          ...formData.saml,
                          ssoUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://idp.example.com/saml/sso"
                    helperText="Identity Provider's Single Sign-On URL"
                    required
                  />
                  <Input
                    label="Assertion Consumer Service URL (ACS)"
                    value={formData.saml?.assertionConsumerServiceUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        saml: {
                          ...formData.saml,
                          assertionConsumerServiceUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://your-app.com/saml/acs"
                    helperText="Where the IdP will send SAML responses"
                    required
                  />
                  <Input
                    label="Single Logout URL (Optional)"
                    value={formData.saml?.sloUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        saml: {
                          ...formData.saml,
                          sloUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://idp.example.com/saml/slo"
                    helperText="Identity Provider's Single Logout URL"
                  />
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      IdP Certificate (Optional)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="file"
                        accept=".pem,.crt,.cer"
                        onChange={handleUploadCertificate}
                        className="hidden"
                        id="cert-upload"
                      />
                      <label htmlFor="cert-upload" className="cursor-pointer">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload Certificate
                        </span>
                      </label>
                    </div>
                    <TextArea
                      value={formData.saml?.certificate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          saml: {
                            ...formData.saml,
                            certificate: e.target.value,
                          },
                        })
                      }
                      placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWgAwIBAgIJAKZ...&#10;-----END CERTIFICATE-----"
                      helperText="IdP's X.509 certificate for signature verification (paste or upload)"
                      rows={6}
                    />
                  </div>
                  {/* SP Certificate Generation */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-xs font-semibold text-foreground mb-2">
                      SP Certificate (for signing requests)
                    </h4>
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        onClick={handleGenerateCertificate}
                        loading={certGenerating}
                        variant="secondary"
                      >
                        <Key className="w-4 h-4" />
                        Generate New Certificate
                      </Button>
                      {formData.saml?.privateKey && (
                        <>
                          <Button
                            type="button"
                            onClick={handleDownloadPrivateKey}
                            variant="ghost"
                          >
                            <Download className="w-4 h-4" />
                            Download Private Key
                          </Button>
                          <Button
                            type="button"
                            onClick={handleDownloadCertificate}
                            variant="ghost"
                          >
                            <Download className="w-4 h-4" />
                            Download Certificate
                          </Button>
                        </>
                      )}
                    </div>
                    {formData.saml?.certificates && formData.saml.certificates.length > 0 && (
                      <div className="mt-2 p-2 bg-background rounded text-xs font-mono overflow-auto max-h-32">
                        {formData.saml.certificates[0].substring(0, 200)}...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate a certificate to sign SAML requests (required if &quot;Sign AuthnRequests&quot; is enabled)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="signRequests"
                        checked={formData.saml?.signRequests || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            saml: {
                              ...formData.saml,
                              signRequests: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="signRequests"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Sign AuthnRequests
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wantAssertionsSigned"
                        checked={formData.saml?.wantAssertionsSigned || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            saml: {
                              ...formData.saml,
                              wantAssertionsSigned: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="wantAssertionsSigned"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Require Signed Assertions
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : formData.type === 'loginradius' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  LoginRadius CIAM Configuration
                </h3>
                <Alert variant="info">
                  Configure your LoginRadius CIAM API credentials and endpoints.
                </Alert>

                {/* Auto-Fetch from Hosted Page */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-2">
                    Quick Setup: Fetch from Hosted Page URL
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      value={formData.loginradius?.hostedPageUrl || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loginradius: {
                            ...formData.loginradius,
                            hostedPageUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://your-app.hub.loginradius.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        const url = formData.loginradius?.hostedPageUrl;
                        if (!url) {
                          toast.warning('Please enter a hosted page URL');
                          return;
                        }
                        setLrFetching(true);
                        try {
                          const config = await fetchLoginRadiusConfig(url);
                          setFormData({
                            ...formData,
                            loginradius: {
                              ...formData.loginradius,
                              apiKey: config.apiKey || formData.loginradius?.apiKey,
                              tenantName: config.tenantName || formData.loginradius?.tenantName,
                              registrationFormSchema: config.registrationFormSchema || formData.loginradius?.registrationFormSchema,
                              // Only set SOTT if not already configured (long-lived token takes precedence)
                              sott: formData.loginradius?.sott || config.sott,
                              hostedPageUrl: url,
                            },
                          });
                          toast.success('Configuration fetched successfully!');
                        } catch (error) {
                          toast.error(`Failed to fetch config: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        } finally {
                          setLrFetching(false);
                        }
                      }}
                      loading={lrFetching}
                      disabled={!formData.loginradius?.hostedPageUrl}
                    >
                      <Download className="w-4 h-4" />
                      Fetch Config
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically extract APIKey, TenantName, Registration Form Schema, and SOTT token from hosted page
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="API Key"
                    value={formData.loginradius?.apiKey || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          apiKey: e.target.value,
                        },
                      })
                    }
                    placeholder="cb888eb9-5cc4-452f-a5ad-a918d3f03621"
                    helperText="Your LoginRadius API Key"
                    required
                  />
                  <Input
                    label="API Secret (Optional)"
                    value={formData.loginradius?.apiSecret || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          apiSecret: e.target.value,
                        },
                      })
                    }
                    placeholder="Your API Secret"
                    helperText="Optional API Secret for enhanced security"
                    type="password"
                  />
                  <Input
                    label="Hosted Page URL"
                    value={formData.loginradius?.hostedPageUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          hostedPageUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://your-app.hub.loginradius.com"
                    helperText="Your LoginRadius hosted page URL"
                  />
                  <Input
                    label="API Base URL"
                    value={formData.loginradius?.apiBaseUrl || 'https://api.loginradius.com'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          apiBaseUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://api.loginradius.com"
                    helperText="LoginRadius API base URL (default: https://api.loginradius.com)"
                  />
                  <Input
                    label="Tenant Name"
                    value={formData.loginradius?.tenantName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          tenantName: e.target.value,
                        },
                      })
                    }
                    placeholder="lrdemo2"
                    helperText="Your LoginRadius tenant/app name"
                  />
                  <TextArea
                    label="SOTT Token (Long-lived, Optional)"
                    value={formData.loginradius?.sott || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginradius: {
                          ...formData.loginradius,
                          sott: e.target.value,
                        },
                      })
                    }
                    placeholder="FnaJa5WGcvAKWMXgd5gBk58BolGGH736XA6k9dZNeIHlhNZgLGqnbZRXmigEEOJlx/Ki/1hivobVHfu0fsBePLcV3HpWMmIZA/2Ht5xkSoY=*ef68697a9022f4e99847d876a982da53"
                    helperText="Long-lived SOTT token for registration. If provided, will be used instead of fetching from hosted page."
                    rows={3}
                  />
                  {formData.loginradius?.registrationFormSchema && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        Registration Form Schema ({formData.loginradius.registrationFormSchema.length} fields)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Schema loaded from hosted page. Required fields will be shown in the registration form.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Endpoints
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Authorization URL"
                    value={formData.endpoints?.authorizationUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endpoints: {
                          ...formData.endpoints,
                          authorizationUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://provider.com/oauth2/authorize"
                  />
                  <Input
                    label="Token URL"
                    value={formData.endpoints?.tokenUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endpoints: {
                          ...formData.endpoints,
                          tokenUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://provider.com/oauth2/token"
                  />
                  <Input
                    label="UserInfo URL"
                    value={formData.endpoints?.userinfoUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endpoints: {
                          ...formData.endpoints,
                          userinfoUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://provider.com/oauth2/userinfo"
                  />
                  <Input
                    label="JWKS URL"
                    value={formData.endpoints?.jwksUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endpoints: {
                          ...formData.endpoints,
                          jwksUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://provider.com/.well-known/jwks.json"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-border">
              <Button type="submit">{editingId ? 'Update' : 'Add'} Provider</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {providers.length === 0 && !isAdding ? (
        <Card>
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-2">
              No providers configured
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Get started by adding your first identity provider
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              Add Provider
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {provider.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {provider.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {provider.discoveryUrl && (
                      <p>
                        <span className="font-medium">Discovery:</span> {provider.discoveryUrl}
                      </p>
                    )}
                    {provider.clientId && (
                      <p>
                        <span className="font-medium">Client ID:</span> {provider.clientId}
                      </p>
                    )}
                    {provider.redirectUris && provider.redirectUris.length > 0 && (
                      <p>
                        <span className="font-medium">Redirect URI:</span>{' '}
                        {provider.redirectUris[0]}
                      </p>
                    )}
                    {provider.scopes && provider.scopes.length > 0 && (
                      <p>
                        <span className="font-medium">Scopes:</span> {provider.scopes.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(provider)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(provider.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
