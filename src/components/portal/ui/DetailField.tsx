interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  mono?: boolean;
}

export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  valueClassName = 'text-foreground',
  mono = false,
}) => (
  <div className="min-w-0">
    <span className="text-[10px] text-muted-foreground block">{label}</span>
    <span className={`text-xs font-semibold truncate block ${mono ? 'font-mono' : ''} ${valueClassName}`}>
      {value}
    </span>
  </div>
);