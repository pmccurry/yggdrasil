import type { LayoutPreset } from '../types/workspace';

interface PresetSlotDef {
  sizeWeight: number;
  row: 0 | 1;
}

interface PresetConfig {
  panelCount: number;
  hasSecondRow: boolean;
  defaultSlots: PresetSlotDef[];
}

export const PRESET_CONFIGS: Record<LayoutPreset, PresetConfig> = {
  'two-equal': {
    panelCount: 2,
    hasSecondRow: false,
    defaultSlots: [
      { sizeWeight: 1, row: 0 },
      { sizeWeight: 1, row: 0 },
    ],
  },
  'large-medium': {
    panelCount: 2,
    hasSecondRow: false,
    defaultSlots: [
      { sizeWeight: 2, row: 0 },
      { sizeWeight: 1, row: 0 },
    ],
  },
  'large-two-stacked': {
    panelCount: 3,
    hasSecondRow: true,
    defaultSlots: [
      { sizeWeight: 2, row: 0 },  // Panel A: large, spans both rows
      { sizeWeight: 1, row: 0 },  // Panel B: top-right
      { sizeWeight: 1, row: 1 },  // Panel C: bottom-right
    ],
  },
  'four-equal': {
    panelCount: 4,
    hasSecondRow: true,
    defaultSlots: [
      { sizeWeight: 1, row: 0 },
      { sizeWeight: 1, row: 0 },
      { sizeWeight: 1, row: 1 },
      { sizeWeight: 1, row: 1 },
    ],
  },
};

export const PRESET_ORDER: LayoutPreset[] = [
  'two-equal',
  'large-medium',
  'large-two-stacked',
  'four-equal',
];
