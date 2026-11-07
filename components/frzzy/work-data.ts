export interface CaseStudy {
  slug: string;
  title: string;
  type: string;
  category: 'motion' | '3d' | 'branding' | 'social' | 'digital' | 'campaign';
  idea: string;
  explored: string[];
  artType: 'grid' | 'orb' | 'bands' | 'bolts' | 'rings' | 'spark' | 'charge' | 'ground';
  ariaLabel: string;
}

export const CASES: Record<string, CaseStudy> = {
  'grid-runner': {
    slug: 'grid-runner',
    title: 'Grid Runner',
    type: 'Motion · Loop',
    category: 'motion',
    idea: 'A seamless run across an endless volt grid. One colour, one horizon and a camera that never stops moving.',
    explored: [
      'Perspective grids that loop without a visible seam',
      'How far a single accent colour can carry a piece',
      'Camera drift timed to a 10-second loop',
    ],
    artType: 'grid',
    ariaLabel: 'A volt green grid floor stretching to a glowing horizon, with a bolt-shaped Z floating above',
  },
  'chrome-static': {
    slug: 'chrome-static',
    title: 'Chrome Static',
    type: '3D · Still',
    category: '3d',
    idea: 'A chrome sphere floating over a halftone field, lit so the volt ring is the only colour in the frame.',
    explored: [
      'Studio lighting for polished chrome',
      'Halftone textures as a backdrop for 3D',
      'Keeping a still image feeling charged',
    ],
    artType: 'orb',
    ariaLabel: 'A chrome sphere on a halftone dot field, circled by a thin volt ring',
  },
  'short-circuit': {
    slug: 'short-circuit',
    title: 'Short Circuit',
    type: 'Title sequence',
    category: 'motion',
    idea: 'A title sequence built from sliced, shifted bands of type that snap into place on the beat.',
    explored: [
      'Glitch slicing driven by audio hits',
      'Type that breaks apart and resolves cleanly',
      'The FRZZY Short Circuit logo in motion',
    ],
    artType: 'bands',
    ariaLabel: 'Offset horizontal bands in ivory, volt and grey, like a glitching signal',
  },
  'bolt-loop': {
    slug: 'bolt-loop',
    title: 'Bolt Loop',
    type: 'Social · Pattern',
    category: 'social',
    idea: 'A field of bolt Zs where one breaks rank and lights up, built for square and story formats.',
    explored: [
      'Repeating patterns that still have a hero',
      'Cuts for 1:1, 4:5 and 9:16 from one file',
      'Loops short enough to replay without noticing',
    ],
    artType: 'bolts',
    ariaLabel: 'A field of grey bolt-shaped Zs with one large volt Z in the center',
  },
  'volt-rings': {
    slug: 'volt-rings',
    title: 'Volt Rings',
    type: '3D · Loop',
    category: '3d',
    idea: 'Rings of light stacked in perspective, orbiting a small chrome sphere like a charged particle.',
    explored: [
      'Thin glowing lines in a dark 3D space',
      'Orbits timed to feel weightless',
      'Depth from line weight alone',
    ],
    artType: 'rings',
    ariaLabel: 'Volt and ivory rings stacked in perspective around a small chrome sphere',
  },
  'spark-burst': {
    slug: 'spark-burst',
    title: 'Spark Burst',
    type: 'Branding · Logo motion',
    category: 'branding',
    idea: 'A logo reveal where the mark is born from a burst of sparks, then settles into a calm, readable lockup.',
    explored: [
      'Logo animations that still work as a still',
      'Radial bursts timed to one sound hit',
      'A family of short stings for social',
    ],
    artType: 'spark',
    ariaLabel: 'A volt four-point star bursting out of radiating ivory lines',
  },
  'charge-up': {
    slug: 'charge-up',
    title: 'Charge Up',
    type: 'Digital · UI motion',
    category: 'digital',
    idea: 'Interface motion for a charging state: the wait, the progress and the satisfying moment it is full.',
    explored: [
      'Stepped progress that feels mechanical',
      'Micro-interactions under 400 ms',
      'Handing motion specs over to developers',
    ],
    artType: 'charge',
    ariaLabel: 'A large battery outline with four of five bars lit in volt',
  },
  'ground-zero': {
    slug: 'ground-zero',
    title: 'Ground Zero',
    type: 'Campaign · Launch film',
    category: 'campaign',
    idea: 'A launch film concept that starts with one drop of energy and ends grounded in the product.',
    explored: [
      'Story structure for 15, 30 and 60-second cuts',
      'Electrical symbols as a visual language',
      'Edits led by sound design',
    ],
    artType: 'ground',
    ariaLabel: 'An oversized electrical ground symbol in ivory with a volt dot on its wire',
  },
};

export const CASE_ORDER = Object.keys(CASES);
