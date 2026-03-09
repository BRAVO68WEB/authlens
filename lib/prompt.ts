/**
 * OIDC Prompt parameter utilities (per OIDC Core spec §3.1.2.1 and §3.1.2.6)
 */

import type { OIDCPromptValue } from './types';

/**
 * Valid OIDC prompt values
 */
export const OIDC_PROMPT_VALUES: {
    value: OIDCPromptValue;
    label: string;
    description: string;
}[] = [
        {
            value: 'none',
            label: 'none',
            description:
                'No UI shown. Returns error if authentication or consent is required.',
        },
        {
            value: 'login',
            label: 'login',
            description:
                'Force reauthentication even if the user already has an active session.',
        },
        {
            value: 'consent',
            label: 'consent',
            description:
                'Force consent screen even if consent was previously granted.',
        },
        // {
        //     value: 'select_account',
        //     label: 'select_account',
        //     description:
        //         'Prompt the user to select an account (useful for multi-account users).',
        // },
    ];

/**
 * Validate and build a prompt query string per OIDC spec.
 * - `none` MUST NOT be combined with any other value.
 * - Values are space-delimited and case-sensitive.
 * - Returns undefined if no values are selected.
 */
export function buildPromptString(
    values: OIDCPromptValue[]
): string | undefined {
    if (!values || values.length === 0) return undefined;

    // Per OIDC Core spec §3.1.2.1: "none" must not be used with other values
    if (values.includes('none') && values.length > 1) {
        throw new Error(
            'prompt=none cannot be combined with other prompt values (per OIDC Core spec §3.1.2.1)'
        );
    }

    return values.join(' ');
}

/**
 * Map OIDC prompt-related error codes to human-readable explanations.
 * Returns null if the error code is not prompt-related.
 */
export function getPromptErrorExplanation(errorCode: string): string | null {
    const explanations: Record<string, string> = {
        login_required:
            'The user is not authenticated, but prompt=none was requested. ' +
            'The Authorization Server cannot display a login UI. ' +
            'Try again without prompt=none, or use prompt=login to force reauthentication.',
        consent_required:
            'The user has not granted consent for the requested scopes/claims, but prompt=none was requested. ' +
            'The Authorization Server cannot display a consent UI. ' +
            'Try again with prompt=consent or without prompt=none.',
        interaction_required:
            'The Authorization Server requires some form of user interaction (login, consent, or other), ' +
            'but prompt=none was requested. This is a generic error when the specific reason is not distinguished. ' +
            'Try again without prompt=none.',
        account_selection_required:
            'The user has multiple accounts and needs to select one, but prompt=none was requested. ' +
            'Try again with prompt=select_account or without prompt=none.',
    };
    return explanations[errorCode] || null;
}

/**
 * Check if an error code is a prompt-related OIDC error.
 */
export function isPromptRelatedError(errorCode: string): boolean {
    return [
        'login_required',
        'consent_required',
        'interaction_required',
        'account_selection_required',
    ].includes(errorCode);
}
