const GRADIENTS = [
  'linear-gradient(135deg,#FF8A5B,#FF5B8A)',
  'linear-gradient(135deg,#4ECDC4,#2E9E96)',
  'linear-gradient(135deg,#FFC46B,#F2994A)',
  'linear-gradient(135deg,#6C5CE7,#5B7CFA)',
  'linear-gradient(135deg,#A29BFE,#6C5CE7)',
];

/** Один и тот же чат всегда получает один и тот же цвет. */
function pickGradient(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length] ?? GRADIENTS[0]!;
}

function initial(label: string): string {
  const first = label.trim().charAt(0);
  return first === '' ? '#' : first.toUpperCase();
}

type Props = {
  label: string;
  seed: string;
  size?: number;
};

export function Avatar({ label, seed, size = 40 }: Props) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-none select-none items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundImage: pickGradient(seed),
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initial(label)}
    </div>
  );
}
