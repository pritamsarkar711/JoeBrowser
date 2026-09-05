const fs = require('fs');

const manualCalcs = [
  // Health
  {
    id: 'bmi', name: 'BMI Calculator', category: 'Health',
    inputs: [{ id: 'weight', label: 'Weight (kg)' }, { id: 'height', label: 'Height (cm)' }],
    logic: 'const h = vals.height/100; return { "BMI": (vals.weight / (h * h)).toFixed(2) };',
    formula: '\\text{BMI} = \\frac{\\text{Weight (kg)}}{\\text{Height (m)}^2}',
    example: 'For a 70kg person who is 175cm (1.75m) tall:\nBMI = 70 / (1.75)² = 22.86'
  },
  {
    id: 'bmr', name: 'BMR Calculator (Mifflin-St Jeor, Male)', category: 'Health',
    inputs: [{ id: 'weight', label: 'Weight (kg)' }, { id: 'height', label: 'Height (cm)' }, { id: 'age', label: 'Age (years)' }],
    logic: 'return { "BMR (kcal/day)": (10 * vals.weight + 6.25 * vals.height - 5 * vals.age + 5).toFixed(2) };',
    formula: '\\text{BMR} = 10w + 6.25h - 5a + 5',
    example: 'For a 25-year-old male, 80kg, 180cm:\nBMR = (10*80) + (6.25*180) - (5*25) + 5 = 1805 kcal'
  },
  {
    id: 'water_intake', name: 'Water Intake Calculator', category: 'Health',
    inputs: [{ id: 'weight', label: 'Weight (kg)' }],
    logic: 'return { "Daily Water (L)": (vals.weight * 0.033).toFixed(2) };',
    formula: '\\text{Water (L)} = \\text{Weight (kg)} \\times 0.033',
    example: 'For a 70kg person:\n70 * 0.033 = 2.31 Liters'
  },
  {
    id: 'body_fat', name: 'Body Fat Calculator (Adult Male)', category: 'Health',
    inputs: [{ id: 'bmi', label: 'BMI' }, { id: 'age', label: 'Age (years)' }],
    logic: 'return { "Body Fat %": (1.20 * vals.bmi + 0.23 * vals.age - 16.2).toFixed(2) };',
    formula: '\\text{BF\\%} = (1.20 \\times \\text{BMI}) + (0.23 \\times \\text{Age}) - 16.2',
    example: 'For a 30-year-old with a BMI of 22:\nBF% = (1.20 * 22) + (0.23 * 30) - 16.2 = 17.1%'
  },
  {
    id: 'ideal_weight', name: 'Ideal Weight (Devine, Male)', category: 'Health',
    inputs: [{ id: 'height', label: 'Height (cm)' }],
    logic: 'return { "Ideal Weight (kg)": (50 + 0.9 * (vals.height - 152.4)).toFixed(2) };',
    formula: '\\text{Weight (kg)} = 50 + 0.9 \\times (\\text{Height (cm)} - 152.4)',
    example: 'For a 180cm tall male:\nWeight = 50 + 0.9 * (180 - 152.4) = 74.84 kg'
  },
  {
    id: 'daily_calorie', name: 'Daily Calorie Needs (Moderate Activity)', category: 'Health',
    inputs: [{ id: 'bmr', label: 'BMR (kcal)' }],
    logic: 'return { "Maintenance Calories": (vals.bmr * 1.55).toFixed(2) };',
    formula: '\\text{Calories} = \\text{BMR} \\times 1.55',
    example: 'For a BMR of 1800 kcal:\nCalories = 1800 * 1.55 = 2790 kcal'
  },
  {
    id: 'target_heart_rate', name: 'Target Heart Rate', category: 'Health',
    inputs: [{ id: 'age', label: 'Age (years)' }],
    logic: 'const maxHR = 220 - vals.age; return { "Min HR (bpm)": (maxHR * 0.5).toFixed(0), "Max HR (bpm)": (maxHR * 0.85).toFixed(0) };',
    formula: '\\text{Target HR} = (220 - \\text{Age}) \\times [0.5, 0.85]',
    example: 'For a 30-year-old:\nMax HR = 190. Target = 95 to 161 bpm.'
  },
  {
    id: 'blood_volume', name: 'Blood Volume (Adult)', category: 'Health',
    inputs: [{ id: 'weight', label: 'Weight (kg)' }],
    logic: 'return { "Blood Volume (L)": (vals.weight * 0.07).toFixed(2) };',
    formula: '\\text{Blood (L)} = \\text{Weight (kg)} \\times 0.07',
    example: 'For a 70kg adult:\nVolume = 70 * 0.07 = 4.9 Liters'
  },
  {
    id: 'macros', name: 'Macro Calculator', category: 'Health',
    inputs: [{ id: 'calories', label: 'Daily Calories' }],
    logic: 'return { "Carbs (g)": ((vals.calories * 0.5) / 4).toFixed(0), "Protein (g)": ((vals.calories * 0.3) / 4).toFixed(0), "Fat (g)": ((vals.calories * 0.2) / 9).toFixed(0) };',
    formula: '\\text{Carbs: 50\\%}, \\text{Protein: 30\\%}, \\text{Fat: 20\\%}',
    example: 'For 2000 kcal:\nCarbs = (2000*0.5)/4 = 250g\nProtein = (2000*0.3)/4 = 150g\nFat = (2000*0.2)/9 = 44g'
  },
  {
    id: 'sleep_cycle', name: 'Sleep Cycle Calculator', category: 'Health',
    inputs: [{ id: 'hours', label: 'Hours to sleep' }],
    logic: 'return { "Cycles (90m)": (vals.hours * 60 / 90).toFixed(1) };',
    formula: '\\text{Cycles} = \\frac{\\text{Hours} \\times 60}{90}',
    example: 'For 7.5 hours of sleep:\nCycles = (7.5 * 60) / 90 = 5 cycles'
  },

  // Finance
  {
    id: 'percentage', name: 'Percentage Calculator', category: 'Finance',
    inputs: [{ id: 'part', label: 'Part' }, { id: 'whole', label: 'Whole' }],
    logic: 'return { "Percentage (%)": ((vals.part / vals.whole) * 100).toFixed(2) };',
    formula: '\\text{Percentage} = \\left( \\frac{\\text{Part}}{\\text{Whole}} \\right) \\times 100',
    example: 'What percentage is 20 out of 50?\n(20 / 50) * 100 = 40%'
  },
  {
    id: 'discount', name: 'Discount Calculator', category: 'Finance',
    inputs: [{ id: 'price', label: 'Original Price' }, { id: 'discount', label: 'Discount (%)' }],
    logic: 'return { "Final Price": (vals.price * (1 - vals.discount/100)).toFixed(2), "Saved Amount": (vals.price * vals.discount/100).toFixed(2) };',
    formula: '\\text{Final Price} = \\text{Price} \\times \\left(1 - \\frac{\\text{Discount}}{100}\\right)',
    example: 'A $100 item with 20% discount:\nFinal = 100 * (1 - 0.20) = $80'
  },
  {
    id: 'tip', name: 'Tip Calculator', category: 'Finance',
    inputs: [{ id: 'bill', label: 'Bill Amount' }, { id: 'tip', label: 'Tip (%)' }],
    logic: 'return { "Tip Amount": (vals.bill * vals.tip/100).toFixed(2), "Total": (vals.bill * (1 + vals.tip/100)).toFixed(2) };',
    formula: '\\text{Tip} = \\text{Bill} \\times \\frac{\\text{Tip\\%}}{100}',
    example: 'A $50 bill with a 15% tip:\nTip = 50 * 0.15 = $7.50, Total = $57.50'
  },
  {
    id: 'simple_interest', name: 'Simple Interest', category: 'Finance',
    inputs: [{ id: 'p', label: 'Principal' }, { id: 'r', label: 'Rate (%)' }, { id: 't', label: 'Time (years)' }],
    logic: 'return { "Interest": (vals.p * (vals.r/100) * vals.t).toFixed(2) };',
    formula: '\\text{Interest} = P \\times \\frac{R}{100} \\times T',
    example: 'Principal $1000 at 5% for 3 years:\nInterest = 1000 * 0.05 * 3 = $150'
  },
  {
    id: 'compound_interest', name: 'Compound Interest (Annual)', category: 'Finance',
    inputs: [{ id: 'p', label: 'Principal' }, { id: 'r', label: 'Annual Rate (%)' }, { id: 't', label: 'Time (years)' }],
    logic: 'return { "Total Amount": (vals.p * Math.pow(1 + vals.r/100, vals.t)).toFixed(2) };',
    formula: 'A = P \\left(1 + \\frac{r}{100}\\right)^t',
    example: 'Principal $1000 at 5% for 3 years:\nAmount = 1000 * (1.05)³ = $1157.63'
  },
  {
    id: 'margin', name: 'Profit Margin', category: 'Finance',
    inputs: [{ id: 'cost', label: 'Cost' }, { id: 'revenue', label: 'Revenue' }],
    logic: 'return { "Margin (%)": (((vals.revenue - vals.cost) / vals.revenue) * 100).toFixed(2) };',
    formula: '\\text{Margin} = \\left( \\frac{\\text{Revenue} - \\text{Cost}}{\\text{Revenue}} \\right) \\times 100',
    example: 'Cost $80, Revenue $100:\nMargin = ((100-80)/100)*100 = 20%'
  },
  {
    id: 'markup', name: 'Markup Calculator', category: 'Finance',
    inputs: [{ id: 'cost', label: 'Cost' }, { id: 'revenue', label: 'Revenue' }],
    logic: 'return { "Markup (%)": (((vals.revenue - vals.cost) / vals.cost) * 100).toFixed(2) };',
    formula: '\\text{Markup} = \\left( \\frac{\\text{Revenue} - \\text{Cost}}{\\text{Cost}} \\right) \\times 100',
    example: 'Cost $80, Revenue $100:\nMarkup = ((100-80)/80)*100 = 25%'
  },
  {
    id: 'roi', name: 'ROI Calculator', category: 'Finance',
    inputs: [{ id: 'investment', label: 'Total Investment' }, { id: 'return', label: 'Total Return' }],
    logic: 'return { "ROI (%)": (((vals.return - vals.investment) / vals.investment) * 100).toFixed(2) };',
    formula: '\\text{ROI} = \\left( \\frac{\\text{Return} - \\text{Investment}}{\\text{Investment}} \\right) \\times 100',
    example: 'Invested $1000, Returned $1200:\nROI = ((1200-1000)/1000)*100 = 20%'
  },
  {
    id: 'rule_of_72', name: 'Rule of 72', category: 'Finance',
    inputs: [{ id: 'rate', label: 'Interest Rate (%)' }],
    logic: 'return { "Years to Double": (72 / vals.rate).toFixed(2) };',
    formula: 't \\approx \\frac{72}{r}',
    example: 'At an 8% interest rate:\nYears to double = 72 / 8 = 9 years'
  },
  {
    id: 'debt_to_income', name: 'Debt to Income Ratio', category: 'Finance',
    inputs: [{ id: 'debt', label: 'Monthly Debt' }, { id: 'income', label: 'Monthly Income' }],
    logic: 'return { "DTI Ratio (%)": ((vals.debt / vals.income) * 100).toFixed(2) };',
    formula: '\\text{DTI} = \\left( \\frac{\\text{Debt}}{\\text{Income}} \\right) \\times 100',
    example: 'Debt $1500, Income $5000:\nDTI = (1500 / 5000) * 100 = 30%'
  },
  {
    id: 'loan_emi', name: 'Loan EMI Calculator', category: 'Finance',
    inputs: [{ id: 'p', label: 'Principal' }, { id: 'r', label: 'Annual Rate (%)' }, { id: 'm', label: 'Months' }],
    logic: 'const r = vals.r/12/100; const emi = (vals.p * r * Math.pow(1+r, vals.m)) / (Math.pow(1+r, vals.m) - 1); return { "Monthly EMI": emi.toFixed(2) };',
    formula: 'E = P \\times r \\times \\frac{(1 + r)^n}{(1 + r)^n - 1}',
    example: 'Principal $10000, 5% annual rate (0.416% monthly), 12 months:\nEMI = $856.07'
  },
  {
    id: 'salary_hourly', name: 'Salary to Hourly', category: 'Finance',
    inputs: [{ id: 'salary', label: 'Annual Salary' }, { id: 'hours', label: 'Hours/Week' }],
    logic: 'return { "Hourly Rate": (vals.salary / (52 * vals.hours)).toFixed(2) };',
    formula: '\\text{Hourly} = \\frac{\\text{Salary}}{52 \\times \\text{Hours/Week}}',
    example: 'Salary $52,000, 40 hours/week:\nHourly = 52000 / (52 * 40) = $25/hr'
  },
  {
    id: 'hourly_salary', name: 'Hourly to Salary', category: 'Finance',
    inputs: [{ id: 'hourly', label: 'Hourly Rate' }, { id: 'hours', label: 'Hours/Week' }],
    logic: 'return { "Annual Salary": (vals.hourly * 52 * vals.hours).toFixed(2) };',
    formula: '\\text{Salary} = \\text{Hourly} \\times 52 \\times \\text{Hours/Week}',
    example: 'Hourly $25, 40 hours/week:\nSalary = 25 * 52 * 40 = $52,000'
  },
  {
    id: 'fuel_cost', name: 'Fuel Cost Calculator', category: 'Finance',
    inputs: [{ id: 'distance', label: 'Distance' }, { id: 'efficiency', label: 'Efficiency (per unit)' }, { id: 'price', label: 'Price per unit' }],
    logic: 'return { "Total Cost": ((vals.distance / vals.efficiency) * vals.price).toFixed(2) };',
    formula: '\\text{Cost} = \\left( \\frac{\\text{Distance}}{\\text{Efficiency}} \\right) \\times \\text{Price}',
    example: 'Distance 300mi, 30mpg, $3.50/gal:\nCost = (300 / 30) * 3.50 = $35.00'
  },

  // Geometry (Area)
  {
    id: 'area_circle', name: 'Area of Circle', category: 'Geometry',
    inputs: [{ id: 'r', label: 'Radius' }],
    logic: 'return { "Area": (Math.PI * vals.r * vals.r).toFixed(2) };',
    formula: 'A = \\pi r^2',
    example: 'For a radius of 5:\nArea = 3.14159 * 5² = 78.54'
  },
  {
    id: 'area_rectangle', name: 'Area of Rectangle', category: 'Geometry',
    inputs: [{ id: 'l', label: 'Length' }, { id: 'w', label: 'Width' }],
    logic: 'return { "Area": (vals.l * vals.w).toFixed(2) };',
    formula: 'A = l \\times w',
    example: 'For length 10 and width 4:\nArea = 10 * 4 = 40'
  },
  {
    id: 'area_triangle', name: 'Area of Triangle', category: 'Geometry',
    inputs: [{ id: 'b', label: 'Base' }, { id: 'h', label: 'Height' }],
    logic: 'return { "Area": (0.5 * vals.b * vals.h).toFixed(2) };',
    formula: 'A = \\frac{1}{2} b h',
    example: 'Base 10, Height 5:\nArea = 0.5 * 10 * 5 = 25'
  },
  {
    id: 'area_square', name: 'Area of Square', category: 'Geometry',
    inputs: [{ id: 's', label: 'Side' }],
    logic: 'return { "Area": (vals.s * vals.s).toFixed(2) };',
    formula: 'A = s^2',
    example: 'Side 6:\nArea = 6² = 36'
  },
  {
    id: 'area_trapezoid', name: 'Area of Trapezoid', category: 'Geometry',
    inputs: [{ id: 'a', label: 'Base A' }, { id: 'b', label: 'Base B' }, { id: 'h', label: 'Height' }],
    logic: 'return { "Area": (((vals.a + vals.b) / 2) * vals.h).toFixed(2) };',
    formula: 'A = \\frac{a + b}{2} h',
    example: 'Base A 4, Base B 6, Height 5:\nArea = ((4+6)/2) * 5 = 25'
  },
  {
    id: 'area_ellipse', name: 'Area of Ellipse', category: 'Geometry',
    inputs: [{ id: 'a', label: 'Semi-major Axis A' }, { id: 'b', label: 'Semi-minor Axis B' }],
    logic: 'return { "Area": (Math.PI * vals.a * vals.b).toFixed(2) };',
    formula: 'A = \\pi a b',
    example: 'Axis A 5, Axis B 3:\nArea = 3.14159 * 5 * 3 = 47.12'
  },

  // Geometry (Volume)
  {
    id: 'vol_cube', name: 'Volume of Cube', category: 'Geometry',
    inputs: [{ id: 's', label: 'Side' }],
    logic: 'return { "Volume": (vals.s * vals.s * vals.s).toFixed(2) };',
    formula: 'V = s^3',
    example: 'Side 3:\nVolume = 3³ = 27'
  },
  {
    id: 'vol_sphere', name: 'Volume of Sphere', category: 'Geometry',
    inputs: [{ id: 'r', label: 'Radius' }],
    logic: 'return { "Volume": ((4/3) * Math.PI * Math.pow(vals.r, 3)).toFixed(2) };',
    formula: 'V = \\frac{4}{3} \\pi r^3',
    example: 'Radius 3:\nVolume = (4/3) * 3.14159 * 27 = 113.10'
  },
  {
    id: 'vol_cylinder', name: 'Volume of Cylinder', category: 'Geometry',
    inputs: [{ id: 'r', label: 'Radius' }, { id: 'h', label: 'Height' }],
    logic: 'return { "Volume": (Math.PI * vals.r * vals.r * vals.h).toFixed(2) };',
    formula: 'V = \\pi r^2 h',
    example: 'Radius 2, Height 5:\nVolume = 3.14159 * 4 * 5 = 62.83'
  },
  {
    id: 'vol_cone', name: 'Volume of Cone', category: 'Geometry',
    inputs: [{ id: 'r', label: 'Radius' }, { id: 'h', label: 'Height' }],
    logic: 'return { "Volume": ((1/3) * Math.PI * vals.r * vals.r * vals.h).toFixed(2) };',
    formula: 'V = \\frac{1}{3} \\pi r^2 h',
    example: 'Radius 2, Height 6:\nVolume = (1/3) * 3.14159 * 4 * 6 = 25.13'
  },

  // Physics
  {
    id: 'speed', name: 'Speed Calculator', category: 'Physics',
    inputs: [{ id: 'd', label: 'Distance' }, { id: 't', label: 'Time' }],
    logic: 'return { "Speed": (vals.d / vals.t).toFixed(2) };',
    formula: 'v = \\frac{d}{t}',
    example: 'Distance 100, Time 2:\nSpeed = 100 / 2 = 50'
  },
  {
    id: 'acceleration', name: 'Acceleration', category: 'Physics',
    inputs: [{ id: 'v1', label: 'Initial Velocity' }, { id: 'v2', label: 'Final Velocity' }, { id: 't', label: 'Time' }],
    logic: 'return { "Acceleration": ((vals.v2 - vals.v1) / vals.t).toFixed(2) };',
    formula: 'a = \\frac{v_f - v_i}{t}',
    example: 'V1 = 0, V2 = 20, Time = 5:\nAcceleration = (20 - 0) / 5 = 4'
  },
  {
    id: 'force', name: 'Force (Newton\'s Second Law)', category: 'Physics',
    inputs: [{ id: 'm', label: 'Mass (kg)' }, { id: 'a', label: 'Acceleration (m/s²)' }],
    logic: 'return { "Force (N)": (vals.m * vals.a).toFixed(2) };',
    formula: 'F = m \\times a',
    example: 'Mass 10kg, Acceleration 9.8m/s²:\nForce = 10 * 9.8 = 98 N'
  },
  {
    id: 'work', name: 'Work', category: 'Physics',
    inputs: [{ id: 'f', label: 'Force (N)' }, { id: 'd', label: 'Distance (m)' }],
    logic: 'return { "Work (J)": (vals.f * vals.d).toFixed(2) };',
    formula: 'W = F \\times d',
    example: 'Force 50N, Distance 10m:\nWork = 50 * 10 = 500 Joules'
  },
  {
    id: 'power', name: 'Power', category: 'Physics',
    inputs: [{ id: 'w', label: 'Work (J)' }, { id: 't', label: 'Time (s)' }],
    logic: 'return { "Power (W)": (vals.w / vals.t).toFixed(2) };',
    formula: 'P = \\frac{W}{t}',
    example: 'Work 500J, Time 5s:\nPower = 500 / 5 = 100 Watts'
  },
  {
    id: 'kinetic_energy', name: 'Kinetic Energy', category: 'Physics',
    inputs: [{ id: 'm', label: 'Mass (kg)' }, { id: 'v', label: 'Velocity (m/s)' }],
    logic: 'return { "KE (J)": (0.5 * vals.m * vals.v * vals.v).toFixed(2) };',
    formula: 'KE = \\frac{1}{2} m v^2',
    example: 'Mass 2kg, Velocity 3m/s:\nKE = 0.5 * 2 * 9 = 9 Joules'
  },
  {
    id: 'potential_energy', name: 'Potential Energy', category: 'Physics',
    inputs: [{ id: 'm', label: 'Mass (kg)' }, { id: 'h', label: 'Height (m)' }],
    logic: 'return { "PE (J)": (vals.m * 9.81 * vals.h).toFixed(2) };',
    formula: 'PE = m \\times g \\times h',
    example: 'Mass 10kg, Height 5m, g = 9.81:\nPE = 10 * 9.81 * 5 = 490.5 Joules'
  },

  // Math
  {
    id: 'average', name: 'Average Calculator', category: 'Math',
    inputs: [{ id: 'a', label: 'Number 1' }, { id: 'b', label: 'Number 2' }, { id: 'c', label: 'Number 3' }],
    logic: 'return { "Average": ((vals.a + vals.b + vals.c) / 3).toFixed(2) };',
    formula: '\\text{Avg} = \\frac{a + b + c}{3}',
    example: 'For 10, 20, 30:\nAverage = (10+20+30) / 3 = 20'
  },
  {
    id: 'pythagorean', name: 'Pythagorean Theorem', category: 'Math',
    inputs: [{ id: 'a', label: 'Side A' }, { id: 'b', label: 'Side B' }],
    logic: 'return { "Hypotenuse": Math.sqrt(vals.a*vals.a + vals.b*vals.b).toFixed(2) };',
    formula: 'c = \\sqrt{a^2 + b^2}',
    example: 'Side A 3, Side B 4:\nHypotenuse = √(9 + 16) = √25 = 5'
  },
  {
    id: 'factorial', name: 'Factorial Calculator', category: 'Math',
    inputs: [{ id: 'n', label: 'Number' }],
    logic: 'let f = 1; for(let i=1; i<=Math.floor(vals.n); i++) f*=i; return { "Factorial": f };',
    formula: 'n! = n \\times (n-1) \\times \\dots \\times 1',
    example: '5! = 5 * 4 * 3 * 2 * 1 = 120'
  }
];

