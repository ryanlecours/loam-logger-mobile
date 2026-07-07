import type { ApolloError } from '@apollo/client';
import { UPSELL_COPY } from '../constants/upsellCopy';

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
      return `Your Free plan covers one bike. ${UPSELL_COPY.bikeLimit.body}`;
    case 'TIER_COMPONENT_RESTRICTED':
      return 'This component type requires a Pro plan to track.';
    case 'DOWNGRADE_SELECTION_REQUIRED':
      return 'Please select which bike to keep before making changes.';
    default:
      return error.message;
  }
}
