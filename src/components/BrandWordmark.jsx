export default function BrandWordmark({ variant = 'default', compact = false, className = '' }) {
  const classes = [
    'brand-wordmark',
    `brand-wordmark-${variant}`,
    compact ? 'brand-wordmark-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      <span className="brand-wordmark-dillo">DILLO</span>
      <span className="brand-wordmark-qui">QUI</span>
    </span>
  );
}
