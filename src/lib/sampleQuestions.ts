import { Question } from "../types";

export const SAMPLE_TRANSFORMER_QUESTIONS: Question[] = [
  {
    id: "sq1",
    questionNumber: 1,
    questionText: "What type of core material is used in high-efficiency power transformers to minimize hysteresis loss?",
    options: ["Soft Mild Steel", "Cold Rolled Grain Oriented (CRGO) Steel", "Cast Iron", "Structural Aluminum"],
    correctOption: 1
  },
  {
    id: "sq2",
    questionNumber: 2,
    questionText: "Which safety device protects oil-filled transformers against internal gas accumulation and oil surge?",
    options: ["Silica Gel Breather", "Buchholz Relay", "Explosion Vent", "Conservator Tank"],
    correctOption: 1
  },
  {
    id: "sq3",
    questionNumber: 3,
    questionText: "What is the primary function of Silica Gel inside a transformer breather?",
    options: ["Absorb moisture from air entering conservator", "Cool the transformer oil", "Filter solid impurities", "Increase dielectric strength"],
    correctOption: 0
  },
  {
    id: "sq4",
    questionNumber: 4,
    questionText: "What is the standard minimum dielectric breakdown voltage (BDV) required for fresh insulating transformer oil?",
    options: ["10 kV", "30 kV", "60 kV", "100 kV"],
    correctOption: 2
  },
  {
    id: "sq5",
    questionNumber: 5,
    questionText: "During short circuit test of a transformer, which loss is primarily measured?",
    options: ["Hysteresis Loss", "Eddy Current Loss", "Copper / Ohmic Loss (I²R)", "Stray Stray Capacity Loss"],
    correctOption: 2
  },
  {
    id: "sq6",
    questionNumber: 6,
    questionText: "Why is laminated core construction used in electrical transformer assembly?",
    options: ["To increase mechanical strength", "To reduce eddy current loss", "To facilitate cooling oil flow", "To lower total weight"],
    correctOption: 1
  },
  {
    id: "sq7",
    questionNumber: 7,
    questionText: "In a step-down transformer, how does high voltage (HV) winding current compare to low voltage (LV) current?",
    options: ["HV current is higher", "HV current is lower", "HV and LV currents are identical", "HV current depends on temperature only"],
    correctOption: 1
  },
  {
    id: "sq8",
    questionNumber: 8,
    questionText: "What test is performed to verify transformer winding turns ratio and vector group polarity?",
    options: ["Turns Ratio Test (TTR)", "Dissolved Gas Analysis (DGA)", "Megger Insulation Resistance Test", "Thermal Imaging Test"],
    correctOption: 0
  },
  {
    id: "sq9",
    questionNumber: 9,
    questionText: "Which insulation class is typically assigned to transformer oil-immersed paper insulation?",
    options: ["Class A (105°C)", "Class B (130°C)", "Class F (155°C)", "Class H (180°C)"],
    correctOption: 0
  },
  {
    id: "sq10",
    questionNumber: 10,
    questionText: "What is the characteristic color of fresh, active Silica Gel in a transformer breather before absorbing moisture? (सिलिका जेल का नमी सोखने से पहले सक्रिय रंग क्या होता है?)",
    options: [
      "A. Deep Cobalt Blue (सक्रिय / Dry & Active)",
      "B. Pale Pink (नमी अवशोषित / Moisture Saturated)",
      "C. Pure White / Milky (अक्रिय / Exhausted)",
      "D. Dark Brown / Black (दूषित / Oil Contaminated)"
    ],
    correctOption: 0
  }
];
