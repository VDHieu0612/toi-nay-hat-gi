import React, { useState, useEffect } from 'react';

interface GroupModeProps {
  isOpen: boolean;
  onClose: () => void;
  players: string[];
  onSavePlayers: (players: string[]) => void;
  distributionMethod: 'round-robin' | 'random';
  onChangeMethod: (method: 'round-robin' | 'random') => void;
}

const LOCAL_STORAGE_PLAYERS_KEY = 'karaoke_group_players';

export function loadSavedPlayers(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PLAYERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return ['Người 1', 'Người 2', 'Người 3'];
}

export function savePlayersToStorage(players: string[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PLAYERS_KEY, JSON.stringify(players));
  } catch {
    // ignore
  }
}

export const GroupMode: React.FC<GroupModeProps> = ({
  isOpen,
  onClose,
  players,
  onSavePlayers,
  distributionMethod,
  onChangeMethod,
}) => {
  const [localPlayers, setLocalPlayers] = useState<string[]>(players);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  if (!isOpen) return null;

  const handleAddPlayer = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (localPlayers.length >= 8) {
      alert('Tối đa 8 người chơi');
      return;
    }
    if (localPlayers.includes(trimmed)) {
      alert('Tên người chơi đã tồn tại');
      return;
    }
    const updated = [...localPlayers, trimmed];
    setLocalPlayers(updated);
    setNewName('');
  };

  const handleRemovePlayer = (index: number) => {
    if (localPlayers.length <= 2) {
      alert('Cần tối thiểu 2 người chơi');
      return;
    }
    const updated = localPlayers.filter((_, idx) => idx !== index);
    setLocalPlayers(updated);
  };

  const handleUpdateName = (index: number, val: string) => {
    const updated = [...localPlayers];
    updated[index] = val;
    setLocalPlayers(updated);
  };

  const handleSaveAndApply = () => {
    const cleaned = localPlayers.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      alert('Vui lòng nhập ít nhất 2 người chơi');
      return;
    }
    onSavePlayers(cleaned);
    savePlayersToStorage(cleaned);
    onClose();
  };

  return (
    <div className="filter-modal-overlay" onClick={onClose}>
      <div
        className="filter-modal-content group-mode-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-mode-title"
      >
        <div className="filter-modal-header">
          <div className="filter-modal-title-wrap">
            <h3 id="group-mode-title">👥 Cài Đặt Chế Độ Nhóm</h3>
            <span className="filter-active-count-badge">
              {localPlayers.length} / 8 người
            </span>
          </div>
          <button
            type="button"
            className="filter-close-btn"
            onClick={onClose}
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        <div className="filter-modal-body">
          {/* Hướng dẫn */}
          <p className="group-mode-desc">
            Nhập tên từ <strong>2 đến 8 thành viên</strong> trong phòng hát. Setlist 10 bài vừa rút sẽ tự động được chia đều cho từng người!
          </p>

          {/* Cách thức chia bài */}
          <section className="filter-group">
            <h4 className="filter-group-title">
              <span>🎲</span> Cách thức chia bài
            </h4>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${distributionMethod === 'round-robin' ? 'is-active' : ''}`}
                onClick={() => onChangeMethod('round-robin')}
              >
                🔄 Xoay vòng lần lượt
              </button>
              <button
                type="button"
                className={`filter-pill ${distributionMethod === 'random' ? 'is-active' : ''}`}
                onClick={() => onChangeMethod('random')}
              >
                🔀 Ngẫu nhiên bốc thăm
              </button>
            </div>
          </section>

          {/* Danh sách thành viên */}
          <section className="filter-group">
            <h4 className="filter-group-title">
              <span>🎤</span> Danh sách người chơi ({localPlayers.length})
            </h4>

            <div className="group-players-list">
              {localPlayers.map((player, idx) => (
                <div key={idx} className="group-player-row">
                  <span className="player-index-badge">#{idx + 1}</span>
                  <input
                    type="text"
                    className="player-name-input"
                    value={player}
                    maxLength={20}
                    onChange={(e) => handleUpdateName(idx, e.target.value)}
                    placeholder={`Tên người chơi ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="player-delete-btn"
                    onClick={() => handleRemovePlayer(idx)}
                    title="Xóa người chơi"
                    disabled={localPlayers.length <= 2}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Thêm thành viên */}
            {localPlayers.length < 8 && (
              <div className="group-add-player-form">
                <input
                  type="text"
                  className="player-name-input add-input"
                  value={newName}
                  maxLength={20}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  placeholder="Nhập tên người chơi mới..."
                />
                <button
                  type="button"
                  className="genshin-sub-btn add-player-btn"
                  onClick={handleAddPlayer}
                >
                  + Thêm người
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="filter-modal-footer">
          <button
            type="button"
            className="genshin-sub-btn"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="genshin-wish-btn wish-btn-ten"
            onClick={handleSaveAndApply}
          >
            <div className="wish-btn-content">
              <span className="wish-btn-main">Xác nhận chia bài</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
