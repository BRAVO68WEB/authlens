'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select, TextArea } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { checkClaim } from '@/lib/jwt';
import type { ClaimRule, ClaimRuleOperator } from '@/lib/types';
import { Plus, Trash2, Play, CheckCircle, XCircle } from 'lucide-react';
import { generateId, parseJWT } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClaimsCheckerPage() {
  const [token, setToken] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [sourceType, setSourceType] = useState<'jwt' | 'json'>('jwt');
  const [rules, setRules] = useState<ClaimRule[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [payload, setPayload] = useState<any>(null);

  const operatorOptions = [
    { value: 'exists', label: 'Exists' },
    { value: 'not_exists', label: 'Not Exists' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'regex', label: 'Matches Regex' },
    { value: 'gt', label: 'Greater Than (>)' },
    { value: 'gte', label: 'Greater Than or Equal (>=)' },
    { value: 'lt', label: 'Less Than (<)' },
    { value: 'lte', label: 'Less Than or Equal (<=)' },
    { value: 'in', label: 'In Array' },
    { value: 'not_in', label: 'Not In Array' },
  ];

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        id: generateId(),
        claimPath: '',
        operator: 'exists',
        value: '',
        description: '',
        required: true,
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<ClaimRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleParseSource = () => {
    try {
      let data;

      if (sourceType === 'jwt') {
        if (!token) {
          toast.warning('Please paste a JWT token');
          return;
        }
        const parsed = parseJWT(token);
        if (!parsed) {
          toast.error('Invalid JWT format');
          return;
        }
        data = parsed.payload;
      } else {
        if (!jsonData) {
          toast.warning('Please paste JSON data');
          return;
        }
        data = JSON.parse(jsonData);
      }

      setPayload(data);
    } catch (error) {
      toast.error('Failed to parse: ' + String(error));
    }
  };

  const handleRunChecks = () => {
    if (!payload) {
      toast.warning('Please parse JWT or JSON data first');
      return;
    }

    if (rules.length === 0) {
      toast.warning('Please add at least one rule');
      return;
    }

    const checkResults = rules.map((rule) => checkClaim(payload, rule));
    setResults(checkResults);
  };

  const handleLoadCommonRules = () => {
    setRules([
      {
        id: generateId(),
        claimPath: 'sub',
        operator: 'exists',
        description: 'Subject (user ID) must exist',
        required: true,
      },
      {
        id: generateId(),
        claimPath: 'email',
        operator: 'exists',
        description: 'Email must exist',
        required: true,
      },
      {
        id: generateId(),
        claimPath: 'email_verified',
        operator: 'equals',
        value: true,
        description: 'Email must be verified',
        required: true,
      },
      {
        id: generateId(),
        claimPath: 'exp',
        operator: 'gt',
        value: Math.floor(Date.now() / 1000),
        description: 'Token must not be expired',
        required: true,
      },
    ]);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-1">
          Claim Checker
        </h1>
        <p className="text-xs text-muted-foreground">
          Validate JWT claims or JSON data with custom rules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Data Source">
            <div className="space-y-4">
              <Select
                label="Source Type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as 'jwt' | 'json')}
                options={[
                  { value: 'jwt', label: 'JWT Token' },
                  { value: 'json', label: 'JSON Data' },
                ]}
              />

              {sourceType === 'jwt' ? (
                <TextArea
                  label="JWT Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows={6}
                />
              ) : (
                <TextArea
                  label="JSON Data"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='{"sub": "123", "email": "user@example.com", ...}'
                  rows={6}
                />
              )}

              <Button onClick={handleParseSource}>
                Parse {sourceType === 'jwt' ? 'JWT' : 'JSON'}
              </Button>
            </div>
          </Card>

          {payload && (
            <Card title="Parsed Data">
              <CodeBlock code={JSON.stringify(payload, null, 2)} language="json" maxHeight="300px" />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Validation Rules">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {rules.length} rule(s)
                </span>
                <div className="flex gap-2">
                  <Button onClick={handleLoadCommonRules} size="sm" variant="secondary">
                    Load Common Rules
                  </Button>
                  <Button onClick={handleAddRule} size="sm">
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </Button>
                </div>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rules defined. Click &quot;Add Rule&quot; or &quot;Load Common Rules&quot; to get started.
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="p-4 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Rule {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Input
                        label="Claim Path"
                        value={rule.claimPath}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { claimPath: e.target.value })
                        }
                        placeholder="e.g., email, address.country"
                      />

                      <Select
                        label="Operator"
                        value={rule.operator}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, {
                            operator: e.target.value as ClaimRuleOperator,
                          })
                        }
                        options={operatorOptions}
                      />

                      {!['exists', 'not_exists'].includes(rule.operator) && (
                        <Input
                          label="Expected Value"
                          value={String(rule.value || '')}
                          onChange={(e) => {
                            let value: any = e.target.value;
                            // Try to parse as number or boolean
                            if (value === 'true') value = true;
                            else if (value === 'false') value = false;
                            else if (!isNaN(Number(value)) && value !== '') value = Number(value);
                            handleUpdateRule(rule.id, { value });
                          }}
                          placeholder="Expected value"
                        />
                      )}

                      <Input
                        label="Description (Optional)"
                        value={rule.description || ''}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { description: e.target.value })
                        }
                        placeholder="What this rule checks"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleRunChecks}
                disabled={!payload || rules.length === 0}
                className="w-full"
              >
                <Play className="w-4 h-4" />
                Run Validation
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {results.length > 0 && (
        <Card title="Validation Results" className="mt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-status-success">
                  {results.filter((r) => r.passed).length}
                </p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-status-error">
                  {results.filter((r) => !r.passed).length}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-lg font-medium">
                  {results.every((r) => r.passed) ? (
                    <span className="text-status-success">All checks passed</span>
                  ) : (
                    <span className="text-status-error">Some checks failed</span>
                  )}
                </p>
              </div>
            </div>

            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  result.passed
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.passed ? (
                    <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground mb-1">
                      {result.claimPath} ({result.operator})
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {result.message}
                    </p>
                    {result.actualValue !== undefined && (
                      <div className="text-xs space-y-1">
                        <div className="flex gap-2">
                          <span className="text-xs font-medium">Actual:</span>
                          <span className="font-mono break-all">
                            {typeof result.actualValue === 'object'
                              ? JSON.stringify(result.actualValue)
                              : String(result.actualValue)}
                          </span>
                        </div>
                        {result.expectedValue !== undefined && (
                          <div className="flex gap-2">
                            <span className="text-xs font-medium">Expected:</span>
                            <span className="font-mono break-all">
                              {typeof result.expectedValue === 'object'
                                ? JSON.stringify(result.expectedValue)
                                : String(result.expectedValue)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
