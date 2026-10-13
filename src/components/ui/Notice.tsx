import React from 'react';
import { Icon, IconName } from './Icon';

export type NoticeLevel = 'info' | 'warning' | 'danger';

export interface NoticeProps {
  level?: NoticeLevel;
  children: React.ReactNode;
  icon?: IconName;
  className?: string;
  title?: string;
}

export const Notice: React.FC<NoticeProps> = ({
  level = 'info',
  children,
  icon,
  className = '',
  title,
}) => {
  const defaultIcon: IconName =
    level === 'danger' ? 'danger' : level === 'warning' ? 'warning' : 'info';

  const iconName = icon || defaultIcon;

  return (
    <div
      className={`ui-notice ui-notice-${level} ${className}`}
      role="alert"
      title={title}
    >
      <span className="ui-notice-icon-wrap" aria-hidden="true">
        <Icon name={iconName} size={16} />
      </span>
      <div className="ui-notice-content">{children}</div>
    </div>
  );
};
