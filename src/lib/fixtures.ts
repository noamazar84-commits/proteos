/**
 * Static product content: the three pathways and the protein meal library.
 * A later milestone moves meals into the database so they can be curated/expanded.
 */

export type PathwayId = 'glp1' | 'bariatric' | 'general'

export interface Pathway {
  id: PathwayId
  name: string
  short: string
  tagline: string
  description: string
  /** Grams of protein per kg of goal (reference) bodyweight */
  proteinPerKg: number
  /** Absolute daily protein floor in grams */
  proteinFloor: number
  /** Daily calorie shift vs. maintenance, e.g. -0.2 = 20% deficit */
  calorieShift: number
  trainingDays: number
  /** Starting training volume modifier (-2..+2) */
  baseVolume: number
  defaultAppetite: 'light' | 'moderate' | 'big'
  defaultMeals: 3 | 4 | 5
  highlights: string[]
  /** Pathway-specific guidance shown on the specialised dashboard */
  essentials: { title: string; body: string }[]
}

export const PATHWAYS: Pathway[] = [
  {
    id: 'glp1',
    name: 'GLP-1 Users',
    short: 'GLP-1',
    tagline: 'Protein pacing for weight-loss medication',
    description:
      'Built for semaglutide and tirzepatide users: small, protein-dense meals paced around reduced appetite, plus strength work that protects muscle while the weight comes off.',
    proteinPerKg: 1.5,
    proteinFloor: 90,
    calorieShift: -0.2,
    trainingDays: 3,
    baseVolume: 0,
    defaultAppetite: 'light',
    defaultMeals: 4,
    highlights: ['Protein-first meal pacing', 'Muscle-preserving strength', 'Side-effect friendly foods'],
    essentials: [
      { title: 'Protein first, every time', body: 'Eat the protein on your plate before anything else — appetite fades fast on GLP-1s.' },
      { title: 'Pace, don’t push', body: 'Four smaller meals beat two big ones. Stop at the first sign of fullness to avoid nausea.' },
      { title: 'Hydrate + electrolytes', body: '2–2.5 L of fluid daily, sipped between meals. Add electrolytes on low-intake days.' },
      { title: 'Dose-day planning', body: 'Keep shakes and soft, bland protein on hand for the 1–2 days after your dose.' },
    ],
  },
  {
    id: 'bariatric',
    name: 'Bariatric / Sleeve',
    short: 'Bariatric',
    tagline: 'Post-surgery nutrition & portion adaptation',
    description:
      'For sleeve gastrectomy and bypass patients: tiny portions, a daily protein floor, careful texture progression and gentle, progressive movement.',
    proteinPerKg: 1.2,
    proteinFloor: 60,
    calorieShift: -0.3,
    trainingDays: 3,
    baseVolume: -2,
    defaultAppetite: 'light',
    defaultMeals: 5,
    highlights: ['60 g+ daily protein floor', 'Portion & texture staging', 'Low-impact progression'],
    essentials: [
      { title: 'Protein floor: 60 g minimum', body: 'Hit your protein before anything else. Use shakes when solid portions are too small.' },
      { title: 'The 30-minute rule', body: 'No drinking 30 minutes before or after meals so your pouch has room for protein.' },
      { title: 'Portion size: ½ – 1 cup', body: 'Use a small plate, take 20 minutes per meal and chew each bite 20 times.' },
      { title: 'Follow your surgical team', body: 'Texture stages and supplements (B12, iron, calcium, multivitamin) come from your clinician first.' },
    ],
  },
  {
    id: 'general',
    name: 'General Weight Loss',
    short: 'Weight Loss',
    tagline: 'Sustainable fat loss & metabolic reset',
    description:
      'A science-backed calorie deficit with high protein, strength training and daily movement to lose fat steadily and keep it off.',
    proteinPerKg: 1.8,
    proteinFloor: 100,
    calorieShift: -0.2,
    trainingDays: 4,
    baseVolume: 0,
    defaultAppetite: 'moderate',
    defaultMeals: 4,
    highlights: ['~0.5 kg/week steady loss', 'Strength + conditioning', 'Satiety-first meals'],
    essentials: [
      { title: 'Protein anchors every meal', body: '30–40 g per meal keeps you full and protects lean mass in a deficit.' },
      { title: 'Steps are the secret weapon', body: '8,000–10,000 daily steps burn more than most workouts — and are easier to recover from.' },
      { title: 'Plan for the weekend', body: 'Keep calories within 10% of target on weekends; that’s where most plans stall.' },
      { title: 'Sleep is metabolic', body: 'Under 7 hours raises hunger hormones. Protect your sleep like a training session.' },
    ],
  },
]

