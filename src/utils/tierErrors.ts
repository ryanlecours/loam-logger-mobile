import type { ApolloError } from '@apollo/client';

function getErrorCode(error: ApolloError): string | undefined {
  return error.graphQLErrors?.[0]?.extensions?.code as string | undefined;
}

export function isTierLimitError(error: ApolloError): boolean {
  return getErrorCode(error) === 'TIER_LIMIT_EXCEEDED';
}

export function isComponentRestrictedError(error: ApolloError): boolean {
  return getErrorCode(error) === 'TIER_COMPONENT_RESTRICTED';
}

export function isDowngradeRequiredError(error: ApolloError): boolean {
  return getErrorCode(error) === 'DOWNGRADE_SELECTION_REQUIRED';
}

export function isTierError(error: ApolloError): boolean {
  return isTierLimitError(error) || isComponentRestrictedError(error) || isDowngradeRequiredError(error);
}

export function getTierErrorMessage(error: ApolloError): string {
  const code = getErrorCode(error);
  switch (code) {
    case 'TIER_LIMIT_EXCEEDED':
      return 'You\'ve reached the bike limit on your Free plan. Upgrade to Pro for unlimited bikes.';
    case 'TIER_COMPONENT_RESTRICTED':
      return 'This component type requires a Pro plan or a completed referral to track.';
    case 'DOWNGRADE_SELECTION_REQUIRED':
      return 'Please select which bike to keep before making changes.';
    default:
      return error.message;
  }
}
