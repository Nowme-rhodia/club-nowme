import React from 'react';
import { Delete } from 'lucide-react';

interface NumericalKeypadProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    onClear: () => void;
    onConfirm: () => void;
    confirmDisabled?: boolean;
}

export default function NumericalKeypad({
    onKeyPress,
    onDelete,
    onClear,
    onConfirm,
    confirmDisabled
}: NumericalKeypadProps) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="grid grid-cols-3 gap-3">
                {keys.map((key) => (
                    <button
                        key={key}
                        onClick={() => onKeyPress(key)}
                        className="h-16 text-2xl font-semibold bg-white rounded-lg shadow-sm border border-gray-200 active:bg-gray-50 active:scale-95 transition-all text-gray-900"
                    >
                        {key}
                    </button>
                ))}

                <button
                    onClick={onDelete}
                    className="h-16 flex items-center justify-center bg-gray-100 rounded-lg shadow-sm border border-gray-200 active:bg-gray-200 active:scale-95 transition-all text-gray-700"
                >
                    <Delete className="w-6 h-6" />
                </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    onClick={onClear}
                    className="h-14 font-medium text-red-600 bg-red-50 rounded-lg border border-red-100 active:bg-red-100 active:scale-95 transition-all"
                >
                    Effacer
                </button>
                <button
                    onClick={onConfirm}
                    disabled={confirmDisabled}
                    className={`h-14 font-medium rounded-lg text-white shadow transition-all active:scale-95
            ${confirmDisabled
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    Valider
                </button>
            </div>
        </div>
    );
}
