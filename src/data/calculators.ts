
export type CalculatorDef = {
  id: string;
  name: string;
  category: string;
  inputs: { id: string; label: string }[];
  logic: (vals: Record<string, number>) => Record<string, string | number>;
  formula: string;
  example: string;
};

export const calculators: CalculatorDef[] = [
  {
    id: 'bmi',
    name: 'BMI Calculator',
    category: 'Health',
    inputs: [{"id":"weight","label":"Weight (kg)"},{"id":"height","label":"Height (cm)"}],
    formula: '\\text{BMI} = \\frac{\\text{Weight (kg)}}{\\text{Height (m)}^2}',
    example: "For a 70kg person who is 175cm (1.75m) tall:\nBMI = 70 / (1.75)² = 22.86",
    logic: (vals) => { const h = vals.height/100; return { "BMI": (vals.weight / (h * h)).toFixed(2) }; }
  },
  {
    id: 'bmr',
    name: 'BMR Calculator (Mifflin-St Jeor, Male)',
    category: 'Health',
    inputs: [{"id":"weight","label":"Weight (kg)"},{"id":"height","label":"Height (cm)"},{"id":"age","label":"Age (years)"}],
    formula: '\\text{BMR} = 10w + 6.25h - 5a + 5',
    example: "For a 25-year-old male, 80kg, 180cm:\nBMR = (10*80) + (6.25*180) - (5*25) + 5 = 1805 kcal",
    logic: (vals) => { return { "BMR (kcal/day)": (10 * vals.weight + 6.25 * vals.height - 5 * vals.age + 5).toFixed(2) }; }
  },
  {
    id: 'water_intake',
    name: 'Water Intake Calculator',
    category: 'Health',
    inputs: [{"id":"weight","label":"Weight (kg)"}],
    formula: '\\text{Water (L)} = \\text{Weight (kg)} \\times 0.033',
    example: "For a 70kg person:\n70 * 0.033 = 2.31 Liters",
    logic: (vals) => { return { "Daily Water (L)": (vals.weight * 0.033).toFixed(2) }; }
  },
  {
    id: 'body_fat',
    name: 'Body Fat Calculator (Adult Male)',
    category: 'Health',
    inputs: [{"id":"bmi","label":"BMI"},{"id":"age","label":"Age (years)"}],
    formula: '\\text{BF\\%} = (1.20 \\times \\text{BMI}) + (0.23 \\times \\text{Age}) - 16.2',
    example: "For a 30-year-old with a BMI of 22:\nBF% = (1.20 * 22) + (0.23 * 30) - 16.2 = 17.1%",
    logic: (vals) => { return { "Body Fat %": (1.20 * vals.bmi + 0.23 * vals.age - 16.2).toFixed(2) }; }
  },
  {
    id: 'ideal_weight',
    name: 'Ideal Weight (Devine, Male)',
    category: 'Health',
    inputs: [{"id":"height","label":"Height (cm)"}],
    formula: '\\text{Weight (kg)} = 50 + 0.9 \\times (\\text{Height (cm)} - 152.4)',
    example: "For a 180cm tall male:\nWeight = 50 + 0.9 * (180 - 152.4) = 74.84 kg",
    logic: (vals) => { return { "Ideal Weight (kg)": (50 + 0.9 * (vals.height - 152.4)).toFixed(2) }; }
  },
  {
    id: 'daily_calorie',
    name: 'Daily Calorie Needs (Moderate Activity)',
    category: 'Health',
    inputs: [{"id":"bmr","label":"BMR (kcal)"}],
    formula: '\\text{Calories} = \\text{BMR} \\times 1.55',
    example: "For a BMR of 1800 kcal:\nCalories = 1800 * 1.55 = 2790 kcal",
    logic: (vals) => { return { "Maintenance Calories": (vals.bmr * 1.55).toFixed(2) }; }
  },
  {
    id: 'target_heart_rate',
    name: 'Target Heart Rate',
    category: 'Health',
    inputs: [{"id":"age","label":"Age (years)"}],
    formula: '\\text{Target HR} = (220 - \\text{Age}) \\times [0.5, 0.85]',
    example: "For a 30-year-old:\nMax HR = 190. Target = 95 to 161 bpm.",
    logic: (vals) => { const maxHR = 220 - vals.age; return { "Min HR (bpm)": (maxHR * 0.5).toFixed(0), "Max HR (bpm)": (maxHR * 0.85).toFixed(0) }; }
  },
  {
    id: 'blood_volume',
    name: 'Blood Volume (Adult)',
    category: 'Health',
    inputs: [{"id":"weight","label":"Weight (kg)"}],
    formula: '\\text{Blood (L)} = \\text{Weight (kg)} \\times 0.07',
    example: "For a 70kg adult:\nVolume = 70 * 0.07 = 4.9 Liters",
    logic: (vals) => { return { "Blood Volume (L)": (vals.weight * 0.07).toFixed(2) }; }
  },
  {
    id: 'macros',
    name: 'Macro Calculator',
    category: 'Health',
    inputs: [{"id":"calories","label":"Daily Calories"}],
    formula: '\\text{Carbs: 50\\%}, \\text{Protein: 30\\%}, \\text{Fat: 20\\%}',
    example: "For 2000 kcal:\nCarbs = (2000*0.5)/4 = 250g\nProtein = (2000*0.3)/4 = 150g\nFat = (2000*0.2)/9 = 44g",
    logic: (vals) => { return { "Carbs (g)": ((vals.calories * 0.5) / 4).toFixed(0), "Protein (g)": ((vals.calories * 0.3) / 4).toFixed(0), "Fat (g)": ((vals.calories * 0.2) / 9).toFixed(0) }; }
  },
  {
    id: 'sleep_cycle',
    name: 'Sleep Cycle Calculator',
    category: 'Health',
    inputs: [{"id":"hours","label":"Hours to sleep"}],
    formula: '\\text{Cycles} = \\frac{\\text{Hours} \\times 60}{90}',
    example: "For 7.5 hours of sleep:\nCycles = (7.5 * 60) / 90 = 5 cycles",
    logic: (vals) => { return { "Cycles (90m)": (vals.hours * 60 / 90).toFixed(1) }; }
  },
  {
    id: 'percentage',
    name: 'Percentage Calculator',
    category: 'Finance',
    inputs: [{"id":"part","label":"Part"},{"id":"whole","label":"Whole"}],
    formula: '\\text{Percentage} = \\left( \\frac{\\text{Part}}{\\text{Whole}} \\right) \\times 100',
    example: "What percentage is 20 out of 50?\n(20 / 50) * 100 = 40%",
    logic: (vals) => { return { "Percentage (%)": ((vals.part / vals.whole) * 100).toFixed(2) }; }
  },
  {
    id: 'discount',
    name: 'Discount Calculator',
    category: 'Finance',
    inputs: [{"id":"price","label":"Original Price"},{"id":"discount","label":"Discount (%)"}],
    formula: '\\text{Final Price} = \\text{Price} \\times \\left(1 - \\frac{\\text{Discount}}{100}\\right)',
    example: "A $100 item with 20% discount:\nFinal = 100 * (1 - 0.20) = $80",
    logic: (vals) => { return { "Final Price": (vals.price * (1 - vals.discount/100)).toFixed(2), "Saved Amount": (vals.price * vals.discount/100).toFixed(2) }; }
  },
  {
    id: 'tip',
    name: 'Tip Calculator',
    category: 'Finance',
    inputs: [{"id":"bill","label":"Bill Amount"},{"id":"tip","label":"Tip (%)"}],
    formula: '\\text{Tip} = \\text{Bill} \\times \\frac{\\text{Tip\\%}}{100}',
    example: "A $50 bill with a 15% tip:\nTip = 50 * 0.15 = $7.50, Total = $57.50",
    logic: (vals) => { return { "Tip Amount": (vals.bill * vals.tip/100).toFixed(2), "Total": (vals.bill * (1 + vals.tip/100)).toFixed(2) }; }
  },
  {
    id: 'simple_interest',
    name: 'Simple Interest',
    category: 'Finance',
    inputs: [{"id":"p","label":"Principal"},{"id":"r","label":"Rate (%)"},{"id":"t","label":"Time (years)"}],
    formula: '\\text{Interest} = P \\times \\frac{R}{100} \\times T',
    example: "Principal $1000 at 5% for 3 years:\nInterest = 1000 * 0.05 * 3 = $150",
    logic: (vals) => { return { "Interest": (vals.p * (vals.r/100) * vals.t).toFixed(2) }; }
  },
  {
    id: 'compound_interest',
    name: 'Compound Interest (Annual)',
    category: 'Finance',
    inputs: [{"id":"p","label":"Principal"},{"id":"r","label":"Annual Rate (%)"},{"id":"t","label":"Time (years)"}],
    formula: 'A = P \\left(1 + \\frac{r}{100}\\right)^t',
    example: "Principal $1000 at 5% for 3 years:\nAmount = 1000 * (1.05)³ = $1157.63",
    logic: (vals) => { return { "Total Amount": (vals.p * Math.pow(1 + vals.r/100, vals.t)).toFixed(2) }; }
  },
  {
    id: 'margin',
    name: 'Profit Margin',
    category: 'Finance',
    inputs: [{"id":"cost","label":"Cost"},{"id":"revenue","label":"Revenue"}],
    formula: '\\text{Margin} = \\left( \\frac{\\text{Revenue} - \\text{Cost}}{\\text{Revenue}} \\right) \\times 100',
    example: "Cost $80, Revenue $100:\nMargin = ((100-80)/100)*100 = 20%",
    logic: (vals) => { return { "Margin (%)": (((vals.revenue - vals.cost) / vals.revenue) * 100).toFixed(2) }; }
  },
  {
    id: 'markup',
    name: 'Markup Calculator',
    category: 'Finance',
    inputs: [{"id":"cost","label":"Cost"},{"id":"revenue","label":"Revenue"}],
    formula: '\\text{Markup} = \\left( \\frac{\\text{Revenue} - \\text{Cost}}{\\text{Cost}} \\right) \\times 100',
    example: "Cost $80, Revenue $100:\nMarkup = ((100-80)/80)*100 = 25%",
    logic: (vals) => { return { "Markup (%)": (((vals.revenue - vals.cost) / vals.cost) * 100).toFixed(2) }; }
  },
  {
    id: 'roi',
    name: 'ROI Calculator',
    category: 'Finance',
    inputs: [{"id":"investment","label":"Total Investment"},{"id":"return","label":"Total Return"}],
    formula: '\\text{ROI} = \\left( \\frac{\\text{Return} - \\text{Investment}}{\\text{Investment}} \\right) \\times 100',
    example: "Invested $1000, Returned $1200:\nROI = ((1200-1000)/1000)*100 = 20%",
    logic: (vals) => { return { "ROI (%)": (((vals.return - vals.investment) / vals.investment) * 100).toFixed(2) }; }
  },
  {
    id: 'rule_of_72',
    name: 'Rule of 72',
    category: 'Finance',
    inputs: [{"id":"rate","label":"Interest Rate (%)"}],
    formula: 't \\approx \\frac{72}{r}',
    example: "At an 8% interest rate:\nYears to double = 72 / 8 = 9 years",
    logic: (vals) => { return { "Years to Double": (72 / vals.rate).toFixed(2) }; }
  },
  {
    id: 'debt_to_income',
    name: 'Debt to Income Ratio',
    category: 'Finance',
    inputs: [{"id":"debt","label":"Monthly Debt"},{"id":"income","label":"Monthly Income"}],
    formula: '\\text{DTI} = \\left( \\frac{\\text{Debt}}{\\text{Income}} \\right) \\times 100',
    example: "Debt $1500, Income $5000:\nDTI = (1500 / 5000) * 100 = 30%",
    logic: (vals) => { return { "DTI Ratio (%)": ((vals.debt / vals.income) * 100).toFixed(2) }; }
  },
  {
    id: 'loan_emi',
    name: 'Loan EMI Calculator',
    category: 'Finance',
    inputs: [{"id":"p","label":"Principal"},{"id":"r","label":"Annual Rate (%)"},{"id":"m","label":"Months"}],
    formula: 'E = P \\times r \\times \\frac{(1 + r)^n}{(1 + r)^n - 1}',
    example: "Principal $10000, 5% annual rate (0.416% monthly), 12 months:\nEMI = $856.07",
    logic: (vals) => { const r = vals.r/12/100; const emi = (vals.p * r * Math.pow(1+r, vals.m)) / (Math.pow(1+r, vals.m) - 1); return { "Monthly EMI": emi.toFixed(2) }; }
  },
  {
    id: 'salary_hourly',
    name: 'Salary to Hourly',
    category: 'Finance',
    inputs: [{"id":"salary","label":"Annual Salary"},{"id":"hours","label":"Hours/Week"}],
    formula: '\\text{Hourly} = \\frac{\\text{Salary}}{52 \\times \\text{Hours/Week}}',
    example: "Salary $52,000, 40 hours/week:\nHourly = 52000 / (52 * 40) = $25/hr",
    logic: (vals) => { return { "Hourly Rate": (vals.salary / (52 * vals.hours)).toFixed(2) }; }
  },
  {
    id: 'hourly_salary',
    name: 'Hourly to Salary',
    category: 'Finance',
    inputs: [{"id":"hourly","label":"Hourly Rate"},{"id":"hours","label":"Hours/Week"}],
    formula: '\\text{Salary} = \\text{Hourly} \\times 52 \\times \\text{Hours/Week}',
    example: "Hourly $25, 40 hours/week:\nSalary = 25 * 52 * 40 = $52,000",
    logic: (vals) => { return { "Annual Salary": (vals.hourly * 52 * vals.hours).toFixed(2) }; }
  },
  {
    id: 'fuel_cost',
    name: 'Fuel Cost Calculator',
    category: 'Finance',
    inputs: [{"id":"distance","label":"Distance"},{"id":"efficiency","label":"Efficiency (per unit)"},{"id":"price","label":"Price per unit"}],
    formula: '\\text{Cost} = \\left( \\frac{\\text{Distance}}{\\text{Efficiency}} \\right) \\times \\text{Price}',
    example: "Distance 300mi, 30mpg, $3.50/gal:\nCost = (300 / 30) * 3.50 = $35.00",
    logic: (vals) => { return { "Total Cost": ((vals.distance / vals.efficiency) * vals.price).toFixed(2) }; }
  },
  {
    id: 'area_circle',
    name: 'Area of Circle',
    category: 'Geometry',
    inputs: [{"id":"r","label":"Radius"}],
    formula: 'A = \\pi r^2',
    example: "For a radius of 5:\nArea = 3.14159 * 5² = 78.54",
    logic: (vals) => { return { "Area": (Math.PI * vals.r * vals.r).toFixed(2) }; }
  },
  {
    id: 'area_rectangle',
    name: 'Area of Rectangle',
    category: 'Geometry',
    inputs: [{"id":"l","label":"Length"},{"id":"w","label":"Width"}],
    formula: 'A = l \\times w',
    example: "For length 10 and width 4:\nArea = 10 * 4 = 40",
    logic: (vals) => { return { "Area": (vals.l * vals.w).toFixed(2) }; }
  },
  {
    id: 'area_triangle',
    name: 'Area of Triangle',
    category: 'Geometry',
    inputs: [{"id":"b","label":"Base"},{"id":"h","label":"Height"}],
    formula: 'A = \\frac{1}{2} b h',
    example: "Base 10, Height 5:\nArea = 0.5 * 10 * 5 = 25",
    logic: (vals) => { return { "Area": (0.5 * vals.b * vals.h).toFixed(2) }; }
  },
  {
    id: 'area_square',
    name: 'Area of Square',
    category: 'Geometry',
    inputs: [{"id":"s","label":"Side"}],
    formula: 'A = s^2',
    example: "Side 6:\nArea = 6² = 36",
    logic: (vals) => { return { "Area": (vals.s * vals.s).toFixed(2) }; }
  },
  {
    id: 'area_trapezoid',
    name: 'Area of Trapezoid',
    category: 'Geometry',
    inputs: [{"id":"a","label":"Base A"},{"id":"b","label":"Base B"},{"id":"h","label":"Height"}],
    formula: 'A = \\frac{a + b}{2} h',
    example: "Base A 4, Base B 6, Height 5:\nArea = ((4+6)/2) * 5 = 25",
    logic: (vals) => { return { "Area": (((vals.a + vals.b) / 2) * vals.h).toFixed(2) }; }
  },
  {
    id: 'area_ellipse',
    name: 'Area of Ellipse',
    category: 'Geometry',
    inputs: [{"id":"a","label":"Semi-major Axis A"},{"id":"b","label":"Semi-minor Axis B"}],
    formula: 'A = \\pi a b',
    example: "Axis A 5, Axis B 3:\nArea = 3.14159 * 5 * 3 = 47.12",
    logic: (vals) => { return { "Area": (Math.PI * vals.a * vals.b).toFixed(2) }; }
  },
  {
    id: 'vol_cube',
    name: 'Volume of Cube',
    category: 'Geometry',
    inputs: [{"id":"s","label":"Side"}],
    formula: 'V = s^3',
    example: "Side 3:\nVolume = 3³ = 27",
    logic: (vals) => { return { "Volume": (vals.s * vals.s * vals.s).toFixed(2) }; }
  },
  {
    id: 'vol_sphere',
    name: 'Volume of Sphere',
    category: 'Geometry',
    inputs: [{"id":"r","label":"Radius"}],
    formula: 'V = \\frac{4}{3} \\pi r^3',
    example: "Radius 3:\nVolume = (4/3) * 3.14159 * 27 = 113.10",
    logic: (vals) => { return { "Volume": ((4/3) * Math.PI * Math.pow(vals.r, 3)).toFixed(2) }; }
  },
  {
    id: 'vol_cylinder',
    name: 'Volume of Cylinder',
    category: 'Geometry',
    inputs: [{"id":"r","label":"Radius"},{"id":"h","label":"Height"}],
    formula: 'V = \\pi r^2 h',
    example: "Radius 2, Height 5:\nVolume = 3.14159 * 4 * 5 = 62.83",
    logic: (vals) => { return { "Volume": (Math.PI * vals.r * vals.r * vals.h).toFixed(2) }; }
  },
  {
    id: 'vol_cone',
    name: 'Volume of Cone',
    category: 'Geometry',
    inputs: [{"id":"r","label":"Radius"},{"id":"h","label":"Height"}],
    formula: 'V = \\frac{1}{3} \\pi r^2 h',
    example: "Radius 2, Height 6:\nVolume = (1/3) * 3.14159 * 4 * 6 = 25.13",
    logic: (vals) => { return { "Volume": ((1/3) * Math.PI * vals.r * vals.r * vals.h).toFixed(2) }; }
  },
  {
    id: 'speed',
    name: 'Speed Calculator',
    category: 'Physics',
    inputs: [{"id":"d","label":"Distance"},{"id":"t","label":"Time"}],
    formula: 'v = \\frac{d}{t}',
    example: "Distance 100, Time 2:\nSpeed = 100 / 2 = 50",
    logic: (vals) => { return { "Speed": (vals.d / vals.t).toFixed(2) }; }
  },
  {
    id: 'acceleration',
    name: 'Acceleration',
    category: 'Physics',
    inputs: [{"id":"v1","label":"Initial Velocity"},{"id":"v2","label":"Final Velocity"},{"id":"t","label":"Time"}],
    formula: 'a = \\frac{v_f - v_i}{t}',
    example: "V1 = 0, V2 = 20, Time = 5:\nAcceleration = (20 - 0) / 5 = 4",
    logic: (vals) => { return { "Acceleration": ((vals.v2 - vals.v1) / vals.t).toFixed(2) }; }
  },
  {
    id: 'force',
    name: 'Force (Newton\'s Second Law)',
    category: 'Physics',
    inputs: [{"id":"m","label":"Mass (kg)"},{"id":"a","label":"Acceleration (m/s²)"}],
    formula: 'F = m \\times a',
    example: "Mass 10kg, Acceleration 9.8m/s²:\nForce = 10 * 9.8 = 98 N",
    logic: (vals) => { return { "Force (N)": (vals.m * vals.a).toFixed(2) }; }
  },
  {
    id: 'work',
    name: 'Work',
    category: 'Physics',
    inputs: [{"id":"f","label":"Force (N)"},{"id":"d","label":"Distance (m)"}],
    formula: 'W = F \\times d',
    example: "Force 50N, Distance 10m:\nWork = 50 * 10 = 500 Joules",
    logic: (vals) => { return { "Work (J)": (vals.f * vals.d).toFixed(2) }; }
  },
  {
    id: 'power',
    name: 'Power',
    category: 'Physics',
    inputs: [{"id":"w","label":"Work (J)"},{"id":"t","label":"Time (s)"}],
    formula: 'P = \\frac{W}{t}',
    example: "Work 500J, Time 5s:\nPower = 500 / 5 = 100 Watts",
    logic: (vals) => { return { "Power (W)": (vals.w / vals.t).toFixed(2) }; }
  },
  {
    id: 'kinetic_energy',
    name: 'Kinetic Energy',
    category: 'Physics',
    inputs: [{"id":"m","label":"Mass (kg)"},{"id":"v","label":"Velocity (m/s)"}],
    formula: 'KE = \\frac{1}{2} m v^2',
    example: "Mass 2kg, Velocity 3m/s:\nKE = 0.5 * 2 * 9 = 9 Joules",
    logic: (vals) => { return { "KE (J)": (0.5 * vals.m * vals.v * vals.v).toFixed(2) }; }
  },
  {
    id: 'potential_energy',
    name: 'Potential Energy',
    category: 'Physics',
    inputs: [{"id":"m","label":"Mass (kg)"},{"id":"h","label":"Height (m)"}],
    formula: 'PE = m \\times g \\times h',
    example: "Mass 10kg, Height 5m, g = 9.81:\nPE = 10 * 9.81 * 5 = 490.5 Joules",
    logic: (vals) => { return { "PE (J)": (vals.m * 9.81 * vals.h).toFixed(2) }; }
  },
  {
    id: 'average',
    name: 'Average Calculator',
    category: 'Math',
    inputs: [{"id":"a","label":"Number 1"},{"id":"b","label":"Number 2"},{"id":"c","label":"Number 3"}],
    formula: '\\text{Avg} = \\frac{a + b + c}{3}',
    example: "For 10, 20, 30:\nAverage = (10+20+30) / 3 = 20",
    logic: (vals) => { return { "Average": ((vals.a + vals.b + vals.c) / 3).toFixed(2) }; }
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean Theorem',
    category: 'Math',
    inputs: [{"id":"a","label":"Side A"},{"id":"b","label":"Side B"}],
    formula: 'c = \\sqrt{a^2 + b^2}',
    example: "Side A 3, Side B 4:\nHypotenuse = √(9 + 16) = √25 = 5",
    logic: (vals) => { return { "Hypotenuse": Math.sqrt(vals.a*vals.a + vals.b*vals.b).toFixed(2) }; }
  },
  {
    id: 'factorial',
    name: 'Factorial Calculator',
    category: 'Math',
    inputs: [{"id":"n","label":"Number"}],
    formula: 'n! = n \\times (n-1) \\times \\dots \\times 1',
    example: "5! = 5 * 4 * 3 * 2 * 1 = 120",
    logic: (vals) => { let f = 1; for(let i=1; i<=Math.floor(vals.n); i++) f*=i; return { "Factorial": f }; }
  },
  {
    id: 'm_ft',
    name: 'Meters to Feet',
    category: 'Length',
    inputs: [{"id":"m","label":"Meters"}],
    formula: '\\text{Feet} = \\text{Meters} \\times 3.2808',
    example: "For 10 Meters:\n10 * 3.2808 = 32.8084 Feet",
    logic: (vals) => { return { Result: (vals.m * 3.28084).toFixed(4) }; }
  },
  {
    id: 'ft_m',
    name: 'Feet to Meters',
    category: 'Length',
    inputs: [{"id":"ft","label":"Feet"}],
    formula: '\\text{Meters} = \\text{Feet} \\times 0.3048',
    example: "For 10 Feet:\n10 * 0.3048 = 3.0480 Meters",
    logic: (vals) => { return { Result: (vals.ft * 0.3047999902464003).toFixed(4) }; }
  },
  {
    id: 'mi_km',
    name: 'Miles to Kilometers',
    category: 'Length',
    inputs: [{"id":"mi","label":"Miles"}],
    formula: '\\text{Kilometers} = \\text{Miles} \\times 1.6093',
    example: "For 10 Miles:\n10 * 1.6093 = 16.0934 Kilometers",
    logic: (vals) => { return { Result: (vals.mi * 1.60934).toFixed(4) }; }
  },
  {
    id: 'km_mi',
    name: 'Kilometers to Miles',
    category: 'Length',
    inputs: [{"id":"km","label":"Kilometers"}],
    formula: '\\text{Miles} = \\text{Kilometers} \\times 0.6214',
    example: "For 10 Kilometers:\n10 * 0.6214 = 6.2137 Miles",
    logic: (vals) => { return { Result: (vals.km * 0.6213727366498067).toFixed(4) }; }
  },
  {
    id: 'in_cm',
    name: 'Inches to Centimeters',
    category: 'Length',
    inputs: [{"id":"in","label":"Inches"}],
    formula: '\\text{Centimeters} = \\text{Inches} \\times 2.5400',
    example: "For 10 Inches:\n10 * 2.5400 = 25.4000 Centimeters",
    logic: (vals) => { return { Result: (vals.in * 2.54).toFixed(4) }; }
  },
  {
    id: 'cm_in',
    name: 'Centimeters to Inches',
    category: 'Length',
    inputs: [{"id":"cm","label":"Centimeters"}],
    formula: '\\text{Inches} = \\text{Centimeters} \\times 0.3937',
    example: "For 10 Centimeters:\n10 * 0.3937 = 3.9370 Inches",
    logic: (vals) => { return { Result: (vals.cm * 0.39370078740157477).toFixed(4) }; }
  },
  {
    id: 'kg_lb',
    name: 'Kg to Lbs',
    category: 'Weight',
    inputs: [{"id":"kg","label":"Kilograms"}],
    formula: '\\text{Pounds} = \\text{Kilograms} \\times 2.2046',
    example: "For 10 Kilograms:\n10 * 2.2046 = 22.0462 Pounds",
    logic: (vals) => { return { Result: (vals.kg * 2.20462).toFixed(4) }; }
  },
  {
    id: 'lb_kg',
    name: 'Lbs to Kg',
    category: 'Weight',
    inputs: [{"id":"lb","label":"Pounds"}],
    formula: '\\text{Kilograms} = \\text{Pounds} \\times 0.4536',
    example: "For 10 Pounds:\n10 * 0.4536 = 4.5359 Kilograms",
    logic: (vals) => { return { Result: (vals.lb * 0.45359290943563974).toFixed(4) }; }
  },
  {
    id: 'g_oz',
    name: 'Grams to Ounces',
    category: 'Weight',
    inputs: [{"id":"g","label":"Grams"}],
    formula: '\\text{Ounces} = \\text{Grams} \\times 0.0353',
    example: "For 10 Grams:\n10 * 0.0353 = 0.3527 Ounces",
    logic: (vals) => { return { Result: (vals.g * 0.035274).toFixed(4) }; }
  },
  {
    id: 'oz_g',
    name: 'Ounces to Grams',
    category: 'Weight',
    inputs: [{"id":"oz","label":"Ounces"}],
    formula: '\\text{Grams} = \\text{Ounces} \\times 28.3495',
    example: "For 10 Ounces:\n10 * 28.3495 = 283.4949 Grams",
    logic: (vals) => { return { Result: (vals.oz * 28.34949254408346).toFixed(4) }; }
  },
  {
    id: 'l_gal',
    name: 'Liters to Gallons',
    category: 'Volume',
    inputs: [{"id":"l","label":"Liters"}],
    formula: '\\text{Gallons} = \\text{Liters} \\times 0.2642',
    example: "For 10 Liters:\n10 * 0.2642 = 2.6417 Gallons",
    logic: (vals) => { return { Result: (vals.l * 0.264172).toFixed(4) }; }
  },
  {
    id: 'gal_l',
    name: 'Gallons to Liters',
    category: 'Volume',
    inputs: [{"id":"gal","label":"Gallons"}],
    formula: '\\text{Liters} = \\text{Gallons} \\times 3.7854',
    example: "For 10 Gallons:\n10 * 3.7854 = 37.8541 Liters",
    logic: (vals) => { return { Result: (vals.gal * 3.785412534257983).toFixed(4) }; }
  },
  {
    id: 'ml_floz',
    name: 'ML to Fl Ounces',
    category: 'Volume',
    inputs: [{"id":"ml","label":"Milliliters"}],
    formula: '\\text{Fl Ounces} = \\text{Milliliters} \\times 0.0338',
    example: "For 10 Milliliters:\n10 * 0.0338 = 0.3381 Fl Ounces",
    logic: (vals) => { return { Result: (vals.ml * 0.033814).toFixed(4) }; }
  },
  {
    id: 'floz_ml',
    name: 'Fl Ounces to ML',
    category: 'Volume',
    inputs: [{"id":"oz","label":"Fl Ounces"}],
    formula: '\\text{Milliliters} = \\text{Fl Ounces} \\times 29.5735',
    example: "For 10 Fl Ounces:\n10 * 29.5735 = 295.7355 Milliliters",
    logic: (vals) => { return { Result: (vals.oz * 29.57354941740108).toFixed(4) }; }
  },
  {
    id: 'mps_kmph',
    name: 'm/s to km/h',
    category: 'Speed',
    inputs: [{"id":"mps","label":"m/s"}],
    formula: '\\text{km/h} = \\text{m/s} \\times 3.6000',
    example: "For 10 m/s:\n10 * 3.6000 = 36.0000 km/h",
    logic: (vals) => { return { Result: (vals.mps * 3.6).toFixed(4) }; }
  },
  {
    id: 'kmph_mps',
    name: 'km/h to m/s',
    category: 'Speed',
    inputs: [{"id":"kmph","label":"km/h"}],
    formula: '\\text{m/s} = \\text{km/h} \\times 0.2778',
    example: "For 10 km/h:\n10 * 0.2778 = 2.7778 m/s",
    logic: (vals) => { return { Result: (vals.kmph * 0.2777777777777778).toFixed(4) }; }
  },
  {
    id: 'mph_kmph',
    name: 'mph to km/h',
    category: 'Speed',
    inputs: [{"id":"mph","label":"mph"}],
    formula: '\\text{km/h} = \\text{mph} \\times 1.6093',
    example: "For 10 mph:\n10 * 1.6093 = 16.0934 km/h",
    logic: (vals) => { return { Result: (vals.mph * 1.60934).toFixed(4) }; }
  },
  {
    id: 'kmph_mph',
    name: 'km/h to mph',
    category: 'Speed',
    inputs: [{"id":"kmph","label":"km/h"}],
    formula: '\\text{mph} = \\text{km/h} \\times 0.6214',
    example: "For 10 km/h:\n10 * 0.6214 = 6.2137 mph",
    logic: (vals) => { return { Result: (vals.kmph * 0.6213727366498067).toFixed(4) }; }
  },
  {
    id: 'c_f',
    name: 'Celsius to Fahrenheit',
    category: 'Temperature',
    inputs: [{"id":"c","label":"Celsius"}],
    formula: 'F = (C \\times \\frac{9}{5}) + 32',
    example: "For 20°C:\nF = (20 * 1.8) + 32 = 68°F",
    logic: (vals) => { return { "Fahrenheit": ((vals.c * 9/5) + 32).toFixed(2) }; }
  },
  {
    id: 'f_c',
    name: 'Fahrenheit to Celsius',
    category: 'Temperature',
    inputs: [{"id":"f","label":"Fahrenheit"}],
    formula: 'C = (F - 32) \\times \\frac{5}{9}',
    example: "For 68°F:\nC = (68 - 32) * 5/9 = 20°C",
    logic: (vals) => { return { "Celsius": ((vals.f - 32) * 5/9).toFixed(2) }; }
  }
];
