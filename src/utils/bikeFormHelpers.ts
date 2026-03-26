import type { SpokesComponent, SpokesComponents } from '../hooks/useOnboarding';
import type { SpokesComponentInput, SpokesComponentsInput } from '../graphql/generated';

/**
 * Convert a single 99spokes component to GraphQL SpokesComponentInput.
 */
export function toSpokesInput(
  comp: SpokesComponent | null | undefined
): SpokesComponentInput | null {
  if (!comp) return null;
  const maker = comp.maker || comp.make;
  if (!maker && !comp.model) return null;
  return {
    maker: maker || null,
    model: comp.model || null,
    description: comp.description || null,
    kind: comp.kind || null,
  };
}

/**
 * Build spokesComponents input from 99spokes bike component data.
 * Filters out null entries to reduce payload size.
 */
export function buildSpokesComponentsInput(
  components: SpokesComponents | null | undefined
): SpokesComponentsInput | null {
  if (!components) return null;

  const entries: [string, SpokesComponentInput | null][] = [
    ['fork', toSpokesInput(components.fork)],
    ['rearShock', toSpokesInput(components.rearShock || components.shock)],
    ['brakes', toSpokesInput(components.brakes)],
    ['rearDerailleur', toSpokesInput(components.rearDerailleur)],
    ['crank', toSpokesInput(components.crank)],
    ['cassette', toSpokesInput(components.cassette)],
    ['chain', toSpokesInput(components.chain)],
    ['wheels', toSpokesInput(components.wheels)],
    ['rims', toSpokesInput(components.rims)],
    ['tires', toSpokesInput(components.tires)],
    ['stem', toSpokesInput(components.stem)],
    ['handlebar', toSpokesInput(components.handlebar)],
    ['saddle', toSpokesInput(components.saddle)],
    ['seatpost', toSpokesInput(components.seatpost || components.dropper)],
    ['headset', toSpokesInput(components.headset)],
    ['bottomBracket', toSpokesInput(components.bottomBracket)],
  ];

  const filtered = Object.fromEntries(
    entries.filter(([, v]) => v !== null)
  ) as SpokesComponentsInput;

  return Object.keys(filtered).length > 0 ? filtered : null;
}
