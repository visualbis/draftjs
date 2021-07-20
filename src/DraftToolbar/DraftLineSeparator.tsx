import * as React from 'react';

interface IDraftLineSeparator {
    className?: string;
}
export const DraftLineSeparator = (props: IDraftLineSeparator) => {
    const { className } = props;

    return <div className={`line-separator ${className || ''}`} />;
};
