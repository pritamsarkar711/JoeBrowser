import { Activity, Flame, Droplet, User, Dumbbell, Utensils, Moon, Percent, Tag, Banknote, Coins, TrendingUp, Clock, Car, Square, Circle, Triangle, Box, Database, Zap, Gauge, Weight, Thermometer, Ruler, Calculator, HeartPulse, Scale, Heart, Briefcase, FileText, Camera, Calendar, Laptop, Hash, ArrowRightLeft } from 'lucide-react';
import React from 'react';

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Health': return <HeartPulse size={28} />;
    case 'Finance': return <Banknote size={28} />;
    case 'Geometry': return <Square size={28} />;
    case 'Physics': return <Zap size={28} />;
    case 'Math': return <Calculator size={28} />;
    case 'Cooking': return <Utensils size={28} />;
    case 'Photography': return <Camera size={28} />;
    case 'Sports': return <Dumbbell size={28} />;
    case 'Everyday': return <Calendar size={28} />;
    case 'Length': return <Ruler size={28} />;
    case 'Weight': return <Scale size={28} />;
    case 'Temperature': return <Thermometer size={28} />;
    case 'Volume': return <Database size={28} />;
    case 'Speed': return <Gauge size={28} />;
    default: return <Calculator size={28} />;
  }
};

export const getCalculatorIcon = (id: string) => {
  if (id.includes('bmi')) return <Scale size={24} />;
  if (id.includes('bmr') || id.includes('calorie')) return <Flame size={24} />;
  if (id.includes('water')) return <Droplet size={24} />;
  if (id.includes('fat') || id.includes('weight')) return <User size={24} />;
  if (id.includes('heart')) return <Heart size={24} />;
  if (id.includes('blood')) return <Droplet size={24} />;
  if (id.includes('sleep')) return <Moon size={24} />;
  if (id.includes('discount') || id.includes('margin') || id.includes('markup')) return <Tag size={24} />;
  if (id.includes('tip') || id.includes('interest') || id.includes('roi') || id.includes('loan') || id.includes('debt')) return <Coins size={24} />;
  if (id.includes('salary') || id.includes('hourly')) return <Briefcase size={24} />;
  if (id.includes('fuel')) return <Car size={24} />;
  if (id.includes('area')) {
    if (id.includes('circle') || id.includes('ellipse')) return <Circle size={24} />;
    if (id.includes('triangle')) return <Triangle size={24} />;
    return <Square size={24} />;
  }
  if (id.includes('vol')) {
    if (id.includes('sphere') || id.includes('cylinder') || id.includes('cone')) return <Database size={24} />;
    return <Box size={24} />;
  }
  if (id.includes('speed') || id.includes('acceleration') || id.includes('pace')) return <Gauge size={24} />;
  if (id.includes('force') || id.includes('work') || id.includes('power') || id.includes('energy')) return <Zap size={24} />;
  if (id.includes('temp') || id.includes('c_f') || id.includes('f_c') || id.includes('oven')) return <Thermometer size={24} />;
  if (id.includes('words') || id.includes('reading')) return <FileText size={24} />;
  if (id.includes('tv') || id.includes('aspect') || id.includes('focal')) return <Laptop size={24} />;
  if (id.includes('percentage') || id.includes('rule')) return <Percent size={24} />;
  if (id.includes('average') || id.includes('gcd') || id.includes('lcm')) return <Hash size={24} />;
  return <Calculator size={24} />;
}