export const getPathway = (id: PathwayId) => PATHWAYS.find((p) => p.id === id) ?? PATHWAYS[0]

export type Appetite = 'light' | 'moderate' | 'big'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal {
  id: string
  name: string
  slot: MealSlot
  protein: number
  kcal: number
  carbs: number
  fat: number
  appetite: Appetite
  prepMin: number
  tags: string[]
}

export const MEALS: Meal[] = [
  // Breakfast
  { id: 'b1', name: 'Greek yogurt, berries & whey', slot: 'breakfast', protein: 38, kcal: 360, carbs: 34, fat: 6, appetite: 'light', prepMin: 3, tags: ['no-cook'] },
  { id: 'b2', name: 'Egg-white veggie omelette', slot: 'breakfast', protein: 30, kcal: 260, carbs: 10, fat: 7, appetite: 'light', prepMin: 10, tags: ['low-carb'] },
  { id: 'b3', name: 'Protein oats with banana', slot: 'breakfast', protein: 36, kcal: 520, carbs: 68, fat: 11, appetite: 'moderate', prepMin: 6, tags: ['pre-workout'] },
  { id: 'b4', name: 'Smoked salmon & eggs on rye', slot: 'breakfast', protein: 42, kcal: 540, carbs: 32, fat: 26, appetite: 'moderate', prepMin: 10, tags: ['omega-3'] },
  { id: 'b5', name: 'Steak, eggs & sweet potato hash', slot: 'breakfast', protein: 55, kcal: 780, carbs: 52, fat: 34, appetite: 'big', prepMin: 18, tags: ['high-cal'] },
  { id: 'b6', name: 'Cottage cheese pancakes stack', slot: 'breakfast', protein: 48, kcal: 690, carbs: 72, fat: 18, appetite: 'big', prepMin: 15, tags: ['sweet'] },
  // Lunch
  { id: 'l1', name: 'Tuna & white bean salad', slot: 'lunch', protein: 36, kcal: 380, carbs: 28, fat: 12, appetite: 'light', prepMin: 5, tags: ['no-cook'] },
  { id: 'l2', name: 'Chicken lettuce wraps', slot: 'lunch', protein: 34, kcal: 320, carbs: 12, fat: 11, appetite: 'light', prepMin: 12, tags: ['low-carb'] },
  { id: 'l3', name: 'Chicken burrito bowl', slot: 'lunch', protein: 48, kcal: 620, carbs: 64, fat: 16, appetite: 'moderate', prepMin: 15, tags: ['meal-prep'] },
  { id: 'l4', name: 'Turkey pesto wholegrain wrap', slot: 'lunch', protein: 40, kcal: 540, carbs: 46, fat: 18, appetite: 'moderate', prepMin: 6, tags: ['on-the-go'] },
  { id: 'l5', name: 'Beef teriyaki rice bowl', slot: 'lunch', protein: 56, kcal: 820, carbs: 92, fat: 22, appetite: 'big', prepMin: 20, tags: ['high-cal'] },
  { id: 'l6', name: 'Double chicken pasta primavera', slot: 'lunch', protein: 60, kcal: 860, carbs: 98, fat: 20, appetite: 'big', prepMin: 20, tags: ['meal-prep'] },
  // Dinner
  { id: 'd1', name: 'Baked cod, greens & lemon', slot: 'dinner', protein: 38, kcal: 340, carbs: 14, fat: 9, appetite: 'light', prepMin: 20, tags: ['lean'] },
  { id: 'd2', name: 'Shrimp zucchini stir-fry', slot: 'dinner', protein: 35, kcal: 330, carbs: 16, fat: 10, appetite: 'light', prepMin: 15, tags: ['low-carb'] },
  { id: 'd3', name: 'Salmon, quinoa & asparagus', slot: 'dinner', protein: 44, kcal: 610, carbs: 44, fat: 24, appetite: 'moderate', prepMin: 25, tags: ['omega-3'] },
  { id: 'd4', name: 'Lean beef chili', slot: 'dinner', protein: 46, kcal: 560, carbs: 48, fat: 16, appetite: 'moderate', prepMin: 30, tags: ['meal-prep'] },
  { id: 'd5', name: 'Sirloin, potatoes & chimichurri', slot: 'dinner', protein: 62, kcal: 880, carbs: 70, fat: 34, appetite: 'big', prepMin: 30, tags: ['high-cal'] },
  { id: 'd6', name: 'Chicken tikka with basmati', slot: 'dinner', protein: 58, kcal: 830, carbs: 86, fat: 22, appetite: 'big', prepMin: 30, tags: ['spiced'] },
  // Snacks
  { id: 's1', name: 'Whey shake', slot: 'snack', protein: 25, kcal: 130, carbs: 4, fat: 2, appetite: 'light', prepMin: 1, tags: ['post-workout'] },
  { id: 's2', name: 'Beef jerky & apple', slot: 'snack', protein: 20, kcal: 210, carbs: 26, fat: 3, appetite: 'light', prepMin: 1, tags: ['on-the-go'] },
  { id: 's3', name: 'Cottage cheese & pineapple', slot: 'snack', protein: 24, kcal: 220, carbs: 20, fat: 4, appetite: 'moderate', prepMin: 2, tags: ['casein'] },
  { id: 's4', name: 'Skyr protein bowl', slot: 'snack', protein: 28, kcal: 260, carbs: 24, fat: 5, appetite: 'moderate', prepMin: 3, tags: ['no-cook'] },
  { id: 's5', name: 'Mass shake with oats & PB', slot: 'snack', protein: 42, kcal: 640, carbs: 62, fat: 22, appetite: 'big', prepMin: 3, tags: ['high-cal'] },
  { id: 's6', name: 'Chicken & hummus pitta', slot: 'snack', protein: 34, kcal: 450, carbs: 42, fat: 12, appetite: 'big', prepMin: 5, tags: ['savory'] },
]

