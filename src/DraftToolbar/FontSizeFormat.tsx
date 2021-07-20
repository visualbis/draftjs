import React from 'react';
import { Select } from '@visualbi/bifrost-ui/dist/react/forms/Select';
import { TB } from '../Service/UIconstants';
import { IDraftToolbarProps } from './DraftToolbar';

interface IDraftFontSizeFormatProps {
    formatProps: IDraftToolbarProps;
}
const sizeOptions = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px'];

const sizeDropdown = sizeOptions.map((size) => ({
    displayName: size,
    label: size,
    value: size,
}));

const DraftFontSizeFormat = (props: IDraftFontSizeFormatProps) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onSelect = (value:string) => {
        setFormat('fontsize',value);
    };

    return (
        <div style={{ width: 70, marginRight: 5 }}>
            <Select
                // className={`toolbar-select `}
                value={currentFormat?.size ?? sizeDropdown[4].value}
                options={sizeDropdown}
                title="Choose a font"
                onChange={onSelect}
            />
        </div>
    );
};

export default DraftFontSizeFormat;
