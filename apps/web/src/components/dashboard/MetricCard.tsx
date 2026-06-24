import React from "react";
import { useLocale } from "next-intl";
import { StatCard, type StatTone, type StatDeltaTone } from "@/components/dashboard/StatCard";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
  isLoading?: boolean;
  className?: string;
}

/**
 * MetricCard — adaptador sobre el StatCard canónico (Claude Design). Conserva su API
 * pública (`color`/`trend`/`subtitle`) pero renderiza con la estética homologada:
 * tile de ícono neutro + valor 28px/800 Figtree con color por tono.
 * Paleta "azul de marca": blue/green/purple → azul (primary), orange → ámbar, red → rojo.
 */
const COLOR_TONE: Record<NonNullable<MetricCardProps["color"]>, StatTone> = {
  blue: "primary",
  green: "primary",
  purple: "primary",
  orange: "warning",
  red: "danger",
  gray: "default",
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
  isLoading = false,
  className = "",
}) => {
  const locale = useLocale();
  const formattedValue =
    typeof value === "number" ? (value >= 1000 ? value.toLocaleString(locale) : value.toString()) : value;

  let delta: string | undefined;
  let deltaTone: StatDeltaTone = "neutral";
  if (trend) {
    delta = `${trend.value > 0 ? "+" : ""}${trend.value}%`;
    if (trend.isPositive !== undefined) deltaTone = trend.isPositive ? "success" : "danger";
    else deltaTone = trend.value > 0 ? "success" : trend.value < 0 ? "danger" : "neutral";
  }

  return (
    <StatCard
      label={title}
      value={formattedValue}
      tone={COLOR_TONE[color]}
      icon={icon}
      delta={delta}
      deltaTone={deltaTone}
      deltaLabel={trend?.label}
      sub={subtitle}
      loading={isLoading}
      className={className}
    />
  );
};

export default MetricCard;
