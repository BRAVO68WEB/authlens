'use client';

import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';

export default function RequestBuilderPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Request Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Build and save custom HTTP requests
        </p>
      </div>

      <Card>
        <Alert variant="info" title="Redirect">
          Use the API Testing page under Flows for making custom HTTP requests.
        </Alert>
      </Card>
    </div>
  );
}

