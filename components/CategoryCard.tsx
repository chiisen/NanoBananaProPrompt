import React from 'react';
import { CategoryDetails } from '../types';

interface Props {
  category: CategoryDetails;
  isSelected: boolean;
  onClick: () => void;
  theme: 'dark' | 'light';
}

export const CategoryCard: React.FC<Props> = ({ category, isSelected, onClick, theme }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl border text-left transition-all duration-300 w-full h-full flex flex-col gap-3 group
        ${isSelected 
          ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.02]' 
          : 'hover:border-indigo-300 hover:shadow-md'}
        ${isSelected
            ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50')
            : (isDark 
                ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800' 
                : 'border-gray-200 bg-white hover:bg-gray-50')
        }
      `}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{category.icon}</span>
        {isSelected && (
          <div className="bg-indigo-500 rounded-full p-1 shadow-lg animate-in zoom-in duration-200">
             <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
          </div>
        )}
      </div>
      <div>
        <h3 className={`font-bold text-lg transition-colors ${
            isSelected 
                ? (isDark ? 'text-white' : 'text-indigo-900') 
                : (isDark ? 'text-slate-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black')
        }`}>
          {category.label}
        </h3>
        <p className={`text-xs mt-1 leading-relaxed transition-colors ${
            isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-gray-500 group-hover:text-gray-700'
        }`}>
          {category.description}
        </p>
      </div>
    </button>
  );
};