type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function BrandMark({ className = "brand-seal", label = "" }: BrandMarkProps) {
  return <img className={className} src="/brand/hoa-seal.png" alt={label} />;
}
