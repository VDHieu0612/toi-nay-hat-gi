import React from 'react';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface DebugBarProps {
  onSimulateAll3: () => void;
  onSimulateWith4: () => void;
  onSimulateWith5: () => void;
  onReplay?: () => void;
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
  isInResult: boolean;
}

export const DebugBar: React.FC<DebugBarProps> = ({
  onSimulateAll3,
  onSimulateWith4,
  onSimulateWith5,
  onReplay,
  speedMultiplier,
  onSpeedChange,
  isInResult,
}) => {
  return (
    <aside className="genshin-debug-bar" aria-label="Bảng điều khiển gỡ lỗi Gacha (Debug mode)">
      <div className="debug-bar-header">
        <span className="debug-bar-tag">DEBUG MODE (?debug=1)</span>
      </div>

      <div className="debug-bar-actions">
        <Button
          variant="ghost"
          size="sm"
          className="debug-btn debug-btn-3star"
          onClick={onSimulateAll3}
          title="Giả lập rút 10 toàn thẻ 3★ (không ảnh hưởng pity thật)"
        >
          Toàn 3★
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="debug-btn debug-btn-4star"
          onClick={onSimulateWith4}
          title="Giả lập rút 10 có ít nhất một thẻ 4★ (không ảnh hưởng pity thật)"
        >
          Có 4★
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="debug-btn debug-btn-5star"
          onClick={onSimulateWith5}
          title="Giả lập rút 10 có thẻ 5★ hoàng kim (không ảnh hưởng pity thật)"
        >
          Có 5★
        </Button>

        {isInResult && onReplay && (
          <Button
            variant="ghost"
            size="sm"
            className="debug-btn debug-btn-replay"
            onClick={onReplay}
            title="Chạy lại chuỗi 5 nhịp hiệu ứng với kết quả hiện tại"
          >
            <Icon name="reset" size={12} />
            <span>Replay</span>
          </Button>
        )}
      </div>

      <div className="debug-speed-control">
        <label htmlFor="speed-slider" className="debug-speed-label">
          Tốc độ: <strong>{speedMultiplier.toFixed(2)}x</strong>
        </label>
        <input
          id="speed-slider"
          type="range"
          min="0.25"
          max="2"
          step="0.05"
          value={speedMultiplier}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="debug-speed-slider"
        />
      </div>
    </aside>
  );
};