const convertersDef = [
  ['m_ft', 'Meters to Feet', 'Length', 'm', 'Meters', 'ft', 'Feet', 3.28084],
  ['ft_m', 'Feet to Meters', 'Length', 'ft', 'Feet', 'm', 'Meters', 1 / 3.28084],
  ['mi_km', 'Miles to Kilometers', 'Length', 'mi', 'Miles', 'km', 'Kilometers', 1.60934],
  ['km_mi', 'Kilometers to Miles', 'Length', 'km', 'Kilometers', 'mi', 'Miles', 1 / 1.60934],
  ['in_cm', 'Inches to Centimeters', 'Length', 'in', 'Inches', 'cm', 'Centimeters', 2.54],
  ['cm_in', 'Centimeters to Inches', 'Length', 'cm', 'Centimeters', 'in', 'Inches', 1 / 2.54],
  
  ['kg_lb', 'Kg to Lbs', 'Weight', 'kg', 'Kilograms', 'lb', 'Pounds', 2.20462],
  ['lb_kg', 'Lbs to Kg', 'Weight', 'lb', 'Pounds', 'kg', 'Kilograms', 1 / 2.20462],
  ['g_oz', 'Grams to Ounces', 'Weight', 'g', 'Grams', 'oz', 'Ounces', 0.035274],
  ['oz_g', 'Ounces to Grams', 'Weight', 'oz', 'Ounces', 'g', 'Grams', 1 / 0.035274],
  
  ['l_gal', 'Liters to Gallons', 'Volume', 'l', 'Liters', 'gal', 'Gallons', 0.264172],
  ['gal_l', 'Gallons to Liters', 'Volume', 'gal', 'Gallons', 'l', 'Liters', 1 / 0.264172],
  ['ml_floz', 'ML to Fl Ounces', 'Volume', 'ml', 'Milliliters', 'oz', 'Fl Ounces', 0.033814],
  ['floz_ml', 'Fl Ounces to ML', 'Volume', 'oz', 'Fl Ounces', 'ml', 'Milliliters', 1 / 0.033814],
  
  ['mps_kmph', 'm/s to km/h', 'Speed', 'mps', 'm/s', 'kmph', 'km/h', 3.6],
  ['kmph_mps', 'km/h to m/s', 'Speed', 'kmph', 'km/h', 'mps', 'm/s', 1 / 3.6],
  ['mph_kmph', 'mph to km/h', 'Speed', 'mph', 'mph', 'kmph', 'km/h', 1.60934],
  ['kmph_mph', 'km/h to mph', 'Speed', 'kmph', 'km/h', 'mph', 'mph', 1 / 1.60934]
];

