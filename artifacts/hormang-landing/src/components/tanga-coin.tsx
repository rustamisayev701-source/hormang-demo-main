const SIZE_MAP = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-9 h-9",
  xl: "w-14 h-14",
  xxl: "w-25 h-25",
} as const;

type TangaCoinSize = keyof typeof SIZE_MAP;

export function TangaCoin({ size = "md" }: { size?: TangaCoinSize }) {
  return (
    <img
      src="/tanga-coin.jpg"
      alt="Tanga"
      className={`${SIZE_MAP[size]} rounded-full object-cover inline-block align-middle flex-shrink-0`}
      draggable={false}
    />
  );
}
