import React from 'react';
import { Button } from './Button';

export interface ChipProps {
  label?: string;
  children?: React.ReactNode;
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  children,
  selected = false,
  active = false,
  disabled = false,
  count,
  onClick,
  className = '',
  title,
}) => {
  const isSelected = selected || active;
  const classes = [
    'ui-chip',
    isSelected ? 'ui-chip-selected' : '',
    disabled ? 'ui-chip-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Button
      variant="ghost"
      size="sm"
      className={classes}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-pressed={isSelected}
    >
      <span className="ui-chip-label">{children || label}</span>
      {typeof count === 'number' && (
        <span className="ui-chip-count">{count}</span>
      )}
    </Button>
  );
};
