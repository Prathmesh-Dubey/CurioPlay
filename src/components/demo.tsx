import React, { useState, useEffect, useRef } from 'react';

const CorrelationCalculator = () => {
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [xData, setXData] = useState([]);
  const [yData, setYData] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const parseInput = (text) => {
    const tokens = text.split(/[\s,]+/).filter(token => token.trim() !== '');
    const numbers = [];
    const invalid = [];

    tokens.forEach(token => {
      const num = parseFloat(token.trim());
      if (!isNaN(num) && isFinite(num)) {
        numbers.push(num);
      } else {
        invalid.push(token.trim());
      }
    });

    return { numbers, invalid };
  };

  const calculateMean = (data) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  };

  const calculatePearson = (x, y) => {
    const n = x.length;
    const meanX = calculateMean(x);
    const meanY = calculateMean(y);

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
  };

  const getRanks = (data) => {
    const n = data.length;
    const sorted = data.map((val, idx) => ({ val, idx }));
    sorted.sort((a, b) => a.val - b.val);

    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && sorted[j].val === sorted[i].val) j++;
      const rank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) {
        ranks[sorted[k].idx] = rank;
      }
      i = j;
    }
    return ranks;
  };

  const calculateSpearman = (x, y) => {
    const rankX = getRanks(x);
    const rankY = getRanks(y);
    return calculatePearson(rankX, rankY);
  };

  const getCorrelationInterpretation = (r) => {
    const absR = Math.abs(r);
    if (absR === 1) return { strength: 'Perfect', direction: r > 0 ? 'Positive' : 'Negative' };
    if (absR >= 0.7) return { strength: 'Strong', direction: r > 0 ? 'Positive' : 'Negative' };
    if (absR >= 0.3) return { strength: 'Moderate', direction: r > 0 ? 'Positive' : 'Negative' };
    if (absR > 0.01) return { strength: 'Weak', direction: r > 0 ? 'Positive' : 'Negative' };
    return { strength: 'No', direction: 'Linear Relationship' };
  };

  const getStrengthColor = (r) => {
    const absR = Math.abs(r);
    if (absR === 1) return '#059669';
    if (absR >= 0.7) return '#2563eb';
    if (absR >= 0.3) return '#d97706';
    if (absR > 0.01) return '#ea580c';
    return '#64748b';
  };

  const getStrengthLabel = (r) => {
    const absR = Math.abs(r);
    if (absR === 1) return 'Perfect';
    if (absR >= 0.7) return 'Strong';
    if (absR >= 0.3) return 'Moderate';
    if (absR > 0.01) return 'Weak';
    return 'None';
  };

  const handleCalculate = () => {
    if (!xInput.trim() || !yInput.trim()) {
      setError('Please enter values for both variables.');
      setResults(null);
      setShowSuccess(false);
      return;
    }

    const xParsed = parseInput(xInput);
    const yParsed = parseInput(yInput);

    let errorMsg = '';
    if (xParsed.invalid.length > 0) {
      errorMsg += `Invalid X values: ${xParsed.invalid.join(', ')}. `;
    }
    if (yParsed.invalid.length > 0) {
      errorMsg += `Invalid Y values: ${yParsed.invalid.join(', ')}. `;
    }
    if (xParsed.numbers.length < 2) {
      errorMsg += 'X must contain at least 2 valid numbers. ';
    }
    if (yParsed.numbers.length < 2) {
      errorMsg += 'Y must contain at least 2 valid numbers. ';
    }
    if (xParsed.numbers.length !== yParsed.numbers.length && xParsed.numbers.length >= 2 && yParsed.numbers.length >= 2) {
      errorMsg += 'X and Y must have the same number of values. ';
    }

    if (errorMsg) {
      setError(errorMsg);
      setResults(null);
      setShowSuccess(false);
      return;
    }

    const x = xParsed.numbers;
    const y = yParsed.numbers;

    setXData(x);
    setYData(y);

    const meanX = calculateMean(x);
    const meanY = calculateMean(y);
    const pearson = calculatePearson(x, y);
    const spearman = calculateSpearman(x, y);
    const interpretation = getCorrelationInterpretation(pearson);

    setResults({
      n: x.length,
      meanX,
      meanY,
      pearson,
      spearman,
      interpretation,
    });

    setError('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleClear = () => {
    setXInput('');
    setYInput('');
    setXData([]);
    setYData([]);
    setResults(null);
    setError('');
    setShowSuccess(false);
  };

  const handleLoadExample = () => {
    setXInput('5, 10, 15, 20, 25, 30');
    setYInput('8, 12, 18, 22, 27, 35');
  };

  const handleEnd = () => {
    window.location.reload();
  };

  useEffect(() => {
    if (xData.length === 0 || yData.length === 0 || !results) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const padding = 50;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    const minX = Math.min(...xData) - 0.5;
    const maxX = Math.max(...xData) + 0.5;
    const minY = Math.min(...yData) - 0.5;
    const maxY = Math.max(...yData) + 0.5;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const scaleX = (val) => padding + ((val - minX) / rangeX) * plotWidth;
    const scaleY = (val) => padding + ((maxY - val) / rangeY) * plotHeight;

    // Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const xPos = padding + (i / 5) * plotWidth;
      const yPos = padding + (i / 5) * plotHeight;
      
      ctx.beginPath();
      ctx.moveTo(xPos, padding);
      ctx.lineTo(xPos, height - padding);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding, yPos);
      ctx.lineTo(width - padding, yPos);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Data points
    ctx.fillStyle = '#2563eb';
    for (let i = 0; i < xData.length; i++) {
      const xPos = scaleX(xData[i]);
      const yPos = scaleY(yData[i]);
      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Trend line
    if (xData.length > 1 && results) {
      const n = xData.length;
      const meanX = results.meanX;
      const meanY = results.meanY;
      
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        const dx = xData[i] - meanX;
        numerator += dx * (yData[i] - meanY);
        denominator += dx * dx;
      }
      
      if (denominator !== 0) {
        const slope = numerator / denominator;
        const intercept = meanY - slope * meanX;
        
        const x1 = minX;
        const y1 = slope * x1 + intercept;
        const x2 = maxX;
        const y2 = slope * x2 + intercept;
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(scaleX(x1), scaleY(y1));
        ctx.lineTo(scaleX(x2), scaleY(y2));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Variable X', width - padding, height - padding + 32);
    ctx.textAlign = 'left';
    ctx.fillText('Variable Y', padding - 35, padding - 15);
  }, [xData, yData, results]);

  const formatNumber = (num) => num.toFixed(4);

  return (
    <div className="yep_appShell">
      <header className="yep_topHeader">
        <div className="yep_titleGroup">
          <span className="yep_headerIcon">📈</span>
          <h1 className="yep_headerTitle">Correlation Analysis Suite</h1>
        </div>
        <div className="yep_headerRight">
          <span className="yep_badge">Statistical Engine v1.0</span>
          <button className="yep_endButton" onClick={handleEnd}>
            ⏹ End
          </button>
        </div>
      </header>

      <div className="yep_workspace">
        <section className="yep_sidebarPanel">
          <div className="yep_panelHeader">
            <h2 className="yep_panelTitle">Input Datasets</h2>
            <p className="yep_panelSub">Enter continuous variables separated by spaces or commas.</p>
          </div>

          <div className="yep_inputContainer">
            <div className="yep_inputGroup">
              <label className="yep_label">Variable X</label>
              <textarea
                className="yep_textarea"
                value={xInput}
                onChange={(e) => setXInput(e.target.value)}
                placeholder="e.g., 5, 10, 15, 20, 25, 30"
              />
            </div>

            <div className="yep_inputGroup">
              <label className="yep_label">Variable Y</label>
              <textarea
                className="yep_textarea"
                value={yInput}
                onChange={(e) => setYInput(e.target.value)}
                placeholder="e.g., 8, 12, 18, 22, 27, 35"
              />
            </div>
          </div>

          <div className="yep_actionToolbar">
            <button className="yep_btn yep_btnPrimary" onClick={handleCalculate}>
              Calculate Metrics
            </button>
            <button className="yep_btn yep_btnSecondary" onClick={handleLoadExample}>
              Load Sample
            </button>
            <button className="yep_btn yep_btnGhost" onClick={handleClear}>
              Clear
            </button>
          </div>

          {error && <div className="yep_errorBanner">⚠️ {error}</div>}
          {showSuccess && <div className="yep_successBanner">✅ Computation updated successfully</div>}

          <footer className="yep_sidebarFooter">
            <strong>Pearson (r):</strong> Measures linear correlation.<br />
            <strong>Spearman (ρ):</strong> Measures monotonic rank correlation.
          </footer>
        </section>

        <section className="yep_mainContentPanel">
          {results && xData.length > 0 && yData.length > 0 ? (
            <div className="yep_analyticsLayout">
              <div className="yep_statsRow">
                <div className="yep_metricCard">
                  <span className="yep_metricLabel">Sample Size (n)</span>
                  <span className="yep_metricValue">{results.n}</span>
                </div>
                <div className="yep_metricCard">
                  <span className="yep_metricLabel">Mean X</span>
                  <span className="yep_metricValue">{formatNumber(results.meanX)}</span>
                </div>
                <div className="yep_metricCard">
                  <span className="yep_metricLabel">Mean Y</span>
                  <span className="yep_metricValue">{formatNumber(results.meanY)}</span>
                </div>
                <div className="yep_metricCard">
                  <span className="yep_metricLabel">Pearson (r)</span>
                  <span className="yep_metricValue" style={{ color: getStrengthColor(results.pearson) }}>
                    {formatNumber(results.pearson)}
                  </span>
                </div>
                <div className="yep_metricCard">
                  <span className="yep_metricLabel">Spearman (ρ)</span>
                  <span className="yep_metricValue">{formatNumber(results.spearman)}</span>
                </div>
              </div>

              <div
                className="yep_statusBanner"
                style={{
                  borderColor: getStrengthColor(results.pearson),
                  backgroundColor: `${getStrengthColor(results.pearson)}10`,
                }}
              >
                <div className="yep_statusHeader">
                  <span className="yep_statusTitle">Analytical Summary</span>
                </div>
                <div className="yep_statusBody">
                  <span className="yep_statusHighlight" style={{ color: getStrengthColor(results.pearson) }}>
                    {results.interpretation.strength} {results.interpretation.direction}
                  </span>
                  <span className="yep_statusMeta">
                    ({getStrengthLabel(results.pearson)} Linear Association)
                  </span>
                </div>
              </div>

              <div className="yep_chartWrapper">
                <h3 className="yep_chartTitle">Bivariate Scatter Plot & OLS Trendline</h3>
                <div className="yep_canvasFrame" ref={containerRef}>
                  <canvas ref={canvasRef} className="yep_canvasElement" />
                </div>
              </div>
            </div>
          ) : (
            <div className="yep_emptyState">
              <div className="yep_emptyStateContent">
                <span className="yep_emptyIcon">📊</span>
                <h3 className="yep_emptyTitle">Ready for Data</h3>
                <p className="yep_emptyText">
                  Enter paired observations on the left or load a sample dataset to render metrics and visualization.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .yep_appShell {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .yep_topHeader {
          background-color: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 12px;
        }

        .yep_titleGroup {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .yep_headerIcon {
          font-size: 24px;
        }

        .yep_headerTitle {
          font-size: 20px;
          font-weight: 600;
          color: #f8fafc;
          margin: 0;
        }

        .yep_headerRight {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .yep_badge {
          font-size: 12px;
          color: #94a3b8;
          background-color: #0f172a;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid #334155;
        }

        .yep_endButton {
          background-color: #dc2626;
          color: #ffffff;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .yep_endButton:hover {
          background-color: #b91c1c;
        }

        .yep_workspace {
          flex: 1;
          display: flex;
          flex-direction: row;
          background-color: #f8fafc;
          width: 100%;
        }

        .yep_sidebarPanel {
          background-color: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          padding: 24px;
          width: 420px;
          min-height: calc(100vh - 64px);
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .yep_panelHeader {
          margin-bottom: 16px;
        }

        .yep_panelTitle {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .yep_panelSub {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .yep_inputContainer {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .yep_inputGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .yep_label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yep_textarea {
          width: 100%;
          height: 100px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background-color: #f8fafc;
          color: #0f172a;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .yep_textarea:focus {
          border-color: #0f172a;
        }

        .yep_actionToolbar {
          display: flex;
          flex-direction: row;
          gap: 10px;
          margin-top: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .yep_btn {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
          flex: 1;
          min-width: 100px;
        }

        .yep_btnPrimary {
          background-color: #0f172a;
          color: #ffffff;
        }

        .yep_btnPrimary:hover {
          background-color: #1e293b;
        }

        .yep_btnSecondary {
          background-color: #e2e8f0;
          color: #334155;
        }

        .yep_btnSecondary:hover {
          background-color: #cbd5e1;
        }

        .yep_btnGhost {
          background-color: transparent;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }

        .yep_btnGhost:hover {
          background-color: #f1f5f9;
        }

        .yep_errorBanner {
          padding: 10px 14px;
          background-color: #fef2f2;
          color: #991b1b;
          border-radius: 6px;
          font-size: 13px;
          border: 1px solid #fecaca;
          margin-bottom: 10px;
        }

        .yep_successBanner {
          padding: 10px 14px;
          background-color: #f0fdf4;
          color: #166534;
          border-radius: 6px;
          font-size: 13px;
          border: 1px solid #bbf7d0;
          margin-bottom: 10px;
        }

        .yep_sidebarFooter {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .yep_mainContentPanel {
          background-color: #f8fafc;
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          flex: 1;
          min-width: 0;
        }

        .yep_analyticsLayout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .yep_statsRow {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .yep_metricCard {
          background-color: #ffffff;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .yep_metricLabel {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yep_metricValue {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .yep_statusBanner {
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid;
          border-top: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .yep_statusHeader {
          display: flex;
          align-items: center;
        }

        .yep_statusTitle {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yep_statusBody {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
        }

        .yep_statusHighlight {
          font-size: 16px;
          font-weight: 700;
        }

        .yep_statusMeta {
          font-size: 13px;
          color: #64748b;
        }

        .yep_chartWrapper {
          flex: 1;
          background-color: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          min-height: 300px;
        }

        .yep_chartTitle {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 12px 0;
        }

        .yep_canvasFrame {
          flex: 1;
          position: relative;
          width: 100%;
          min-height: 300px;
        }

        .yep_canvasElement {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .yep_emptyState {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          background-color: #ffffff;
          min-height: 400px;
          padding: 24px;
        }

        .yep_emptyStateContent {
          text-align: center;
          max-width: 400px;
        }

        .yep_emptyIcon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .yep_emptyTitle {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .yep_emptyText {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .yep_sidebarPanel {
            width: 360px;
          }
        }

        @media (max-width: 768px) {
          .yep_workspace {
            flex-direction: column;
          }

          .yep_sidebarPanel {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            min-height: auto;
            padding: 16px;
          }

          .yep_mainContentPanel {
            padding: 16px;
          }

          .yep_statsRow {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          }

          .yep_topHeader {
            padding: 10px 16px;
          }

          .yep_headerTitle {
            font-size: 16px;
          }

          .yep_badge {
            display: none;
          }

          .yep_textarea {
            height: 70px;
          }

          .yep_chartWrapper {
            min-height: 200px;
          }

          .yep_canvasFrame {
            min-height: 200px;
          }

          .yep_emptyState {
            min-height: 300px;
          }
        }

        @media (max-width: 480px) {
          .yep_topHeader {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .yep_titleGroup {
            justify-content: center;
          }

          .yep_headerRight {
            justify-content: center;
          }

          .yep_actionToolbar {
            flex-direction: column;
          }

          .yep_btn {
            width: 100%;
          }

          .yep_statusBanner {
            flex-direction: column;
            align-items: flex-start;
          }

          .yep_sidebarPanel {
            padding: 12px;
          }

          .yep_mainContentPanel {
            padding: 12px;
          }

          .yep_statsRow {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .yep_metricCard {
            padding: 8px 12px;
          }

          .yep_metricValue {
            font-size: 16px;
          }

          .yep_chartWrapper {
            min-height: 150px;
            padding: 12px;
          }

          .yep_canvasFrame {
            min-height: 150px;
          }

          .yep_emptyState {
            min-height: 200px;
          }

          .yep_emptyIcon {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
};

export default CorrelationCalculator;
