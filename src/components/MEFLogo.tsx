interface MEFLogoProps {
  className?: string;
}

export function MEFLogo({ className = "h-12" }: MEFLogoProps) {
  return (
    <img 
      src="https://i.imgur.com/eSowMKt.png" 
      alt="MEF Logo" 
      className={className}
    />
  );
}
