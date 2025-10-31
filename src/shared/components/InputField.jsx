
// ============================================
// 📁 shared/components/InputField.jsx
// ============================================
import React from 'react';

export function InputField({
  label,
  value,
  onChange,
  type = 'number',
  placeholder = '0',
  suffix,
  error,
  disabled = false,
  fullWidth = false,
  min,
  max,
  step = 'any',
  required = false,
  helpText,
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label className="block mb-1 font-semibold text-orange-400 text-sm">
        {label} {required && <span className="text-red-400">*</span>}
        {suffix && <span className="text-gray-400 text-xs ml-1">({suffix})</span>}
      </label>
      
      <input
        type={type}
        min={type === 'number' ? (min ?? '0') : undefined}
        max={type === 'number' ? max : undefined}
        step={type === 'number' ? step : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full rounded-md px-3 py-2 border focus:ring-2 focus:ring-orange-400 transition-all ${
          error
            ? 'border-red-500 bg-red-900/20'
            : value && parseFloat(value) <= 0 && type === 'number'
            ? 'border-yellow-500 bg-yellow-900/20'
            : 'border-gray-700 bg-gray-800'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      
      {helpText && !error && (
        <p className="text-gray-400 text-xs mt-1">{helpText}</p>
      )}
      
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}