/** Sample CRM rows shown in the admin dashboard until live data is loaded. Mirrors db/schema.ts `subscriptions`. */
export interface SubscriptionRow {
  id: number
  email: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled'
  amountPaidCents: number
  paymentDate: string | null
  renewalDate: string | null
  canceled: boolean
  canceledAt: string | null
  createdAt: string
}

export const SAMPLE_SUBSCRIPTIONS: SubscriptionRow[] = [
  { id: 1, email: 'maria.santos@example.com', status: 'active', amountPaidCents: 1990, paymentDate: '2026-09-21', renewalDate: '2026-10-21', canceled: false, canceledAt: null, createdAt: '2026-08-14' },
  { id: 2, email: 'james.okafor@example.com', status: 'active', amountPaidCents: 1990, paymentDate: '2026-09-18', renewalDate: '2026-10-18', canceled: false, canceledAt: null, createdAt: '2026-07-11' },
  { id: 3, email: 'lena.fischer@example.com', status: 'trialing', amountPaidCents: 0, paymentDate: null, renewalDate: '2026-10-02', canceled: false, canceledAt: null, createdAt: '2026-09-25' },
  { id: 4, email: 'daniel.reyes@example.com', status: 'past_due', amountPaidCents: 1990, paymentDate: '2026-08-12', renewalDate: '2026-09-12', canceled: false, canceledAt: null, createdAt: '2026-06-12' },
  { id: 5, email: 'aisha.khan@example.com', status: 'canceled', amountPaidCents: 1990, paymentDate: '2026-08-30', renewalDate: null, canceled: true, canceledAt: '2026-09-20', createdAt: '2026-06-30' },
  { id: 6, email: 'tom.becker@example.com', status: 'active', amountPaidCents: 1990, paymentDate: '2026-09-26', renewalDate: '2026-10-26', canceled: false, canceledAt: null, createdAt: '2026-09-19' },
  { id: 7, email: 'sofia.lima@example.com', status: 'trialing', amountPaidCents: 0, paymentDate: null, renewalDate: '2026-09-30', canceled: false, canceledAt: null, createdAt: '2026-09-23' },
]