for (const c of convertersDef) {
  manualCalcs.push({
    id: c[0],
    name: c[1],
    category: c[2],
    inputs: [{ id: c[3], label: c[4] }],
    logic: `return { Result: (vals.${c[3]} * ${c[7]}).toFixed(4) };`,
    formula: `\\text{${c[6]}} = \\text{${c[4]}} \\times ${c[7].toFixed(4)}`,
    example: `For 10 ${c[4]}:\n10 * ${c[7].toFixed(4)} = ${(10 * c[7]).toFixed(4)} ${c[6]}`
  });
}

// Temperature converters need special offset formulas
manualCalcs.push({
  id: 'c_f', name: 'Celsius to Fahrenheit', category: 'Temperature',
  inputs: [{ id: 'c', label: 'Celsius' }],
  logic: 'return { "Fahrenheit": ((vals.c * 9/5) + 32).toFixed(2) };',
  formula: 'F = (C \\times \\frac{9}{5}) + 32',
  example: 'For 20°C:\nF = (20 * 1.8) + 32 = 68°F'
});
manualCalcs.push({
  id: 'f_c', name: 'Fahrenheit to Celsius', category: 'Temperature',
  inputs: [{ id: 'f', label: 'Fahrenheit' }],
  logic: 'return { "Celsius": ((vals.f - 32) * 5/9).toFixed(2) };',
  formula: 'C = (F - 32) \\times \\frac{5}{9}',
  example: 'For 68°F:\nC = (68 - 32) * 5/9 = 20°C'
});

const finalFileContent = `
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
${manualCalcs.map(c => `  {
    id: '${c.id}',
    name: '${c.name.replace(/'/g, "\\'")}',
    category: '${c.category}',
    inputs: ${JSON.stringify(c.inputs)},
    formula: '${c.formula.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}',
    example: ${JSON.stringify(c.example)},
    logic: (vals) => { ${c.logic} }
  }`).join(',\n')}
];
`;

fs.mkdirSync('./src/data', { recursive: true });
fs.writeFileSync('./src/data/calculators.ts', finalFileContent);
console.log('Created ' + manualCalcs.length + ' calculators with accurate formulas and examples!');
