import ReactSelect, { SingleValue, ActionMeta } from 'react-select';

interface ReactSelectProps {
  options: { value: string; label: string }[];
  onChange: (selectedOption: SingleValue<{ value: string; label: string }>, actionMeta: ActionMeta<{ value: string; label: string }>) => void;
  value: { value: string; label: string } | null;
  disabled?: boolean;
}

export default function ReactSelectComponent({ options, onChange, value , disabled}: ReactSelectProps) {
  return (
    <ReactSelect
      options={options}
      onChange={onChange}
      value={value}
      isDisabled={disabled}
      classNames={{
        control: () => "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        option: () => "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground", 
        menu: () => "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        menuList: () => "p-1",
        placeholder: () => "text-muted-foreground",
        singleValue: () => "text-foreground",
      }}
      unstyled
    />
  );
}
