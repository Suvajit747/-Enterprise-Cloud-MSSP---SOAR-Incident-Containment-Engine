import { riskLevelStyle, riskScoreColor } from "@/utils/domain";
import type { RiskLevel } from "@/types";
import { cn } from "@/utils/cn";

interface RiskScoreProps {
  score: number;
  level: RiskLevel;
}

export function RiskScore({ score, level }: RiskScoreProps) {
  const style = riskLevelStyle(level);
  const color = riskScoreColor(score);
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-semibold tabular text-[var(--color-text)]">
            {clamped}
            <span className="text-base font-normal text-[var(--color-text-faint)]"> / 100</span>
          </p>
        </div>
        <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", style.bg, style.text, style.border)}>
          {level.toUpperCase()}
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-text-faint)]">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
