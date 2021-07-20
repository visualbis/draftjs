import React from 'react';
import { ToolbarIconButton } from '../Buttons/ToolbarIconButton';
import { IDraftToolbarProps } from './DraftToolbar';

interface IUnderLineFormatProps {
    formatProps: IDraftToolbarProps;
}

const DraftUnderLineFormat = (props: IUnderLineFormatProps) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onClick = () => {
        setFormat('underline', currentFormat?.underline ? 'active' : '');
    };

    return (
        <div>
            <ToolbarIconButton
                // title="Apply bold formatting"
                // id={TB.FONT_BOLD}
                active={currentFormat?.underline}
                disabled={false}
                icon={'ms-Icon ms-Icon--Underline'}
                onClick={onClick}
            />
        </div>
    );
};

export default DraftUnderLineFormat;
