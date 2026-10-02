/* Starter templates for the Creator Studio (single-file React components). */

export const STATISTICS_CALCULATOR_TEMPLATE = `import React, { useState } from 'react';
import { Calculator, BarChart2, Plus, Trash2, RefreshCw, Zap } from 'lucide-react';

export default function StatisticsCalculator({ onScoreSubmit }) {
  const [inputVal, setInputVal] = useState("");
  const [numbers, setNumbers] = useState([12, 45, 23, 67, 89, 34, 56, 78, 90, 11]);

  const addNumber = () => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      setNumbers(prev => [...prev, parsed]);
      setInputVal("");
    }
  };

  const parseBulk = () => {
    const items = inputVal
      .split(/[\\s,]+/)
      .map(n => parseFloat(n.trim()))
      .filter(n => !isNaN(n));
    if (items.length > 0) {
      setNumbers(prev => [...prev, ...items]);
      setInputVal("");
    }
  };

  const removeNumber = (index) => {
    setNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setNumbers([]);

  const count = numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const mean = count > 0 ? sum / count : 0;
  
  const median = count === 0 ? 0 : (
    count % 2 !== 0
      ? sorted[Math.floor(count / 2)]
      : (sorted[count / 2 - 1] + sorted[count / 2]) / 2
  );

  const min = count > 0 ? Math.min(...numbers) : 0;
  const max = count > 0 ? Math.max(...numbers) : 0;
  const range = max - min;

  const variance = count > 0 
    ? numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / count
    : 0;
  const stdDev = Math.sqrt(variance);

  const handleExportResult = () => {
    if (onScoreSubmit && count > 0) {
      onScoreSubmit(Math.round(mean));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 font-sans">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Statistics Calculator</h2>
            <p className="text-xs text-slate-400 font-mono">Real-time Data Stream & Metrics Simulator</p>
          </div>
        </div>
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear Data
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Enter numbers (e.g. 42 or 10, 20, 30)..."
          onKeyDown={(e) => { if (e.key === 'Enter') parseBulk(); }}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
        <button
          onClick={addNumber}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Single
        </button>
        <button
          onClick={parseBulk}
          className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Zap className="w-4 h-4" /> Add Bulk
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Sample Dataset ({count} items)</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          {numbers.map((num, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-mono group hover:border-red-500/50 transition"
            >
              {num}
              <button
                onClick={() => removeNumber(idx)}
                className="text-slate-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          {numbers.length === 0 && (
            <span className="text-xs text-slate-500 font-mono p-2">No numbers entered. Type above to add dataset.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Mean (Average)</p>
          <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">{mean.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Median</p>
          <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{median.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Std Deviation</p>
          <p className="text-xl font-bold text-pink-400 mt-1 font-mono">{stdDev.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Sum Total</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{sum.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Min Value</p>
          <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">{min}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Max Value</p>
          <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{max}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Range</p>
          <p className="text-xl font-bold text-blue-400 mt-1 font-mono">{range}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Variance</p>
          <p className="text-xl font-bold text-violet-400 mt-1 font-mono">{variance.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          onClick={handleExportResult}
          disabled={count === 0}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg disabled:opacity-50 transition flex items-center gap-2"
        >
          <BarChart2 className="w-4 h-4" /> Save Score Metric ({Math.round(mean)})
        </button>
      </div>
    </div>
  );
}`;

export const GAME_TEMPLATE = `import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, RefreshCw } from 'lucide-react';

export default function CustomGame({ onScoreSubmit }) {
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(true);

  return (
    <div className="p-8 bg-slate-900 text-white rounded-3xl text-center max-w-md mx-auto border border-slate-800 shadow-2xl">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Gamepad2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black mb-2">Custom Arcade Game</h2>
      <p className="text-xs text-slate-400 mb-6 font-mono">Score: <span className="text-blue-400 font-bold">{score}</span></p>
      
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={() => setScore(prev => prev + 10)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
        >
          Tap to Score (+10)
        </button>
        <button
          onClick={() => setScore(0)}
          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
        >
          Reset
        </button>
      </div>

      <button
        onClick={() => onScoreSubmit && onScoreSubmit(score)}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
      >
        Submit Final Score ({score})
      </button>
    </div>
  );
}`;
