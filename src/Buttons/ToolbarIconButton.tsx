import React from 'react';
import classNames from 'classnames';

export interface IToolbarIconButtonProps {
    id?: string;
    title?: string;
    active?: boolean;
    icon?: string;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
}

export const ToolbarIconButton: React.FC<IToolbarIconButtonProps> = ({
    id,
    title,
    active,
    icon,
    onClick,
    disabled,
    label,
    className,
}: IToolbarIconButtonProps) => (
    <div title={title} className='draft-editor-format-font-format'>
        <span
            id={id}
            aria-label={icon}
            role="button"
            className={classNames('icon-container', className || '', { disabled, active })}
            onClick={onClick}
        >
            <span className={classNames(icon, 'toolbar-icon-button')} />
            <span className="toolbar-icon-title">{label}</span>
        </span>
    </div>
);
