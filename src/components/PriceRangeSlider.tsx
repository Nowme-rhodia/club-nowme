import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
}

export function PriceRangeSlider({ min, max, value, onChange }: PriceRangeSliderProps) {
    return (
        <div className="w-full px-2">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">Budget</span>
                <span className="text-sm font-bold text-primary">
                    {value[0]}€ - {value[1]}€
                </span>
            </div>

            <Slider
                range
                min={min}
                max={max}
                value={value}
                onChange={(val) => {
                    if (Array.isArray(val)) {
                        onChange(val as [number, number]);
                    }
                }}
                trackStyle={[{ backgroundColor: '#E91E63' }]}
                handleStyle={[
                    { borderColor: '#E91E63', backgroundColor: '#fff', opacity: 1 },
                    { borderColor: '#E91E63', backgroundColor: '#fff', opacity: 1 },
                ]}
                railStyle={{ backgroundColor: '#e5e7eb' }}
            />

            <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <span>{min}€</span>
                <span>{max}€</span>
            </div>
        </div>
    );
}
