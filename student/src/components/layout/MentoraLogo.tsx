import Image from "next/image";

export type MentoraLogoProps = {
  variant?: "horizontal" | "stacked" | "icon";
  theme?: "dark" | "light"; // "dark" for dark backgrounds (white text), "light" for light backgrounds (teal text)
  className?: string;
  alt?: string;
  priority?: boolean;
};

export default function MentoraLogo({
  variant = "horizontal",
  theme = "dark",
  className,
  alt = "Mentora — Learn • Grow • Go Further",
  priority = false,
}: MentoraLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src="/logos-svg/mentora-logo-icon.svg"
        alt={alt}
        width={40}
        height={40}
        className={className ?? "h-8 w-8 object-contain"}
        priority={priority}
        unoptimized
      />
    );
  }

  if (variant === "stacked") {
    const src =
      theme === "light"
        ? "/logos-svg/mentora-logo-stacked-light-bg.svg"
        : "/logos-svg/mentora-logo-stacked-dark-bg.svg";

    return (
      <Image
        src={src}
        alt={alt}
        width={800}
        height={620}
        className={className ?? "h-24 w-auto object-contain"}
        priority={priority}
        unoptimized
      />
    );
  }

  // Horizontal logo (default)
  const src =
    theme === "light"
      ? "/logos-svg/mentora-logo-horizontal-light-bg.svg"
      : "/logos-svg/mentora-logo-horizontal-dark-bg.svg";

  return (
    <Image
      src={src}
      alt={alt}
      width={1240}
      height={400}
      className={className ?? "h-8 w-auto object-contain"}
      priority={priority}
      unoptimized
    />
  );
}
